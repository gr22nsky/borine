const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureReactRoot(buildGradle) {
  if (buildGradle.includes('root = file(projectRoot)')) return buildGradle;
  const reactBlockStart = /react\s*\{\s*\n/;
  if (!reactBlockStart.test(buildGradle)) return buildGradle;
  return buildGradle.replace(reactBlockStart, (match) => `${match}    root = file(projectRoot)\n`);
}

module.exports = function withAlimiAndroidGradle(config) {
  return withDangerousMod(config, [
    'android',
    async (config2) => {
      const buildGradlePath = path.join(config2.modRequest.platformProjectRoot, 'app', 'build.gradle');
      if (!fs.existsSync(buildGradlePath)) return config2;
      const current = fs.readFileSync(buildGradlePath, 'utf8');
      let next = ensureReactRoot(current);
      if (next !== current) fs.writeFileSync(buildGradlePath, next, 'utf8');
      return config2;
    }
  ]);
};
