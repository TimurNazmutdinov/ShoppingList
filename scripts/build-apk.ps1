# Build a signed APK: checks -> prebuild -> gradle -> release\ShoppingList-<version>.apk
# Messages are ASCII on purpose: Windows PowerShell 5.1 reads a UTF-8 file without BOM as ANSI.
param([switch]$Store)  # -Store: Google Play build (AAB, other package and key, no self-update)
$ErrorActionPreference = 'Stop'
if ($Store) { $env:EXPO_PUBLIC_STORE_BUILD = '1' } else { Remove-Item Env:EXPO_PUBLIC_STORE_BUILD -ErrorAction SilentlyContinue }
$prefix = if ($Store) { 'SHOPPINGLIST_PLAY_' } else { 'SHOPPINGLIST_' }
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step($name, $block) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne 0) { throw "Stopped at step: $name" }
}

if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
if (-not (Select-String -Path $props -Pattern "^${prefix}STORE_FILE=" -Quiet -ErrorAction SilentlyContinue)) {
    throw "No ${prefix}STORE_FILE and other signing properties in $props (see docs/RELEASE.md)."
}

Step 'tsc'    { npx.cmd tsc --noEmit }
Step 'lint'   { npx.cmd expo lint }
Step 'test'   { npm.cmd test }
if (Test-Path android\gradlew.bat) { & android\gradlew.bat --stop | Out-Null }  # otherwise Gradle keeps the android folder locked
# prebuild may rewrite package.json: keep a copy and put it back afterwards (a plain "git checkout package.json"
# would also throw away uncommitted changes such as newly added packages).
$pkgBackup = Join-Path $env:TEMP 'shoppinglist-package.json'
Copy-Item package.json $pkgBackup -Force
Step 'prebuild' { npx.cmd expo prebuild --platform android --clean }
Copy-Item $pkgBackup package.json -Force
Step 'gradle' { Push-Location android; try { if ($Store) { .\gradlew.bat bundleRelease } else { .\gradlew.bat assembleRelease } } finally { Pop-Location } }

$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
if ($Store) { $built = Get-ChildItem android\app\build\outputs\bundle\release\*.aab | Select-Object -First 1; $ext = 'aab'; $name = 'SmartShoppingList' }
else { $built = Get-ChildItem android\app\build\outputs\apk\release\*.apk | Select-Object -First 1; $ext = 'apk'; $name = 'ShoppingList' }
if (-not $built) { throw 'Build output not found.' }
New-Item -ItemType Directory -Force release | Out-Null
$out = "release\$name-$version.$ext"
Copy-Item $built.FullName $out -Force
$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
$hash = (Get-FileHash $out -Algorithm SHA256).Hash
Write-Host "Done: $out ($size MB)"
Write-Host "SHA-256: $hash" -ForegroundColor Green
