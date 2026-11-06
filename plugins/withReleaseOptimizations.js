const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

// Языки ресурсов библиотек: только ru, kk, en (остальные в APK не попадают).
// Комментарии и тексты в Gradle-коде — только ASCII.
const LOCALES = `
    androidResources {
        localeFilters.addAll(['ru', 'kk', 'en'])
    }`;

// Правила R8: свой нативный модуль подключается по имени класса (через рефлексию), его нельзя вырезать.
const KEEP_RULES = `
# ShoppingList: own native module is loaded by name
-keep class expo.modules.shoppinglistalarms.** { *; }
`;

module.exports = function withReleaseOptimizations(config) {
  config = withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes("localeFilters.addAll(['ru', 'kk', 'en'])")) return cfg;
    const androidAt = src.indexOf('android {');
    if (androidAt < 0) throw new Error('withReleaseOptimizations: нет блока android в build.gradle');
    const at = androidAt + 'android {'.length;
    cfg.modResults.contents = src.slice(0, at) + LOCALES + src.slice(at);
    return cfg;
  });
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes('expo.modules.shoppinglistalarms')) fs.writeFileSync(file, current + KEEP_RULES);
      return cfg;
    },
  ]);
};
