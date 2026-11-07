const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const themes = require('../src/theme/themes.json');

// Иконки рабочего стола по цветовым профилям: по одному activity-alias на профиль (кроме «Янтаря» = vanilla)
// плюс основной «Default» с фирменной иконкой. Включает нужный alias нативный модуль
// (modules/shoppinglist-alarms → setLauncherIcon). Всё генерируется при prebuild.
const SRC = path.join(__dirname, '..', 'assets', 'icons', 'schemes');
const keys = Object.keys(themes.schemes).filter((k) => k !== 'vanilla');
const cap = (k) => k[0].toUpperCase() + k.slice(1);

function withIconResources(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      const xxx = path.join(res, 'mipmap-xxxhdpi');
      const v26 = path.join(res, 'mipmap-anydpi-v26');
      fs.mkdirSync(xxx, { recursive: true });
      fs.mkdirSync(v26, { recursive: true });
      const colors = [];
      for (const k of keys) {
        fs.copyFileSync(path.join(SRC, `ic_scheme_${k}_fg.png`), path.join(xxx, `ic_scheme_${k}_fg.png`));
        fs.copyFileSync(path.join(SRC, `ic_scheme_${k}_legacy.png`), path.join(xxx, `ic_scheme_${k}.png`));
        fs.writeFileSync(
          path.join(v26, `ic_scheme_${k}.xml`),
          `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n` +
            `    <background android:drawable="@color/ic_scheme_${k}_bg"/>\n` +
            `    <foreground android:drawable="@mipmap/ic_scheme_${k}_fg"/>\n` +
            `    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`,
        );
        colors.push(`  <color name="ic_scheme_${k}_bg">${themes.schemes[k].iconBackground}</color>`);
      }
      const values = path.join(res, 'values');
      fs.mkdirSync(values, { recursive: true });
      fs.writeFileSync(
        path.join(values, 'ic_scheme_colors.xml'),
        `<resources>\n${colors.join('\n')}\n</resources>\n`,
      );
      return cfg;
    },
  ]);
}

function withIconAliases(config) {
  return withAndroidManifest(config, (cfg) => {
    const pkg = cfg.android?.package;
    const app = cfg.modResults.manifest.application[0];
    const main = app.activity.find((a) => a.$['android:name'] === '.MainActivity');
    // Лаунчерный фильтр переходит с MainActivity на alias — иначе её нельзя «выключить».
    main['intent-filter'] = (main['intent-filter'] || []).filter(
      (f) => !(f.category || []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER'),
    );
    const alias = (key, icon, enabled) => ({
      $: {
        'android:name': `${pkg}.icon.${cap(key)}`,
        'android:enabled': enabled ? 'true' : 'false',
        'android:exported': 'true',
        'android:icon': icon,
        'android:label': '@string/app_name',
        'android:targetActivity': '.MainActivity',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
          category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
        },
      ],
    });
    app['activity-alias'] = [
      alias('default', '@mipmap/ic_launcher', true),
      ...keys.map((k) => alias(k, `@mipmap/ic_scheme_${k}`, false)),
    ];
    return cfg;
  });
}

module.exports = function withSchemeIcons(config) {
  return withIconAliases(withIconResources(config));
};
