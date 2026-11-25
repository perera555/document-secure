<#
  Installs "DocSecure Scan" for the current Windows user (no administrator rights needed):
   - copies the scan helper to %LOCALAPPDATA%\DocSecure
   - creates the folder Documents\DocSecure Scans
   - puts a "DocSecure Scan" shortcut on the Desktop
   - registers the docsecure-scan:// link so the "Scan with printer" button in DocSecure can start a scan
#>
$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $env:LOCALAPPDATA "DocSecure"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item (Join-Path $src "DocSecure-Scan.ps1"), (Join-Path $src "DocSecure-Scan.cmd"), (Join-Path $src "DocSecure-Scanner-Bridge.ps1") $dest -Force
Get-ChildItem $dest | Unblock-File -ErrorAction SilentlyContinue

$scans = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "DocSecure Scans"
New-Item -ItemType Directory -Force -Path $scans | Out-Null

# Desktop shortcut
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Desktop")) "DocSecure Scan.lnk"))
$lnk.TargetPath = Join-Path $dest "DocSecure-Scan.cmd"
$lnk.WorkingDirectory = $dest
$lnk.Description = "Scan a page into DocSecure"
$icon = "$env:SystemRoot\System32\WFS.exe"
$lnk.IconLocation = if (Test-Path $icon) { "$icon,0" } else { "$env:SystemRoot\System32\imageres.dll,3" }
$lnk.Save()

# docsecure-scan:// link (current user only)
$key = "HKCU:\Software\Classes\docsecure-scan"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name "(Default)" -Value "URL:DocSecure Scan"
Set-ItemProperty -Path $key -Name "URL Protocol" -Value ""
New-Item -Path "$key\shell\open\command" -Force | Out-Null
$ps1 = Join-Path $dest "DocSecure-Scan.ps1"
Set-ItemProperty -Path "$key\shell\open\command" -Name "(Default)" -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$ps1`" -Url `"%1`""

# Background scanner helper: start with Windows (hidden) and start it now.
$bridge = Join-Path $dest "DocSecure-Scanner-Bridge.ps1"
$startup = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Startup")) "DocSecure Scanner.lnk"))
$startup.TargetPath = "powershell.exe"
$startup.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$bridge`""
$startup.WindowStyle = 7   # minimized
$startup.Description = "Lets DocSecure use this computer's scanner"
$startup.Save()
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$bridge`""

Write-Host ""
Write-Host "  DocSecure Scan is installed." -ForegroundColor Green
Write-Host "  In DocSecure open the Scan page: 'Scan with printer' now finds your scanner." -ForegroundColor Gray
Write-Host "  Scans are saved in: $scans" -ForegroundColor Gray
Write-Host "  In DocSecure (Scan page) choose that folder once as the scanner folder." -ForegroundColor Gray
Write-Host ""
