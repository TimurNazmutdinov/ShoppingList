const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            if (project.hasProperty('SHOPPINGLIST_STORE_FILE')) {
                storeFile file(project.property('SHOPPINGLIST_STORE_FILE'))
                storePassword project.property('SHOPPINGLIST_STORE_PASSWORD')
                keyAlias project.property('SHOPPINGLIST_KEY_ALIAS')
                keyPassword project.property('SHOPPINGLIST_KEY_PASSWORD')
            }
        }`;

// Комментарии и тексты в Gradle-коде — только ASCII: Gradle на Windows читает файл не как UTF-8.
const GUARD = `
// Release without our own key is refused: a debug-signed APK could not be updated in place.
gradle.taskGraph.whenReady { graph ->
    def wantsRelease = graph.allTasks.any { it.name == 'assembleRelease' || it.name == 'bundleRelease' }
    def keys = ['SHOPPINGLIST_STORE_FILE', 'SHOPPINGLIST_STORE_PASSWORD', 'SHOPPINGLIST_KEY_ALIAS', 'SHOPPINGLIST_KEY_PASSWORD']
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
    if (src.includes('SHOPPINGLIST_STORE_FILE')) return cfg;

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
