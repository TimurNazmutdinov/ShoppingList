const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

// Подпись под значком по языку телефона. Остальные языки — expo.name («Shopping List»).
const NAMES = { ru: 'Умный список', kk: 'Smart Tizim' };

module.exports = function withAppNameLocales(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const res = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
      for (const [lang, name] of Object.entries(NAMES)) {
        const dir = path.join(res, `values-${lang}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          path.join(dir, 'strings.xml'),
          `<resources>\n  <string name="app_name">${name}</string>\n</resources>\n`,
        );
      }
      return cfg;
    },
  ]);
};
