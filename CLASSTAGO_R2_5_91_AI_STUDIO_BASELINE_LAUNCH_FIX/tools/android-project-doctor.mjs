import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const required = [
  'capacitor.config.ts',
  '.env.mobile',
  'android/settings.gradle',
  'android/build.gradle',
  'android/variables.gradle',
  'android/capacitor.settings.gradle',
  'android/app/build.gradle',
  'android/app/capacitor.build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'android/app/src/main/java/com/classtago/app/MainActivity.java',
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/res/values/styles.xml',
];

const missing = required.filter((rel) => !existsSync(path.join(root, rel)));
if (missing.length) {
  console.error('[Classtago Android] Missing native project files:\n' + missing.map(x => ` - ${x}`).join('\n'));
  process.exit(1);
}

const build = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
const manifest = readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const settings = readFileSync(path.join(root, 'android/capacitor.settings.gradle'), 'utf8');
const problems = [];
if (!build.includes('applicationId "com.classtago.app"')) problems.push('applicationId mismatch');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!build.includes(`versionName \"${pkg.version}\"`)) problems.push(`versionName mismatch: expected ${pkg.version}`);
if (!/versionCode\s+\d+/.test(build)) problems.push('versionCode is missing');
if (!manifest.includes('android:usesCleartextTraffic="false"')) problems.push('cleartext traffic is not disabled');
if (!manifest.includes('android:allowBackup="false"')) problems.push('Android backup is not disabled');
for (const plugin of ['capacitor-app','capacitor-browser','capacitor-keyboard','capacitor-network','capacitor-splash-screen','capacitor-status-bar']) {
  if (!settings.includes(`include ':${plugin}'`)) problems.push(`missing ${plugin} Gradle include`);
}
if (problems.length) {
  console.error('[Classtago Android] Native project validation failed:\n' + problems.map(x => ` - ${x}`).join('\n'));
  process.exit(1);
}

const wrapperReady = existsSync(path.join(root, 'android/gradle/wrapper/gradle-wrapper.jar'));
console.log('[Classtago Android] Native project structure: OK');
console.log('[Classtago Android] App ID: com.classtago.app');
console.log('[Classtago Android] Android SDK: min 24 / target 36');
console.log(`[Classtago Android] Gradle wrapper binary: ${wrapperReady ? 'ready' : 'hydrate with npm run android:bootstrap'}`);
