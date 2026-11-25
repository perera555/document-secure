<#
  DocSecure Scanner — a tiny helper that lets the DocSecure web app use this computer's scanner.

  Runs in the background and listens ONLY on this computer (http://localhost:17321).
  Only the DocSecure website may use it (checked with CORS + a required header).

    GET  /status                      -> { ok, version }
    GET  /scanners                    -> [{ id, name, via }]
    POST /scan?device=ID&dpi=300&gray=0 -> the scanned page as a JPEG

  Uses the Windows scanner system (WIA), so it works with HP DeskJet and most scanners.
#>
param([int]$Port = 17321)
$ErrorActionPreference = "Stop"
$Version = "1.0"

$AllowedOrigins = @(
  "https://document-secure.vercel.app"
)
function Test-Origin([string]$origin) {
  if (-not $origin) { return $false }
  if ($AllowedOrigins -contains $origin) { return $true }
  return $origin -match '^http://(localhost|127\.0\.0\.1)(:\d+)?$'   # local development
}

$JPEG = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"
Add-Type -AssemblyName System.Drawing

function Get-Scanners {
  $dm = New-Object -ComObject WIA.DeviceManager
  $list = @()
  foreach ($d in $dm.DeviceInfos) {
    if ($d.Type -eq 2 -or $d.Type -eq 3) { continue }   # cameras / video
    $name = ($d.Properties | Where-Object { $_.Name -eq "Name" }).Value
    $list += [pscustomobject]@{ id = $d.DeviceID; name = $name; via = $(if ($d.DeviceID -match "Usb") { "USB" } else { "Network" }) }
  }
  # USB first: most reliable.
  return @($list | Sort-Object { if ($_.via -eq "USB") { 0 } else { 1 } })
}

function Set-WiaProperty($item, [int]$id, $value) {
  foreach ($p in $item.Properties) { if ($p.PropertyID -eq $id) { try { $p.Value = $value } catch { } } }
}

function Invoke-Scan([string]$deviceId, [int]$dpi, [bool]$gray) {
  $dm = New-Object -ComObject WIA.DeviceManager
  $infos = @($dm.DeviceInfos) | Where-Object { $_.Type -ne 2 -and $_.Type -ne 3 }
  if ($deviceId) { $infos = @($infos | Where-Object { $_.DeviceID -eq $deviceId }) + @($infos | Where-Object { $_.DeviceID -ne $deviceId }) }
  $lastError = "No scanner found"
  foreach ($info in $infos) {
    try {
      $item = $info.Connect().Items.Item(1)
      Set-WiaProperty $item 6147 $dpi
      Set-WiaProperty $item 6148 $dpi
      Set-WiaProperty $item 6146 ($(if ($gray) { 2 } else { 1 }))
      $image = $item.Transfer()
      $tmp = Join-Path $env:TEMP ("docsecure-" + [guid]::NewGuid().ToString("N") + "." + $image.FileExtension)
      $image.SaveFile($tmp)
      try {
        if ($image.FormatID -eq $JPEG) { return [IO.File]::ReadAllBytes($tmp) }
        $bitmap = [System.Drawing.Image]::FromFile($tmp)
        try {
          $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
          $params = New-Object System.Drawing.Imaging.EncoderParameters 1
          $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]92)
          $ms = New-Object IO.MemoryStream
          $bitmap.Save($ms, $encoder, $params)
          return $ms.ToArray()
        } finally { $bitmap.Dispose() }
      } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
    } catch {
      $lastError = $_.Exception.Message.Trim()
    }
  }
  throw $lastError
}

function Send($res, [int]$code, [byte[]]$body, [string]$type) {
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.ContentLength64 = $body.Length
  $res.OutputStream.Write($body, 0, $body.Length)
  $res.OutputStream.Close()
}
function SendJson($res, [int]$code, $obj) {
  Send $res $code ([Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Depth 4 -Compress))) "application/json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
try { $listener.Start() } catch { Write-Host "DocSecure Scanner is already running (or port $Port is busy)."; exit 0 }
Write-Host "DocSecure Scanner $Version listening on http://localhost:$Port"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $origin = $req.Headers["Origin"]
    if (Test-Origin $origin) {
      $res.Headers["Access-Control-Allow-Origin"] = $origin
      $res.Headers["Vary"] = "Origin"
      $res.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
      $res.Headers["Access-Control-Allow-Headers"] = "X-DocSecure"
      $res.Headers["Access-Control-Allow-Private-Network"] = "true"
      $res.Headers["Access-Control-Max-Age"] = "600"
    }
    if ($req.HttpMethod -eq "OPTIONS") { $res.StatusCode = 204; $res.Close(); continue }

    # Only DocSecure: allowed origin AND the custom header (forces a CORS check first).
    if (-not (Test-Origin $origin) -or $req.Headers["X-DocSecure"] -ne "1") {
      SendJson $res 403 @{ error = "Not allowed" }
      continue
    }

    $path = $req.Url.AbsolutePath.TrimEnd("/")
    if ($path -eq "/status") {
      SendJson $res 200 @{ ok = $true; version = $Version }
    } elseif ($path -eq "/scanners") {
      SendJson $res 200 @(Get-Scanners)
    } elseif ($path -eq "/scan" -and $req.HttpMethod -eq "POST") {
      $q = $req.QueryString
      $dpi = 300; if ($q["dpi"] -match '^\d+$') { $dpi = [Math]::Min(600, [Math]::Max(100, [int]$q["dpi"])) }
      $bytes = Invoke-Scan $q["device"] $dpi ($q["gray"] -eq "1")
      Send $res 200 $bytes "image/jpeg"
    } else {
      SendJson $res 404 @{ error = "Not found" }
    }
  } catch {
    try { SendJson $res 500 @{ error = $_.Exception.Message.Trim() } } catch { }
  }
}
