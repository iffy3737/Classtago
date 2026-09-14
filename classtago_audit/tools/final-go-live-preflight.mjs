import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const live = process.argv.includes('--live');
const errors = [];
const warnings = [];
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');
const requireFile = (rel) => { if (!existsSync(resolve(root, rel))) errors.push(`Missing ${rel}`); };

['package.json','server.ts','render.yaml','src/App.tsx','src/components/ProcessDemoHub.tsx','android/app/build.gradle','capacitor.config.ts','.env.mobile'].forEach(requireFile);
if (errors.length) {
  console.error('[Classtago] Go-live preflight failed:\n - ' + errors.join('\n - '));
  process.exit(1);
}

const pkg = JSON.parse(read('package.json'));
const gradle = read('android/app/build.gradle');
const render = read('render.yaml');
const server = read('server.ts');
const mobileEnv = read('.env.mobile');
const demoHub = read('src/components/ProcessDemoHub.tsx');

if (!gradle.includes(`versionName "${pkg.version}"`)) errors.push(`Android versionName must match package ${pkg.version}`);
if (!/versionCode\s+\d+/.test(gradle)) errors.push('Android versionCode is missing');
if (!render.includes('healthCheckPath: /api/health')) errors.push('Render healthCheckPath must be /api/health');
if (!render.includes('buildCommand:') || !render.includes('npm run build')) errors.push('Render build command is not configured');
if (!render.includes('startCommand: npm start')) errors.push('Render start command is not configured');
if (!server.includes("'/api/health'") && !server.includes('"/api/health"')) errors.push('Server /api/health route is missing');
if (!render.includes('VITE_SUPABASE_URL')) errors.push('Render VITE_SUPABASE_URL is missing');
if (!render.includes('VITE_SUPABASE_ANON_KEY')) errors.push('Render VITE_SUPABASE_ANON_KEY secret slot is missing');
if (!render.includes('SUPABASE_SECRET_KEY')) errors.push('Render SUPABASE_SECRET_KEY secret slot is missing');
if (!demoHub.includes('STRICT_EFFECT_COPY') || !demoHub.includes('strictActionFallback') || !demoHub.includes('edunixo.demo.process-copy.r263')) errors.push('Strict demo language fallback is not present');

const apiLine = mobileEnv.split(/\r?\n/).find(line => line.trim().startsWith('VITE_EDUNIXO_API_BASE_URL='));
const apiBase = String(apiLine?.split('=').slice(1).join('=') || process.env.VITE_EDUNIXO_API_BASE_URL || '').trim();
if (live) {
  if (!apiBase) errors.push('VITE_EDUNIXO_API_BASE_URL is required for native go-live');
  else {
    try {
      const u = new URL(apiBase);
      if (u.protocol !== 'https:' || u.pathname !== '/' || u.search || u.hash) errors.push('VITE_EDUNIXO_API_BASE_URL must be a clean HTTPS origin');
    } catch { errors.push('VITE_EDUNIXO_API_BASE_URL is not a valid URL'); }
  }
  const requiredSecrets = ['VITE_SUPABASE_ANON_KEY','SUPABASE_SECRET_KEY'];
  for (const key of requiredSecrets) if (!String(process.env[key] || '').trim()) warnings.push(`${key} cannot be verified from this local package; confirm it in the deployment environment.`);
} else if (!apiBase) {
  warnings.push('Native API base is intentionally unset in the package. Set the live HTTPS origin in .env.mobile.local/build environment before APK/AAB.');
}

if (errors.length) {
  console.error('[Classtago] Go-live preflight failed:\n - ' + errors.join('\n - '));
  if (warnings.length) console.warn('[Classtago] Warnings:\n - ' + warnings.join('\n - '));
  process.exit(1);
}
console.log(`[Classtago] Go-live preflight: OK (${live ? 'live-mode config' : 'source-package'})`);
console.log(`[Classtago] Version: ${pkg.version}`);
console.log('[Classtago] Render build/start/health wiring verified.');
console.log('[Classtago] Android package version is synchronized.');
console.log('[Classtago] Strict demo language fallback is present.');
if (warnings.length) console.warn('[Classtago] Warnings:\n - ' + warnings.join('\n - '));
