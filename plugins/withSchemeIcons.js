const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const themes = require('../src/theme/themes.json');

// Иконки рабочего стола по цветам («Ко всему»): основная «Default» (фирменный Янтарь) и по одному activity-alias
// на остальные 7 цветов. Включает нужный alias нативный модуль (modules/shoppinglist-alarms → setLauncherIcon).
// До 0.7.5 иконок было по профилям (13). Их alias ОСТАЮТСЯ в манифесте (выключенными), но показывают иконки новых цветов:
// если у человека была включена старая иконка, а новую приложение ещё не включило, значок на рабочем столе не пропадает.
// Всё генерируется при prebuild.
const SRC = path.join(__dirname, '..', 'assets', 'icons', 'schemes');
const brand = themes.brandAccent;
const accentKeys = Object.keys(themes.accents).filter((k) => k !== brand);
const migration = themes.migration;
// старые ключи профилей → цвет (по таблице миграции); vanilla (Янтарь) старой иконки не имел
const legacy = Object.keys(migration)
  .filter((k) => k !== 'note' && k !== 'system' && k !== 'vanilla' && !accentKeys.includes(k))
  .map((k) => ({ key: k, accent: migration[k][1] }));
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
      for (const k of accentKeys) {
        fs.copyFileSync(path.join(SRC, `ic_accent_${k}_fg.png`), path.join(xxx, `ic_accent_${k}_fg.png`));
        fs.copyFileSync(path.join(SRC, `ic_accent_${k}_legacy.png`), path.join(xxx, `ic_accent_${k}.png`));
        fs.writeFileSync(
          path.join(v26, `ic_accent_${k}.xml`),
          `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n` +
            `    <background android:drawable="@color/ic_accent_bg"/>\n` +
            `    <foreground android:drawable="@mipmap/ic_accent_${k}_fg"/>\n` +
            `    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`,
        );
      }
      const values = path.join(res, 'values');
      fs.mkdirSync(values, { recursive: true });
      fs.writeFileSync(path.join(values, 'ic_accent_colors.xml'), `<resources>\n  <color name="ic_accent_bg">#FFFFFF</color>\n</resources>\n`);
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
      ...accentKeys.map((k) => alias(k, `@mipmap/ic_accent_${k}`, false)),
      // старые иконки: тот же alias, иконка — нового цвета (Янтарь = основная иконка)
      ...legacy.map(({ key, accent }) => alias(key, accent === brand ? '@mipmap/ic_launcher' : `@mipmap/ic_accent_${accent}`, false)),
    ];
    return cfg;
  });
}

module.exports = function withSchemeIcons(config) {
  return withIconAliases(withIconResources(config));
};
