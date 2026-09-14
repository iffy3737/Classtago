import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

// AI Studio runs the Vite preview and Express API as separate Node processes.
// Vite loads .env automatically, but the API sidecar does not. Load server-safe
// environment files here before spawning either child. Existing injected Secrets
// always win because process.loadEnvFile does not overwrite existing process.env.
for (const envName of ['.env.local', '.env']) {
  const envPath = path.join(root, envName);
  if (!existsSync(envPath)) continue;
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn(`[EDUNIXO] Could not load ${envName}: ${error?.message || error}`);
  }
}

const children = new Set();
let shuttingDown = false;

function start(label, args, env) {
  const child = spawn(node, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  children.add(child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!shuttingDown && label === 'preview') {
      shutdown(code ?? (signal ? 1 : 0));
    }
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 80).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  for (const child of children) {
    try { if (!child.killed) child.kill('SIGTERM'); } catch {}
  }
});

// Start the API sidecar without letting its large server bootstrap block the
// AI Studio frontend readiness probe.
start('api', [tsxCli, 'server.ts'], {
  NODE_ENV: 'development',
  PORT: '3001',
  EDUNIXO_API_ONLY: 'true',
});

// Vite is the foreground preview process and opens on AI Studio's expected port.
start('preview', [viteCli, '--host', '0.0.0.0', '--port', '3000'], {
  NODE_ENV: 'development',
  VITE_EDUNIXO_APP_RUNTIME: 'true',
  VITE_EDUNIXO_MOBILE_APP: process.env.VITE_EDUNIXO_MOBILE_APP || 'false',
  // AI Studio preview is reverse-proxied; Vite's default WebSocket HMR
  // cannot reliably reach localhost through that proxy. Disable HMR here so
  // the preview stays connected instead of entering the websocket retry loop.
  DISABLE_HMR: 'true',
});
