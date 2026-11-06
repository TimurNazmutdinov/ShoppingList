const { withGradleProperties } = require('expo/config-plugins');

// Лёгкая сборка для 8 ГБ ОЗУ и маленький APK: только 64 бита (arm64-v8a), ограниченная память и воркеры,
// в release включены R8 (minify) и shrinkResources.
const PROPS = {
  'org.gradle.jvmargs': '-Xmx2048m -XX:MaxMetaspaceSize=512m',
  'org.gradle.workers.max': '2',
  reactNativeArchitectures: 'arm64-v8a',
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  // CMake 3.22.1 приносит Ninja 1.10 без длинных путей Windows; 3.31.6 — Ninja 1.12.
  'android.cmakeVersion': '3.31.6',
};

module.exports = function withGradleProps(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((p) => !(p.type === 'property' && p.key in PROPS));
    for (const [key, value] of Object.entries(PROPS)) {
      cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
