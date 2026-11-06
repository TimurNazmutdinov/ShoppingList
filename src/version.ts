import Constants from 'expo-constants';

export const appVersion = Constants.expoConfig?.version ?? '';
// Если код версии неизвестен, обновление не навязываем: лучше пропустить проверку, чем заблокировать приложение.
export const appVersionCode = Constants.expoConfig?.android?.versionCode ?? Number.MAX_SAFE_INTEGER;
export const appVersionCodeLabel = Constants.expoConfig?.android?.versionCode ?? '';
