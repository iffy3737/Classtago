import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const required = ['dist/index.html', 'dist/server.cjs', 'dist/server.js'];
const missing = required.filter((rel) => !existsSync(resolve(process.cwd(), rel)));
if (missing.length) {
  console.error('[Classtago] Production build validation failed. Missing: ' + missing.join(', '));
  process.exit(1);
}
for (const rel of required) {
  if (statSync(resolve(process.cwd(), rel)).size <= 0) {
    console.error('[Classtago] Production build validation failed. Empty file: ' + rel);
    process.exit(1);
  }
}
console.log('[Classtago] Production build validated: frontend + server entry are ready.');
