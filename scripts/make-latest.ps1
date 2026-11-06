# Writes latest.json for the APK repository from the built APK (size is taken from the file itself).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\make-latest.ps1
# Notes come from docs\release-notes\<version>.json. Output: ..\ShoppingList-android-apk\latest.json
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$app = (Get-Content app.json -Raw | ConvertFrom-Json).expo
$version = $app.version
$code = [int]$app.android.versionCode
$apk = "release\ShoppingList-$version.apk"
if (-not (Test-Path $apk)) { throw "APK not found: $apk (run scripts\build-apk.ps1 first)" }
$notesFile = "docs\release-notes\$version.json"
if (-not (Test-Path $notesFile)) { throw "Release notes not found: $notesFile" }

$repo = 'TimurNazmutdinov/ShoppingList-android-apk'
$latest = [ordered]@{
    version     = $version
    versionCode = $code
    url         = "https://github.com/$repo/releases/tag/v$version"
    apkUrl      = "https://github.com/$repo/releases/download/v$version/ShoppingList-$version.apk"
    size        = (Get-Item $apk).Length
    notes       = (Get-Content $notesFile -Raw -Encoding UTF8 | ConvertFrom-Json)
}
$out = Join-Path (Split-Path (Get-Location) -Parent) 'ShoppingList-android-apk\latest.json'
$json = $latest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($out, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))
$hash = (Get-FileHash $apk -Algorithm SHA256).Hash
Write-Host "latest.json written: $out"
Write-Host "version $version (code $code), size $($latest.size) bytes"
Write-Host "SHA-256: $hash"
