import process from 'node:process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const entry = resolve(process.cwd(), 'dist/server.js');
if (!existsSync(entry)) {
  console.error('[EDUNIXO] Production build is missing dist/server.js. Run npm run build before starting.');
  process.exit(1);
}
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
await import(pathToFileURL(entry).href);
