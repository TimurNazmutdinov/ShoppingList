# Сборка и релиз APK (ShoppingList)

Без EAS и облака: Android SDK и JDK из Android Studio, сборка из командной строки. Gradle в песочнице агента не запускается — APK собирает пользователь, агент проверяет файл и SHA-256.

## Один раз: ключ подписи (команды выполняет пользователь сам)
Ключ только для ShoppingList (не от «Чекпоинта» и не от «Перевала»). Пароли агенту не сообщать.

```powershell
New-Item -ItemType Directory -Force C:\Projects\keys
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -storetype PKCS12 -keystore C:\Projects\keys\shoppinglist-release.jks -alias shoppinglist -keyalg RSA -keysize 2048 -validity 10000
```

В `%USERPROFILE%\.gradle\gradle.properties` добавить четыре строки (значения — свои):

```
SHOPPINGLIST_STORE_FILE=C:/Projects/keys/shoppinglist-release.jks
SHOPPINGLIST_STORE_PASSWORD=<пароль>
SHOPPINGLIST_KEY_ALIAS=shoppinglist
SHOPPINGLIST_KEY_PASSWORD=<пароль>
```

Сделать 2 резервные копии `.jks` и паролей: с другим ключом обновить установленное приложение поверх нельзя.

## Окружение
- Android Studio при сборке закрыть (8 ГБ ОЗУ). `JAVA_HOME` и `ANDROID_HOME` скрипт задаёт сам.
- Нужен CMake 3.31.6 (SDK Manager → SDK Tools) — иначе на Windows ошибка длинных путей.
- Первая сборка скачивает сотни МБ и идёт 10–20 минут.

## Сборка
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1
```
Скрипт: tsc, lint, тесты → `expo prebuild --clean` → `gradlew assembleRelease` → `release\ShoppingList-<версия>.apk`, размер и SHA-256. Если prebuild изменил `package.json` — `git checkout package.json`.

Что включено в release (плагины в `plugins/`): только `arm64-v8a`, R8 + shrinkResources, языки ресурсов ru/kk/en, правила keep для `expo.modules.shoppinglistalarms`.
**После включения R8 проверить на телефоне все функции:** списки, смахивание, даты, календарь, уведомления (через 2–3 минуты при закрытом приложении и после перезагрузки), блок «Состояние напоминаний», проверка обновлений.

## Релиз
Репозиторий релизов: `TimurNazmutdinov/ShoppingList-android-apk` (публичный).
1. `gh release create v<версия> release\ShoppingList-<версия>.apk --repo TimurNazmutdinov/ShoppingList-android-apk --title ... --notes ...`
2. Обновить `latest.json` в `main` репозитория APK: `{ "version", "versionCode", "url", "apkUrl", "size", "notes": { "ru": [], "kk": [], "en": [] } }`. `size` и SHA-256 — только из готового файла.
3. Push репозитория APK, затем тег и push основного репозитория.
Перед публикацией — вопрос пользователю.

## README репозитория релизов
> ShoppingList — приложение «список покупок» для Android (прототип для тестирования).
> Нужен 64-битный Android. Если телефон пишет «приложение несовместимо» — сообщите.
> Установка: скачайте APK из последнего релиза и разрешите установку из неизвестных источников (один раз). Обновления приложение предложит само.

## Обновления в приложении
При запуске и при возврате в приложение читается `latest.json` (только GET, ничего не отправляется). Новее по `versionCode` → экран «Нужно обновить» → скачивание с прогрессом → системный установщик. Нет сети — молча. «Проверить сейчас» — в Настройках. После обновления лаунчер может показывать старую иконку — помогает перезагрузка телефона.
