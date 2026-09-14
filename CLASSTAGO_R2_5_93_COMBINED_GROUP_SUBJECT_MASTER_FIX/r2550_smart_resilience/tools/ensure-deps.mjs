import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const pkgText = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgText);
const hash = createHash('sha256').update(pkgText).digest('hex').slice(0, 20);
const stamp = path.join(root, 'node_modules', '.edunixo-deps-ready');
const require = createRequire(import.meta.url);

const required = [
  'react',
  'react-dom',
  'react-is',
  '@vitejs/plugin-react',
  'vite',
  '@supabase/supabase-js',
  'lucide-react',
  'motion',
  'recharts',
  'exceljs',
  'xlsx',
  'jspdf',
  'html2canvas',
  'html2pdf.js',
  'file-saver',
  'qrcode.react',
  '@capacitor/core',
  '@capacitor/android',
  '@capacitor/app',
  '@capacitor/browser',
  '@capacitor/keyboard',
  '@capacitor/network',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
  '@capacitor/cli',
];

function packageAvailable(name) {
  try {
    require.resolve(`${name}/package.json`);
    return true;
  } catch {
    try {
      require.resolve(name);
      return true;
    } catch {
      return false;
    }
  }
}

const stampMatches = existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === hash;
const missing = required.filter((name) => !packageAvailable(name));

if (stampMatches && missing.length === 0) {
  console.log('[EDUNIXO] Dependencies ready.');
  process.exit(0);
}

if (missing.length) {
  console.log(`[EDUNIXO] Installing missing project dependencies: ${missing.join(', ')}`);
} else {
  console.log('[EDUNIXO] Package definition changed; refreshing dependencies.');
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(
  npmCommand,
  ['install', '--no-audit', '--no-fund', '--legacy-peer-deps'],
  { cwd: root, stdio: 'inherit', env: { ...process.env, npm_config_update_notifier: 'false' } },
);

if (result.error) {
  console.error('[EDUNIXO] Dependency installation could not start:', result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`[EDUNIXO] Dependency installation failed with exit code ${result.status}.`);
  process.exit(result.status ?? 1);
}

const stillMissing = required.filter((name) => !packageAvailable(name));
if (stillMissing.length) {
  console.error(`[EDUNIXO] Install completed but packages are still unavailable: ${stillMissing.join(', ')}`);
  process.exit(1);
}

writeFileSync(stamp, hash, 'utf8');
console.log('[EDUNIXO] Dependencies installed and verified.');
