#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function fail(message) {
  throw new Error(message);
}

function printUsage() {
  console.log('사용법: node scripts/android-build.mjs <appName> <apk|aab>');
  console.log('예) npm run alimi:apk');
  console.log('예) npm run alimi:aab');
}

function isWindows() {
  return process.platform === 'win32';
}

function run(command, args, options = {}) {
  const cwdLabel = options.cwd ? ` (cwd: ${options.cwd})` : '';
  console.log(`$ ${command} ${args.join(' ')}${cwdLabel}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options
  });
  if (result.error) {
    throw new Error(`Command failed: ${command}\n${result.error.message ?? result.error}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command exited with code: ${result.status ?? 1}`);
  }
}

function runViaCmd(commandLineArgs, options = {}) {
  const comspec = process.env.ComSpec || 'cmd.exe';
  run(comspec, ['/d', '/s', '/c', ...commandLineArgs], options);
}

function runNpx(args, options = {}) {
  if (isWindows()) {
    runViaCmd(['npx', ...args], options);
    return;
  }
  run('npx', args, options);
}

const [, , appName, target] = process.argv;

if (appName === '-h' || appName === '--help' || target === '-h' || target === '--help') {
  printUsage();
  process.exit(0);
}

if (!appName || !target) {
  printUsage();
  process.exit(1);
}

const appDir = path.join(repoRoot, 'apps', appName);
if (!existsSync(appDir)) fail(`폴더를 찾을 수 없습니다: ${appDir}`);

const appJsonPath = path.join(appDir, 'app.json');
if (!existsSync(appJsonPath)) {
  fail(
    `apps/${appName}/app.json 이 없습니다.\n` +
      `- Expo 앱이 아니라면, 먼저 Expo 프로젝트를 생성/이동해 주세요.\n` +
      `- Expo 앱이라면 app.json(또는 app.config.*)을 추가해 주세요.`
  );
}

const gradleTask = target === 'apk' ? 'assembleRelease' : target === 'aab' ? 'bundleRelease' : null;
if (!gradleTask) fail(`target은 apk 또는 aab만 가능합니다. 입력값: ${target}`);

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'production',
  CI: process.env.CI ?? '1',
  EXPO_PROJECT_ROOT: appDir,
  EXPO_WORKSPACE_ROOT: repoRoot,
  BORINE_PROJECT_ROOT: appDir
};

let fatalError = null;
try {
  const androidDir = path.join(appDir, 'android');
  
  // app.json이 수정되었거나 android 폴더가 없으면 prebuild를 강제합니다.
  let shouldPrebuild = !existsSync(androidDir);
  if (!shouldPrebuild && existsSync(appJsonPath)) {
    const appJsonTime = statSync(appJsonPath).mtimeMs;
    const androidTime = statSync(androidDir).mtimeMs;
    if (appJsonTime > androidTime) {
      console.log(`[!] app.json이 수정되었습니다. 설정을 다시 반영합니다.`);
      shouldPrebuild = true;
    }
  }

  // 환경 변수로 명시적 제어 가능
  if (process.env.BORINE_PREBUILD === '1') shouldPrebuild = true;
  if (process.env.BORINE_PREBUILD === '0') shouldPrebuild = false;

  if (shouldPrebuild) {
    console.log(`[1/2] Prebuild (apps/${appName}) [auto-sync]`);
    // --no-install을 사용하여 속도를 높이고, 설정만 네이티브에 반영합니다.
    const prebuildArgs = ['expo', 'prebuild', '--platform', 'android', '--no-install'];
    runNpx(prebuildArgs, { cwd: appDir, env });
  } else {
    console.log(`[1/2] Prebuild (apps/${appName}) [skipped - already up to date]`);
  }

  if (!existsSync(androidDir)) {
    fail(`android 폴더가 없습니다: ${androidDir}`);
  }

  console.log(`[2/2] Gradle ${gradleTask} (apps/${appName}/android)`);
  if (isWindows()) {
    runViaCmd(['gradlew.bat', gradleTask], { cwd: androidDir, env });
  } else {
    run('./gradlew', [gradleTask], { cwd: androidDir, env });
  }

  const distDir = path.join(repoRoot, 'dist', 'android', appName);
  mkdirSync(distDir, { recursive: true });

  if (target === 'apk') {
    const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    const distApkPath = path.join(distDir, 'app-release.apk');
    copyFileSync(apkPath, distApkPath);
    console.log(`완료: ${distApkPath}`);
  } else {
    const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
    const distAabPath = path.join(distDir, 'app-release.aab');
    copyFileSync(aabPath, distAabPath);
    console.log(`완료: ${distAabPath}`);
  }
} catch (error) {
  fatalError = error;
  console.error(error?.message ?? error);
} finally {
  if (fatalError) process.exitCode = 1;
}
