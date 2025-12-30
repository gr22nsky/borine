const { withProjectBuildGradle, withAppBuildGradle, withDangerousMod, withAndroidStyles } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo SDK 54+ 모노레포 빌드 시 Metro 경로 문제를 해결하고,
 * 스플래시 브랜딩 이미지 및 아이콘 여백을 조정하는 플러그인
 */
const withMagnifierAndroidGradle = (config) => {
  config = withAndroidSplashStyles(config);
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'gradle') {
      config.modResults.contents = modifyAppBuildGradle(config.modResults.contents);
    }
    return config;
  });

  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const appRoot = config.modRequest.projectRoot;

      ensureSplashBranding(projectRoot, appRoot);
      patchAdaptiveIcon(projectRoot);
      return config;
    }
  ]);
};

function withAndroidSplashStyles(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style || [];
    const splashStyle = styles.find((s) => s.$.name === 'Theme.App.SplashScreen');

    if (splashStyle) {
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
}

function ensureSplashBranding(projectRoot, appRoot) {
  const brandingSource = path.join(appRoot, 'assets', 'textlogo_magnifier.png');
  const brandingTarget = path.join(
    projectRoot,
    'app',
    'src',
    'main',
    'res',
    'drawable-xxxhdpi',
    'splashscreen_branding_base.png'
  );

  if (fs.existsSync(brandingSource)) {
    fs.mkdirSync(path.dirname(brandingTarget), { recursive: true });
    fs.copyFileSync(brandingSource, brandingTarget);
  }

  // Create a wrapper drawable to prevent squashing
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
  
  fs.mkdirSync(path.dirname(brandingWrapperPath), { recursive: true });
  fs.writeFileSync(brandingWrapperPath, wrapperContent, 'utf8');

  // Remove v31 styles to force use of our styles
  const v31StylesPath = path.join(projectRoot, 'app', 'src', 'main', 'res', 'values-v31', 'styles.xml');
  if (fs.existsSync(v31StylesPath)) {
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

function modifyAppBuildGradle(contents) {
  // 1. projectRoot 정의 확인 및 수정
  const projectRootLine = 'def envProjectRoot = System.getenv("BORINE_PROJECT_ROOT")\ndef projectRoot = envProjectRoot ?: rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()';
  if (!contents.includes('def projectRoot =')) {
    contents = contents.replace(
      /apply plugin: "com.facebook.react"/,
      `apply plugin: "com.facebook.react"\n${projectRootLine}`
    );
  }

  // 2. react 블록 수정
  if (contents.includes('react {') && !contents.includes('root = file(projectRoot)')) {
    const newReactBlock = `react {
    root = file(projectRoot)
    def resolvedEntry = ["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"]
        .execute(null, rootDir)
        .text
        .trim()
    entryFile = file(resolvedEntry)
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
    hermesCommand = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/sdks/hermesc/%OS-BIN%/hermesc"
    codegenDir = new File(["node", "--print", "require.resolve('@react-native/codegen/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()

    enableBundleCompression = (findProperty('android.enableBundleCompression') ?: false).toBoolean()
    cliFile = new File(["node", "--print", "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"
    extraPackagerArgs = ["--entry-file", resolvedEntry]

    /* Autolinking */
    autolinkLibrariesWithApp()`;

    contents = contents.replace(/react\s*\{[\s\S]*?bundleCommand\s*=\s*"export:embed"/, newReactBlock);
  }

  return contents;
}

module.exports = withMagnifierAndroidGradle;
