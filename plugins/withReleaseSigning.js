const { withAppBuildGradle } = require('expo/config-plugins');

// Магазинная сборка берёт другой ключ (свойства SHOPPINGLIST_PLAY_*), прототип — прежний.
const P = process.env.EXPO_PUBLIC_STORE_BUILD === '1' ? 'SHOPPINGLIST_PLAY_' : 'SHOPPINGLIST_';

const SIGNING = `
        release {
            if (project.hasProperty('${P}STORE_FILE')) {
                storeFile file(project.property('${P}STORE_FILE'))
                storePassword project.property('${P}STORE_PASSWORD')
                keyAlias project.property('${P}KEY_ALIAS')
                keyPassword project.property('${P}KEY_PASSWORD')
            }
        }`;

// Комментарии и тексты в Gradle-коде — только ASCII: Gradle на Windows читает файл не как UTF-8.
const GUARD = `
// Release without our own key is refused: a debug-signed APK could not be updated in place.
gradle.taskGraph.whenReady { graph ->
    def wantsRelease = graph.allTasks.any { it.name == 'assembleRelease' || it.name == 'bundleRelease' }
    def keys = ['${P}STORE_FILE', '${P}STORE_PASSWORD', '${P}KEY_ALIAS', '${P}KEY_PASSWORD']
    def missing = keys.findAll { !project.hasProperty(it) }
    if (wantsRelease && !missing.isEmpty()) {
        throw new GradleException('Signing properties are missing in your user gradle.properties (.gradle folder in user home): ' + missing.join(', '))
    }
}
`;

// Подключает ключ ShoppingList к release-сборке. Пароли берутся из ~/.gradle/gradle.properties.
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(`${P}STORE_FILE`)) return cfg;

    const signingAt = src.indexOf('signingConfigs {');
    if (signingAt < 0) throw new Error('withReleaseSigning: нет блока signingConfigs в build.gradle');
    const signingEnd = signingAt + 'signingConfigs {'.length;
    src = src.slice(0, signingEnd) + SIGNING + src.slice(signingEnd);

    const buildTypesAt = src.indexOf('buildTypes {');
    const releaseAt = src.indexOf('release {', buildTypesAt);
    const target = 'signingConfig signingConfigs.debug';
    const useAt = src.indexOf(target, releaseAt);
    if (buildTypesAt < 0 || releaseAt < 0 || useAt < 0) {
      throw new Error('withReleaseSigning: не найден signingConfig в buildTypes.release');
    }
    src = src.slice(0, useAt) + 'signingConfig signingConfigs.release' + src.slice(useAt + target.length);

    cfg.modResults.contents = src + GUARD;
    return cfg;
  });
};
