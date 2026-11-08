#!/usr/bin/env node
// Translates i18n-src/strings.json into public/i18n/<code>.json with the Gemini API (free tier is enough).
// Usage:  export GEMINI_API_KEY="..." ; node tools/i18n-translate.mjs hi --limit 600
//   --limit N   translate at most N new strings in this run, most frequent first (default 600)
//   --batch N   strings per request (default 40)
//   --delay MS  pause between requests (default 6000)
// Safe to stop and run again: finished strings are kept and skipped next time.
import fs from 'node:fs';
import path from 'node:path';

const LANGS = {
  hi: ['Hindi', 'Devanagari'], mr: ['Marathi', 'Devanagari'], ur: ['Urdu', 'Urdu (Perso-Arabic script, right-to-left)'],
  bn: ['Bengali', 'Bengali'], as: ['Assamese', 'Assamese'], brx: ['Bodo', 'Devanagari'], doi: ['Dogri', 'Devanagari'],
  gu: ['Gujarati', 'Gujarati'], kn: ['Kannada', 'Kannada'], ks: ['Kashmiri', 'Perso-Arabic'], kok: ['Konkani', 'Devanagari'],
  mai: ['Maithili', 'Devanagari'], ml: ['Malayalam', 'Malayalam'], mni: ['Manipuri (Meitei)', 'Meetei Mayek'],
  ne: ['Nepali', 'Devanagari'], or: ['Odia', 'Odia'], pa: ['Punjabi', 'Gurmukhi'], sa: ['Sanskrit', 'Devanagari'],
  sat: ['Santali', 'Ol Chiki'], sd: ['Sindhi', 'Perso-Arabic'], ta: ['Tamil', 'Tamil'], te: ['Telugu', 'Telugu']
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const args = process.argv.slice(2);
const code = (args[0] || '').toLowerCase();
const num = (name, def) => { const i = args.indexOf('--' + name); const v = i >= 0 ? Number(args[i + 1]) : NaN; return Number.isFinite(v) && v > 0 ? v : def; };
if (!LANGS[code]) { console.log('Use: node tools/i18n-translate.mjs <code> [--limit 600]\nCodes: ' + Object.keys(LANGS).join(' ')); process.exit(1); }
const LIMIT = num('limit', 600);
const BATCH = num('batch', 40);
const DELAY = num('delay', 6000);
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) { console.log('STOP: GEMINI_API_KEY set nahi hai.\nFree key: https://aistudio.google.com/apikey\nPhir: export GEMINI_API_KEY="..."'); process.exit(1); }
if (!fs.existsSync('i18n-src/strings.json')) { console.log('STOP: i18n-src/strings.json nahi hai. Pehle: node tools/i18n-extract.mjs'); process.exit(1); }

const all = JSON.parse(fs.readFileSync('i18n-src/strings.json', 'utf8'));
const outFile = path.join('public', 'i18n', code + '.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
let dict = {};
if (fs.existsSync(outFile)) { try { dict = JSON.parse(fs.readFileSync(outFile, 'utf8')); } catch (e) { dict = {}; } }
const todo = all.filter((s) => !(s.t in dict)).slice(0, LIMIT).map((s) => s.t);
console.log(`${LANGS[code][0]}: ${Object.keys(dict).length} pehle se, ${todo.length} naye is run me (source total ${all.length}).`);
if (!todo.length) { console.log('Kuch naya nahi bacha.'); process.exit(0); }

async function pickModel() {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  const cand = ['server.ts'];
  try { fs.readdirSync('lib').forEach((f) => { if (/\.tsx?$/.test(f)) cand.push('lib/' + f); }); } catch (e) { /* ignore */ }
  for (const f of cand) {
    try {
      const m = /FREE_AI_GENERATION_MODEL\s*=\s*['"]([^'"]+)['"]/.exec(fs.readFileSync(f, 'utf8'));
      if (m) return m[1];
    } catch (e) { /* ignore */ }
  }
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
  const j = await r.json();
  if (!r.ok) throw new Error('Models list fail: ' + JSON.stringify(j).slice(0, 300));
  const names = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => String(m.name).replace(/^models\//, ''));
  const flash = names.filter((n) => /flash/.test(n) && !/(lite|image|live|tts|exp|thinking|audio|8b|robotics|embedding)/.test(n)).sort().reverse();
  return flash[0] || names[0];
}

function buildPrompt(items) {
  const [name, script] = LANGS[code];
  return `You are a professional software localisation translator for Classtago, a school-management ERP used by Indian schools (Headmaster, Class Teacher, Clerk, Parent and Student portals).
Translate every UI string in the JSON array below from English into ${name} (${script}).

Rules:
1. Reply with ONLY a JSON array of strings: exactly ${items.length} items, in the same order as the input. No explanations.
2. Use simple, natural wording that school staff and parents in India actually use. Prefer the standard terms of state education departments. Keep button labels and menu items short.
3. Keep unchanged: numbers, dates, URLs, e-mail addresses, the placeholder {#}, and these names and abbreviations: Classtago, Edunixo, WhatsApp, Gemini, QR, PDF, SMS, OTP, GR, UDISE, Aadhaar, CSV, Excel, APK.
4. Keep the same punctuation, line breaks and capitalisation style as the source. Do not add quotation marks.
5. Some source strings are Hindi written in the English alphabet (Hinglish): translate their meaning into ${name}.
6. Terminology: Headmaster/Principal, Class Teacher, Clerk, Peon (office attendant), Student, Parent/Guardian, Admission, GR number (General Register number), Roll number, Division, Attendance (Present/Absent/Late), Fee, Receipt, Exam, Result, Mark list, Progress card, Timetable, Period, Leave, Notice, Certificate (Bonafide, Leaving Certificate), Library, Inventory, Payroll.

Input:
${JSON.stringify(items)}`;
}

let useSchema = true;
async function callGemini(model, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const generationConfig = { temperature: 0.1, responseMimeType: 'application/json' };
    if (useSchema) generationConfig.responseSchema = { type: 'ARRAY', items: { type: 'STRING' } };
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }], generationConfig }) });
    } catch (e) { console.log('  network error, dobara...'); await sleep(4000 * attempt); continue; }
    if (res.status === 429 || res.status >= 500) {
      const wait = res.status === 429 ? 65000 : 8000 * attempt;
      console.log(`  HTTP ${res.status}: ${Math.round(wait / 1000)}s ruk kar dobara`);
      await sleep(wait);
      continue;
    }
    const body = await res.text();
    if (!res.ok) {
      if (res.status === 400 && useSchema && /schema/i.test(body)) { useSchema = false; console.log('  schema support nahi, bina schema ke try'); continue; }
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const j = JSON.parse(body);
    const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    return parts ? parts.map((p) => p.text || '').join('') : '';
  }
  throw new Error('Gemini baar baar fail hua');
}

function parseArray(text) {
  let arr = null;
  try { arr = JSON.parse(text); } catch (e) {
    const m = String(text).match(/\[[\s\S]*\]/);
    if (m) { try { arr = JSON.parse(m[0]); } catch (e2) { arr = null; } }
  }
  if (arr && !Array.isArray(arr)) arr = Array.isArray(arr.translations) ? arr.translations : null;
  return arr;
}
async function translateBatch(model, items) {
  const arr = parseArray(await callGemini(model, buildPrompt(items)));
  if (arr && arr.length === items.length) return arr;
  if (items.length === 1) return [null];
  console.log(`  length mismatch (${arr ? arr.length : 'x'}/${items.length}), batch toda ja raha hai`);
  const mid = items.length >> 1;
  const a = await translateBatch(model, items.slice(0, mid));
  const b = await translateBatch(model, items.slice(mid));
  return a.concat(b);
}
const ph = (s) => (s.match(/\{#\}/g) || []).length;
function valid(src, tr) {
  if (typeof tr !== 'string') return false;
  const t = tr.trim();
  if (!t || t.length > src.length * 8 + 30) return false;
  if (ph(src) !== ph(t)) return false;
  if (/^```/.test(t)) return false;
  return true;
}
function save() {
  const keys = Object.keys(dict);
  const tmp = outFile + '.tmp';
  fs.writeFileSync(tmp, '{\n' + keys.map((k) => ' ' + JSON.stringify(k) + ': ' + JSON.stringify(dict[k])).join(',\n') + '\n}\n');
  fs.renameSync(tmp, outFile);
}

const model = await pickModel();
console.log('Model:', model);
const batches = [];
let cur = [];
let chars = 0;
for (const s of todo) {
  if (cur.length >= BATCH || chars + s.length > 5000) { batches.push(cur); cur = []; chars = 0; }
  cur.push(s);
  chars += s.length;
}
if (cur.length) batches.push(cur);

let done = 0;
let skipped = 0;
for (let i = 0; i < batches.length; i++) {
  const items = batches[i];
  let out;
  try { out = await translateBatch(model, items); }
  catch (e) { console.log('STOP: ' + (e && e.message)); save(); process.exit(1); }
  let ok = 0;
  items.forEach((src, k) => {
    const tr = out[k];
    if (valid(src, tr)) { dict[src] = String(tr).trim(); ok++; } else skipped++;
  });
  done += ok;
  save();
  console.log(`[${i + 1}/${batches.length}] ${ok}/${items.length} ok (is run me ${done}, total ${Object.keys(dict).length})`);
  if (i < batches.length - 1) await sleep(DELAY);
}
console.log(`Done. ${done} translated, ${skipped} skip hue. File: ${outFile}`);
const sample = Object.keys(dict).slice(0, 6);
sample.forEach((k) => console.log('  ' + k.slice(0, 40) + '  ->  ' + dict[k].slice(0, 50)));
