# Сборка подписанного APK: проверки -> prebuild -> gradle -> release\ShoppingList-<версия>.apk
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Step($name, $block) {
    Write-Host "== $name" -ForegroundColor Cyan
    & $block
    if ($LASTEXITCODE -ne 0) { throw "Остановлено на шаге: $name" }
}

if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$props = Join-Path $env:USERPROFILE '.gradle\gradle.properties'
if (-not (Select-String -Path $props -Pattern '^SHOPPINGLIST_STORE_FILE=' -Quiet -ErrorAction SilentlyContinue)) {
    throw "В $props нет SHOPPINGLIST_STORE_FILE и остальных свойств подписи (см. docs/RELEASE.md)."
}

Step 'tsc'    { npx.cmd tsc --noEmit }
Step 'lint'   { npx.cmd expo lint }
Step 'test'   { npm.cmd test }
if (Test-Path android\gradlew.bat) { & android\gradlew.bat --stop | Out-Null }  # иначе Gradle держит папку android
Step 'prebuild' { npx.cmd expo prebuild --platform android --clean }
git checkout package.json 2>$null   # prebuild может переписать package.json
Step 'gradle' { Push-Location android; try { .\gradlew.bat assembleRelease } finally { Pop-Location } }

$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
$apk = Get-ChildItem android\app\build\outputs\apk\release\*.apk | Select-Object -First 1
if (-not $apk) { throw 'APK не найден после сборки.' }
New-Item -ItemType Directory -Force release | Out-Null
$out = "release\ShoppingList-$version.apk"
Copy-Item $apk.FullName $out -Force
$size = [math]::Round((Get-Item $out).Length / 1MB, 1)
$hash = (Get-FileHash $out -Algorithm SHA256).Hash
Write-Host "Готово: $out ($size МБ)`nSHA-256: $hash" -ForegroundColor Green
