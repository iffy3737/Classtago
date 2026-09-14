import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');

// R2.5.81 — AI Studio full-stack runtime alignment.
// Google AI Studio now provides a real Node server-side runtime. Running Vite on
// port 3000 and Express as a private 3001 sidecar made some preview requests fall
// through to the SPA HTML instead of reaching newly-added API routes. EDUNIXO now
// uses one full-stack process: Express owns port 3000 and embeds Vite middleware.
// This is also the same routing model used by production (one public origin).

for (const envName of ['.env.local', '.env']) {
  const envPath = path.join(root, envName);
  if (!existsSync(envPath)) continue;
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn(`[Classtago] Could not load ${envName}: ${error?.message || error}`);
  }
}

let child = null;
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { if (child && !child.killed) child.kill('SIGTERM'); } catch {}
  setTimeout(() => process.exit(code), 80).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => {
  try { if (child && !child.killed) child.kill('SIGTERM'); } catch {}
});

child = spawn(node, [tsxCli, 'watch', 'server.ts'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '3000',
    EDUNIXO_API_ONLY: 'false',
    VITE_EDUNIXO_APP_RUNTIME: 'false',
    VITE_EDUNIXO_MOBILE_APP: process.env.VITE_EDUNIXO_MOBILE_APP || 'false',
    DISABLE_HMR: 'true',
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (!shuttingDown) shutdown(code ?? (signal ? 1 : 0));
});
