import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, 'server.js'), "import './server.cjs';\n", 'utf8');
console.log('[Classtago] Cloud Run entry created: dist/server.js -> dist/server.cjs');
