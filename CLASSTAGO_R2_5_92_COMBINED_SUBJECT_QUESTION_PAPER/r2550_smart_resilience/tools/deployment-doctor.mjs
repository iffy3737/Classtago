import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const required = ['package.json','server.ts','src/App.tsx','src/main.tsx','vite.config.ts','render.yaml','capacitor.config.ts','android/app/build.gradle','.env.mobile'];
const missing = required.filter((rel) => !existsSync(resolve(root, rel)));
const legacy = ['EDUNIXO_HEADMASTER_R2_5_18','EDUNIXO_CLERK_R2_5_19','EDUNIXO_HEADMASTER_PRODUCTION_AUDIT_FIX_R2_5_17'].filter((rel) => existsSync(resolve(root, rel)));
const staleLocks = ['package-lock.json','bun.lock'].filter((rel) => existsSync(resolve(root, rel)));
const pkg = JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const android = readFileSync(resolve(root,'android/app/build.gradle'),'utf8');
const problems = [];
if (missing.length) problems.push('missing required files: ' + missing.join(', '));
if (legacy.length) problems.push('legacy full-project copies still present: ' + legacy.join(', '));
if (staleLocks.length) problems.push('stale lockfiles present: ' + staleLocks.join(', '));
if (!android.includes(`versionName "${pkg.version}"`)) problems.push('Android versionName does not match package version');
if (!pkg.engines?.node) problems.push('Node engine is not pinned');
if (problems.length) {
  console.error(`[EDUNIXO] Deployment doctor failed:\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log('[EDUNIXO] Deployment doctor: OK');
console.log(`[EDUNIXO] Version: ${pkg.version}`);
console.log('[EDUNIXO] Repository root is clean; no legacy full-project copies detected.');
console.log('[EDUNIXO] Render Blueprint and native Android project are present.');
