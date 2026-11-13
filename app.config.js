// Магазинная сборка (Google Play): EXPO_PUBLIC_STORE_BUILD=1 (ставит `scripts/build-apk.ps1 -Store`).
// Нейтральный пакет и без разрешения на установку APK (самообновления в ней нет).
module.exports = ({ config }) => {
  if (process.env.EXPO_PUBLIC_STORE_BUILD !== '1') return config;
  return {
    ...config,
    android: {
      ...config.android,
      package: 'com.quiteusefulapp.shoppinglist',
      permissions: (config.android.permissions ?? []).filter((p) => p !== 'android.permission.REQUEST_INSTALL_PACKAGES'),
    },
  };
};
