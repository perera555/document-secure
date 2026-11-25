@echo off
rem Double-click to scan a page into DocSecure (uses the Windows scanner driver, e.g. HP DeskJet).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0DocSecure-Scan.ps1" %*
