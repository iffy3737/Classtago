import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

function readEnvFile(name) {
  const file = path.join(root, name);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const values = {
  ...readEnvFile('.env.mobile'),
  ...readEnvFile('.env.mobile.local'),
  ...process.env,
};

const apiBase = String(values.VITE_EDUNIXO_API_BASE_URL || '').trim().replace(/\/$/, '');
if (!apiBase) {
  console.error('[EDUNIXO Android] VITE_EDUNIXO_API_BASE_URL is required before building the installed app.');
  console.error('[EDUNIXO Android] Put the HTTPS origin serving the existing Express /api routes in .env.mobile.local or the build environment.');
  process.exit(1);
}

let parsed;
try { parsed = new URL(apiBase); } catch {
  console.error('[EDUNIXO Android] VITE_EDUNIXO_API_BASE_URL must be a valid absolute HTTPS URL.');
  process.exit(1);
}
if (parsed.protocol !== 'https:') {
  console.error('[EDUNIXO Android] Production native API routing requires HTTPS.');
  process.exit(1);
}
if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
  console.error('[EDUNIXO Android] VITE_EDUNIXO_API_BASE_URL must be an origin only, without /api or another path.');
  process.exit(1);
}

console.log(`[EDUNIXO Android] Native API origin verified: ${parsed.origin}`);
