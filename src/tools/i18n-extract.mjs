#!/usr/bin/env node
// Extracts the English UI text of the app into i18n-src/strings.json (most frequent first).
// Run from the app folder:  cd ~/classtago-source/src && node tools/i18n-extract.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let ts;
try { ts = require(path.resolve('node_modules/typescript')); }
catch (e) { console.log('STOP: node_modules/typescript nahi mila.'); process.exit(1); }
const K = ts.SyntaxKind;
const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, 'components'))) { console.log('STOP: components folder nahi mila. cd ~/classtago-source/src karke chalao.'); process.exit(1); }

const SKIP_DIRS = new Set(['node_modules', 'dist', 'mobile-dist', 'android', 'ios', 'src', 'supabase', 'public', 'tools', 'i18n-src', '.git']);
const SKIP_FILE = /(\.d\.ts|\.bak)$|[A-Za-z]*Translations?\.tsx?$|translations?\.tsx?$|demoProcessCatalog|demoExperienceCatalog|demoLocaleData|DemoExperience|ProcessDemoHub|fontCatalog|languageCatalog|_BACKUP_/;
const WL = new Set(['label', 'title', 'subtitle', 'description', 'detail', 'details', 'text', 'message', 'heading', 'hint', 'tooltip', 'placeholder', 'caption', 'summary', 'helper', 'helperText', 'emptyText', 'buttonLabel', 'confirmLabel', 'cancelLabel', 'successMessage', 'errorMessage', 'emptyMessage']);
const WL_SERVER = new Set(['error', 'message', 'detail', 'hint']);
const CALLS = /^(set(Error|Err|Msg|Message|Notice|Note|Info|Warning|Success|Status|Toast|Banner|SaveMessage|PreviewErr|SignMsg|Feedback)|alert|confirm|toast|showToast|notify)$/;

const files = [];
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!SKIP_DIRS.has(ent.name)) walk(p); continue; }
    if (!/\.tsx?$/.test(ent.name)) continue;
    if (dir === ROOT && !/\.tsx$/.test(ent.name)) continue;
    const rel = path.relative(ROOT, p).split(path.sep).join('/');
    if (SKIP_FILE.test(rel)) continue;
    files.push(rel);
  }
};
walk(ROOT);
if (fs.existsSync('server.ts')) files.push('server.ts');

const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const LOCALISED = /[\u0600-\u0DFF\u1C50-\u1C7F\uABC0-\uABFF]/;
function accept(s) {
  if (s.length < 2 || s.length > 300) return false;
  if (LOCALISED.test(s)) return false;
  const letters = s.replace(/\{#\}/g, '').match(/[A-Za-z]/g);
  if (!letters || letters.length < 2) return false;
  if (/^[a-z0-9_.\/:#@\-]+$/.test(s)) return false;
  if (/^[A-Z0-9_]+$/.test(s)) return false;
  if (/^(https?:|\/api\/|\.{1,2}\/|data:|#)/.test(s)) return false;
  if (/[<>]|=>|\bfunction\b|\bconst\b|\breturn\b/.test(s)) return false;
  const toks = s.split(' ');
  if (toks.length > 1 && toks.every((t) => /^[a-z0-9:\/\[\]\-_.%#!()]+$/.test(t)) && toks.some((t) => /[-:\[\]]/.test(t))) return false;
  if (toks.length === 1 && !/^[A-Z]/.test(s)) return false;
  return true;
}

const found = new Map();
function add(raw, file, kind) {
  const s = clean(raw);
  if (!accept(s)) return;
  let r = found.get(s);
  if (!r) { r = { n: 0, files: new Set(), kinds: new Set() }; found.set(s, r); }
  r.n++;
  if (r.files.size < 3) r.files.add(file);
  r.kinds.add(kind);
}

const unwrap = (e) => {
  while (e && (e.kind === K.ParenthesizedExpression || e.kind === K.AsExpression || e.kind === K.NonNullExpression || e.kind === K.TypeAssertionExpression || e.kind === K.SatisfiesExpression)) e = e.expression;
  return e;
};
function flat(e) {
  e = unwrap(e);
  if (!e) return null;
  if (e.kind === K.StringLiteral || e.kind === K.NoSubstitutionTemplateLiteral) return e.text;
  if (e.kind === K.TemplateExpression) {
    let s = e.head.text;
    for (const sp of e.templateSpans) s += '{#}' + sp.literal.text;
    return s;
  }
  if (e.kind === K.BinaryExpression && e.operatorToken.kind === K.PlusToken) {
    const l = flat(e.left);
    const r = flat(e.right);
    if (l === null && r === null) return null;
    return (l === null ? '{#}' : l) + (r === null ? '{#}' : r);
  }
  return null;
}
function exprStrings(e, out) {
  e = unwrap(e);
  if (!e) return;
  if (e.kind === K.ConditionalExpression) { exprStrings(e.whenTrue, out); exprStrings(e.whenFalse, out); return; }
  if (e.kind === K.BinaryExpression) {
    const k = e.operatorToken.kind;
    if (k === K.AmpersandAmpersandToken || k === K.BarBarToken || k === K.QuestionQuestionToken) { exprStrings(e.left, out); exprStrings(e.right, out); return; }
  }
  const s = flat(e);
  if (s) out.push(s);
}
const propName = (n) => (n && (n.kind === K.Identifier || n.kind === K.StringLiteral || n.kind === K.NoSubstitutionTemplateLiteral) ? n.text : null);

function scan(rel) {
  const mode = rel === 'server.ts' || rel.startsWith('server/') ? 'server' : 'app';
  let src;
  try { src = fs.readFileSync(rel, 'utf8'); } catch (e) { return; }
  const sf = ts.createSourceFile(rel, src, ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const names = mode === 'server' ? WL_SERVER : WL;
  const strs = (e, kind) => { const out = []; exprStrings(e, out); out.forEach((s) => add(s, rel, kind)); };
  const visit = (node) => {
    if (mode === 'app') {
      if (node.kind === K.JsxText) add(node.text, rel, 'jsx-text');
      else if (node.kind === K.JsxAttribute) {
        const nm = node.name.getText(sf);
        if (WL.has(nm) || nm === 'aria-label' || nm === 'alt') {
          const init = node.initializer;
          if (init) {
            if (init.kind === K.StringLiteral) add(init.text, rel, 'attr');
            else if (init.kind === K.JsxExpression && init.expression) strs(init.expression, 'attr');
          }
        }
      } else if (node.kind === K.JsxExpression && node.expression && node.parent && (node.parent.kind === K.JsxElement || node.parent.kind === K.JsxFragment)) {
        strs(node.expression, 'jsx-expr');
      } else if (node.kind === K.CallExpression) {
        const c = node.expression;
        const nm = c.kind === K.Identifier ? c.text : (c.kind === K.PropertyAccessExpression ? c.name.text : '');
        if (CALLS.test(nm)) node.arguments.forEach((arg) => strs(arg, 'call'));
      } else if (node.kind === K.NewExpression) {
        if (node.expression.kind === K.Identifier && node.expression.text === 'Error' && node.arguments && node.arguments[0]) strs(node.arguments[0], 'error');
      }
    }
    if (node.kind === K.PropertyAssignment) {
      const nm = propName(node.name);
      if (nm && names.has(nm)) strs(node.initializer, mode === 'server' ? 'server' : 'prop');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

for (const f of files) {
  try { scan(f); } catch (e) { console.log('skip ' + f + ': ' + (e && e.message)); }
}

const rows = [...found.entries()]
  .map(([t, r]) => ({ t, n: r.n, f: [...r.files][0], k: [...r.kinds].join(',') }))
  .sort((a, b) => b.n - a.n || a.t.localeCompare(b.t));
fs.mkdirSync('i18n-src', { recursive: true });
fs.writeFileSync('i18n-src/strings.json', '[\n' + rows.map((r) => JSON.stringify({ t: r.t, n: r.n, f: r.f })).join(',\n') + '\n]\n');

const kinds = {};
rows.forEach((r) => r.k.split(',').forEach((k) => { kinds[k] = (kinds[k] || 0) + 1; }));
console.log('Files scanned:', files.length);
console.log('Unique UI strings:', rows.length, '| total occurrences:', rows.reduce((s, r) => s + r.n, 0), '| total characters:', rows.reduce((s, r) => s + r.t.length, 0));
console.log('By source:', JSON.stringify(kinds));
console.log('Top 12:');
rows.slice(0, 12).forEach((r) => console.log('  ' + r.n + 'x  ' + r.t.slice(0, 70)));
console.log('Sample:');
for (let i = 0; i < 10; i++) { const r = rows[Math.floor((rows.length * (i + 0.5)) / 10)]; if (r) console.log('  ' + r.t.slice(0, 80)); }
console.log('Saved: i18n-src/strings.json');
