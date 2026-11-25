<#
  DocSecure Scan — scans one page from the scanner (e.g. HP DeskJet) into the
  DocSecure scanner folder. DocSecure (open on the Scan page) then reads it and
  files it into the right person's folder automatically.

  Usage: double-click DocSecure-Scan.cmd, or
    powershell -ExecutionPolicy Bypass -File DocSecure-Scan.ps1 [-Person "Shanthi Mallika"] [-Type "NIC"] [-Dpi 300] [-Gray] [-NoPrompt]
#>
param(
  [string]$OutDir = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "DocSecure Scans"),
  [string]$Person = "",
  [string]$Type = "",
  [int]$Dpi = 300,
  [switch]$Gray,
  [switch]$NoPrompt
)
$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "DocSecure Scan"

function Say($text, $color = "Gray") { Write-Host $text -ForegroundColor $color }

Say ""
Say "  DocSecure Scan" "Cyan"
Say "  Put the page face down on the scanner glass." "Gray"
Say ""

if (-not $NoPrompt) {
  if (-not $Person) { $Person = Read-Host "  Whose document? (e.g. P R Perera - press Enter to skip)" }
  if (-not $Type)   { $Type   = Read-Host "  What document? (e.g. passport, NIC, medical report - Enter to skip)" }
}

function Set-WiaProperty($wiaItem, [int]$id, $value) {
  foreach ($p in $wiaItem.Properties) {
    if ($p.PropertyID -eq $id) { try { $p.Value = $value } catch { } }
  }
}

# Try every scanner Windows knows: USB connection first (most reliable), then network.
$JPEG = "{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}"
$dm = New-Object -ComObject WIA.DeviceManager
$candidates = @($dm.DeviceInfos) | Where-Object { $_.Type -ne 2 -and $_.Type -ne 3 } |  # skip cameras / video
  Sort-Object { if ($_.DeviceID -match "Usb") { 0 } else { 1 } }
if (-not $candidates) {
  Say "  No scanner found. Check the printer is on and connected, then try again." "Red"
  if (-not $NoPrompt) { Read-Host "  Press Enter to close" | Out-Null }
  exit 1
}

$image = $null
foreach ($info in $candidates) {
  $scannerName = ($info.Properties | Where-Object { $_.Name -eq "Name" }).Value
  $via = if ($info.DeviceID -match "Usb") { "USB" } else { "network" }
  try {
    Say "  Scanning with $scannerName ($via) ..." "Yellow"
    $item = $info.Connect().Items.Item(1)
    Set-WiaProperty $item 6147 $Dpi                                  # horizontal resolution
    Set-WiaProperty $item 6148 $Dpi                                  # vertical resolution
    Set-WiaProperty $item 6146 ($(if ($Gray) { 2 } else { 1 }))      # 1 = colour, 2 = grayscale
    $image = $item.Transfer()   # scanner's own format (HP DeskJet gives BMP)
    break
  } catch {
    Say "    not available ($($_.Exception.Message.Trim()))" "DarkGray"
  }
}
if (-not $image) {
  Say "  The scanner did not respond. Close other scan programs (HP Smart), check the cable, and try again." "Red"
  if (-not $NoPrompt) { Read-Host "  Press Enter to close" | Out-Null }
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
# The file name tells DocSecure whose document it is and what type: "Shanthi Mallika NIC.jpg".
$label = (($Person, $Type) | Where-Object { $_ -and $_.Trim() }) -join " "
$label = ($label -replace '[<>:"/\\|?*]', " ").Trim()
if (-not $label) { $label = "Scan" }
$stamp = Get-Date -Format "yyyy-MM-dd HH.mm.ss"
$path = Join-Path $OutDir "$label ($stamp).jpg"
if (Test-Path $path) { Remove-Item $path }

# Save the scan, converting to a good-quality JPEG (smaller than BMP, same sharpness).
$tmp = Join-Path $env:TEMP ("docsecure-scan-" + [guid]::NewGuid().ToString("N") + "." + $image.FileExtension)
$image.SaveFile($tmp)
if ($image.FormatID -eq $JPEG) {
  Move-Item $tmp $path
} else {
  Add-Type -AssemblyName System.Drawing
  $bitmap = [System.Drawing.Image]::FromFile($tmp)
  try {
    $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $params = New-Object System.Drawing.Imaging.EncoderParameters 1
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality, [long]92)
    $bitmap.Save($path, $encoder, $params)
  } finally {
    $bitmap.Dispose()
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

Say ""
Say "  Saved: $path" "Green"
Say "  DocSecure will file it automatically (keep DocSecure open on the Scan page)." "Green"
if (-not $NoPrompt) {
  Say ""
  $again = Read-Host "  Scan another page? (y/N)"
  if ($again -match '^(y|yes)$') {
    & $PSCommandPath -OutDir $OutDir -Dpi $Dpi -Gray:$Gray
  }
}
