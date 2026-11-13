// Магазинная (публичная) сборка для Google Play: `build-apk.ps1 -Store` ставит EXPO_PUBLIC_STORE_BUILD=1.
// В ней нет «Прототипа» и самообновления из GitHub (Play это запрещает).
export const IS_STORE = process.env.EXPO_PUBLIC_STORE_BUILD === '1';
// Пометка «Прототип» (заставка и версия в Настройках).
export const IS_PROTOTYPE = !IS_STORE;
export const UPDATES_ENABLED = !IS_STORE;

// Публичный файл версии; читается только GET-запросом, ничего не отправляется.
export const UPDATE_URL = 'https://raw.githubusercontent.com/TimurNazmutdinov/ShoppingList-android-apk/main/latest.json';
export const UPDATE_TIMEOUT_MS = 8000;

// Разработчик и контакт: показываются в «Настройки» → «О приложении» и в политике конфиденциальности.
export const DEVELOPER_NAME = 'quiteusefulapp';
export const DEVELOPER_EMAIL = 'quiteusefulapp@gmail.com';

export const APP_PACKAGE = 'com.timurnazmutdinov.shoppinglist';
