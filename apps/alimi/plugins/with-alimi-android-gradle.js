const { withDangerousMod, withAndroidStyles, withStringsXml } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) return;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyFileIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function ensureReactRoot(buildGradle) {
  // 1. Ensure projectRoot uses environment variable
  const projectRootLine = 'def projectRoot = System.getenv("BORINE_PROJECT_ROOT") ?: rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
  if (!buildGradle.includes('System.getenv("BORINE_PROJECT_ROOT")')) {
    buildGradle = buildGradle.replace(
      /def projectRoot = .*/,
      projectRootLine
    );
  }

  // 2. Ensure extraPackagerArgs includes --entry-file
  if (!buildGradle.includes('extraPackagerArgs = ["--entry-file"')) {
    const entryFileResolution = `    def resolvedEntry = ["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"]
        .execute(null, rootDir)
        .text
        .trim()
    entryFile = file(resolvedEntry)
    extraPackagerArgs = ["--entry-file", resolvedEntry]`;
    
    buildGradle = buildGradle.replace(
      /entryFile = file\(.*resolveAppEntry.*\)\n/,
      `${entryFileResolution}\n`
    );
  }

  if (buildGradle.includes('root = file(projectRoot)')) return buildGradle;
  const reactBlockStart = /react\s*\{\s*\n/;
  if (!reactBlockStart.test(buildGradle)) return buildGradle;
  return buildGradle.replace(reactBlockStart, (match) => `${match}    root = file(projectRoot)\n`);
}

function ensureSplashBranding(projectRoot, appRoot) {
  const brandingSource = path.join(appRoot, 'assets', 'textlogo.png');
  const brandingTarget = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'drawable-xxxhdpi',
    'splashscreen_branding_base.png'
  );

  // Remove old nodpi version if exists
  const oldTargetBase = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable-nodpi', 'splashscreen_branding_base.png');
  if (fs.existsSync(oldTargetBase)) fs.unlinkSync(oldTargetBase);
  
  const oldTargetBranding = path.join(projectRoot, 'app', 'src', 'main', 'res', 'drawable-nodpi', 'splashscreen_branding.png');
  if (fs.existsSync(oldTargetBranding)) fs.unlinkSync(oldTargetBranding);

  copyFileIfExists(brandingSource, brandingTarget);

  // Create a wrapper drawable to prevent squashing and cropping
  const brandingWrapperPath = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'drawable',
    'splashscreen_branding.xml'
  );
  const wrapperContent = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item
        android:drawable="@drawable/splashscreen_branding_base"
        android:gravity="center"
        android:width="300dp"
        android:height="200dp" />
</layer-list>`;
  
  writeFileIfChanged(brandingWrapperPath, wrapperContent);

  const v31StylesPath = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'values-v31',
    'styles.xml'
  );

  if (fs.existsSync(v31StylesPath)) {
    console.log(`[with-alimi-android-gradle] Deleting ${v31StylesPath} to force use of values/styles.xml`);
    fs.unlinkSync(v31StylesPath);
  }
}

function patchAdaptiveIcon(projectRoot) {
  const resDir = path.join(projectRoot, 'app', 'src', 'main', 'res');
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  const files = ['ic_launcher.xml', 'ic_launcher_round.xml'];

  files.forEach((file) => {
    const filePath = path.join(anyDpiDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('<foreground android:drawable="@mipmap/ic_launcher_foreground"/>')) {
        const patchedForeground = `    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground"
               android:insetLeft="18%"
               android:insetRight="18%"
               android:insetTop="18%"
               android:insetBottom="18%" />
    </foreground>`;
        content = content.replace(
          /<foreground android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/,
          patchedForeground
        );
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  });
}

const withAndroidSplashStyles = (config) => {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style || [];
    const splashStyle = styles.find((s) => s.$.name === 'Theme.App.SplashScreen');

    if (splashStyle) {
      // Ensure postSplashScreenTheme is present
      if (!splashStyle.item.find((i) => i.$.name === 'postSplashScreenTheme')) {
        splashStyle.item.push({ _: '@style/AppTheme', $: { name: 'postSplashScreenTheme' } });
      }
      // Add branding image
      if (!splashStyle.item.find((i) => i.$.name === 'android:windowSplashScreenBrandingImage')) {
        splashStyle.item.push({
          _: '@drawable/splashscreen_branding',
          $: { name: 'android:windowSplashScreenBrandingImage' },
        });
      }
    }

    return config;
  });
};

const withFixedStrings = (config) => {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];
    const appName = strings.find((s) => s.$.name === 'app_name');
    if (appName) {
      appName._ = '보리네 알리미';
    }
    return config;
  });
};

module.exports = function withAlimiAndroidGradle(config) {
  config = withFixedStrings(config);
  config = withAndroidSplashStyles(config);
  return withDangerousMod(config, [
    'android',
    async (config2) => {
      const projectRoot = config2.modRequest.platformProjectRoot;
      const appRoot = config2.modRequest.projectRoot;

      const buildGradlePath = path.join(projectRoot, 'app', 'build.gradle');
      if (fs.existsSync(buildGradlePath)) {
        const current = fs.readFileSync(buildGradlePath, 'utf8');
        const next = ensureReactRoot(current);
        if (next !== current) fs.writeFileSync(buildGradlePath, next, 'utf8');
      }

      ensureSplashBranding(projectRoot, appRoot);
      patchAdaptiveIcon(projectRoot);
      return config2;
    }
  ]);
};
