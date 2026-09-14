import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const android = path.join(root, 'android');
const wrapperJar = path.join(android, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const backup = path.join(root, '.edunixo-android-native-backup');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
  const result = spawnSync(npx, args, { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npx ${args.join(' ')} failed with exit code ${result.status}`);
}

if (!existsSync(android)) {
  console.log('[EDUNIXO Android] Creating native Android project from installed Capacitor template.');
  run(['cap', 'add', 'android']);
} else if (!existsSync(wrapperJar)) {
  if (existsSync(backup)) throw new Error(`Safety stop: ${backup} already exists.`);
  console.log('[EDUNIXO Android] Hydrating trusted Gradle wrapper files from installed Capacitor template.');
  renameSync(android, backup);
  try {
    run(['cap', 'add', 'android']);
    const generated = path.join(root, 'android');
    mkdirSync(path.join(backup, 'gradle', 'wrapper'), { recursive: true });
    for (const rel of ['gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar', 'gradle/wrapper/gradle-wrapper.properties']) {
      const src = path.join(generated, rel);
      if (existsSync(src)) cpSync(src, path.join(backup, rel), { force: true });
    }
    rmSync(generated, { recursive: true, force: true });
    renameSync(backup, android);
  } catch (error) {
    try { if (existsSync(android)) rmSync(android, { recursive: true, force: true }); } catch {}
    try { if (existsSync(backup)) renameSync(backup, android); } catch {}
    throw error;
  }
}

run(['cap', 'sync', 'android']);
console.log('[EDUNIXO Android] Android project hydrated and synchronized.');
