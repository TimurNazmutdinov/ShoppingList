// Магазинная сборка (Google Play): EXPO_PUBLIC_STORE_BUILD=1 (ставит `scripts/build-apk.ps1 -Store`).
// Нейтральный пакет и без разрешения на установку APK (самообновления в ней нет).
module.exports = ({ config }) => {
  // Веб (PWA на GitHub Pages): приложение лежит не в корне сайта, базовый путь задаёт scripts/build-web.js.
  const web = process.env.EXPO_PUBLIC_WEB_BASE_URL
    ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.EXPO_PUBLIC_WEB_BASE_URL } }
    : config;
  if (process.env.EXPO_PUBLIC_STORE_BUILD !== '1') return web;
  return {
    ...web,
    android: {
      ...config.android,
      package: 'com.quiteusefulapp.shoppinglist',
      permissions: (config.android.permissions ?? []).filter((p) => p !== 'android.permission.REQUEST_INSTALL_PACKAGES'),
    },
  };
};
