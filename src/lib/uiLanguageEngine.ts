/**
 * Classtago UI language engine.
 * 1) Sets <html lang / dir / data-script> so uiLanguage.css can adapt typography per script and layouts can mirror for RTL.
 * 2) Translates hard-coded English UI text at runtime from public/i18n/<code>.json
 *    (exact English source text -> translation). Text that is not in the dictionary is left untouched.
 * Nothing is sent to a server: dictionaries are static files shipped with the web app / APK.
 * Kill switch: localStorage 'edunixo.i18n_off' = '1' keeps lang/dir/typography but disables text translation.
 */
export type UiLanguageHint = { scriptCode?: string | null; direction?: string | null };

type Dict = Map<string, string>;
type TextState = Text & { __s?: string; __o?: string };
type AttrRec = { s: string; o: string };

const SCRIPT_BY_CODE: Record<string, string> = {
  en: 'latn',
  hi: 'deva', mr: 'deva', ne: 'deva', sa: 'deva', kok: 'deva', mai: 'deva', doi: 'deva', brx: 'deva',
  bn: 'beng', as: 'beng', gu: 'gujr', pa: 'guru', kn: 'knda', ml: 'mlym', or: 'orya', od: 'orya',
  ta: 'taml', te: 'telu', sat: 'olck', mni: 'mtei', ur: 'arab', ks: 'arab', sd: 'arab'
};
const RTL_SCRIPTS = new Set(['arab', 'hebr', 'thaa', 'syrc', 'adlm', 'nkoo']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP']);
const SKIP_CLOSEST = 'script,style,noscript,pre,code,kbd,samp,[translate="no"],[data-no-translate],[contenteditable="true"]';

const cache = new Map<string, Dict>();
const missing = new Map<string, number>();
let dict: Dict | null = null;
let activeCode = '';
let observer: MutationObserver | null = null;
let pending = new Set<Node>();
let raf = 0;
let seq = 0;
let dialogsPatched = false;

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

function noteMissing(core: string): void {
  if (core.length > 120) return;
  if (missing.size >= 4000 && !missing.has(core)) return;
  missing.set(core, (missing.get(core) || 0) + 1);
}

function lookup(core: string): string | null {
  if (!dict) return null;
  const hit = dict.get(core);
  if (hit !== undefined) return hit;
  if (/\d/.test(core)) {
    const nums: string[] = [];
    const shape = core.replace(/\S*\d\S*/g, (m) => { nums.push(m); return '{#}'; });
    const h2 = dict.get(shape);
    if (h2 !== undefined) {
      let i = 0;
      return h2.replace(/\{#\}/g, () => (i < nums.length ? nums[i++] : ''));
    }
  }
  return null;
}

function doText(node: Text): void {
  const t = node as TextState;
  const cur = node.nodeValue || '';
  if (t.__o !== undefined && cur === t.__o) return;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(cur);
  if (!m) return;
  const core = norm(m[2]);
  if (core.length < 2 || !/[A-Za-z]/.test(core)) return;
  const p = node.parentElement;
  if (!p || p.tagName === 'TEXTAREA' || p.closest(SKIP_CLOSEST)) return;
  const out = lookup(core);
  if (out === null) { noteMissing(core); return; }
  t.__s = cur;
  t.__o = m[1] + out + m[3];
  node.nodeValue = t.__o;
}

function doAttrs(el: Element): void {
  let any = false;
  for (const a of ATTRS) { if (el.hasAttribute(a)) { any = true; break; } }
  if (!any) return;
  if (el.closest('[translate="no"],[data-no-translate]')) return;
  const holder = el as any;
  const store: Record<string, AttrRec> = holder.__a || (holder.__a = {});
  for (const a of ATTRS) {
    const cur = el.getAttribute(a);
    if (cur === null) continue;
    const rec = store[a];
    if (rec && rec.o === cur) continue;
    const core = norm(cur);
    if (core.length < 2 || !/[A-Za-z]/.test(core)) continue;
    const out = lookup(core);
    if (out === null) { noteMissing(core); continue; }
    store[a] = { s: cur, o: out };
    el.setAttribute(a, out);
  }
}

function walk(root: Node): void {
  if (root.nodeType === 3) { doText(root as Text); return; }
  if (root.nodeType === 1) {
    const el = root as Element;
    if (SKIP_TAGS.has(el.tagName)) return;
    doAttrs(el);
  } else if (root.nodeType !== 11 && root.nodeType !== 9) {
    return;
  }
  const walker = document.createTreeWalker(root, 1 | 4, {
    acceptNode: (n: Node) => (n.nodeType === 1 && SKIP_TAGS.has((n as Element).tagName) ? 2 : 1)
  } as any);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === 3) doText(n as Text); else doAttrs(n as Element);
    n = walker.nextNode();
  }
}

function flush(): void {
  raf = 0;
  const batch = Array.from(pending);
  pending = new Set<Node>();
  let i = 0;
  const step = () => {
    try {
      const t0 = performance.now();
      while (i < batch.length) {
        walk(batch[i++]);
        if (i < batch.length && performance.now() - t0 > 12) { requestAnimationFrame(step); return; }
      }
    } catch (e) {
      stopObserver();
    }
  };
  step();
}

function startObserver(): void {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'childList') r.addedNodes.forEach((n) => pending.add(n));
      else pending.add(r.target);
    }
    if (!raf && pending.size) raf = requestAnimationFrame(flush);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

function stopObserver(): void {
  if (observer) { observer.disconnect(); observer = null; }
  pending = new Set<Node>();
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
}

function restoreAll(): void {
  const walker = document.createTreeWalker(document.documentElement, 1 | 4);
  let n: Node | null = walker.nextNode();
  while (n) {
    if (n.nodeType === 3) {
      const t = n as TextState;
      if (t.__o !== undefined) {
        if (t.__s !== undefined && t.nodeValue === t.__o) t.nodeValue = t.__s;
        t.__o = undefined;
        t.__s = undefined;
      }
    } else {
      const el = n as any;
      const a = el.__a as Record<string, AttrRec> | undefined;
      if (a) {
        for (const k of Object.keys(a)) {
          if ((n as Element).getAttribute(k) === a[k].o) (n as Element).setAttribute(k, a[k].s);
        }
        el.__a = undefined;
      }
    }
    n = walker.nextNode();
  }
}

function patchDialogs(): void {
  if (dialogsPatched || typeof window === 'undefined') return;
  dialogsPatched = true;
  const tx = (m: any) => {
    if (typeof m !== 'string' || !dict) return m;
    const out = lookup(norm(m));
    return out === null ? m : out;
  };
  for (const name of ['alert', 'confirm', 'prompt']) {
    const orig = (window as any)[name];
    if (typeof orig !== 'function') continue;
    (window as any)[name] = function (message?: any, ...rest: any[]) { return orig.call(window, tx(message), ...rest); };
  }
}

async function loadDict(code: string): Promise<Dict | null> {
  try {
    const res = await fetch(new URL('i18n/' + code + '.json', document.baseURI).toString());
    if (!res.ok) return null;
    const json: any = await res.json();
    if (!json || typeof json !== 'object') return null;
    const m: Dict = new Map();
    for (const k of Object.keys(json)) {
      const v = json[k];
      if (typeof v === 'string' && v && k.charAt(0) !== '_') m.set(k, v);
    }
    return m;
  } catch (e) {
    return null;
  }
}

export async function applyUiLanguage(code: string, hint?: UiLanguageHint): Promise<void> {
  if (typeof document === 'undefined') return;
  const base = String(code || 'en').toLowerCase().split(/[-_]/)[0] || 'en';
  const hs = String((hint && hint.scriptCode) || '').toLowerCase();
  const script = hs && hs !== 'zyyy' && hs !== 'zzzz' ? hs : (SCRIPT_BY_CODE[base] || 'latn');
  const dh = String((hint && hint.direction) || '').toLowerCase();
  const rtl = dh === 'rtl' || (dh !== 'ltr' && RTL_SCRIPTS.has(script));
  const root = document.documentElement;
  root.lang = base;
  root.dir = rtl ? 'rtl' : 'ltr';
  root.setAttribute('data-script', script);
  root.setAttribute('data-ui-lang', base);
  const my = ++seq;
  let off = false;
  try { off = window.localStorage.getItem('edunixo.i18n_off') === '1'; } catch (e) { off = false; }
  if (base === 'en' || off) {
    stopObserver();
    restoreAll();
    dict = null;
    activeCode = base;
    return;
  }
  if (base === activeCode && dict) return;
  try {
    let d = cache.get(base) || null;
    if (!d) {
      d = await loadDict(base);
      if (my !== seq) return;
      if (d) cache.set(base, d);
    }
    stopObserver();
    restoreAll();
    dict = d && d.size ? d : null;
    activeCode = base;
    if (!dict) return;
    patchDialogs();
    walk(document.body);
    startObserver();
  } catch (e) {
    stopObserver();
    try { restoreAll(); } catch (e2) { /* ignore */ }
    dict = null;
  }
}

export function getMissingUiText(limit = 300): { text: string; count: number }[] {
  return Array.from(missing.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([text, count]) => ({ text, count }));
}

export function bootUiLanguage(): void {
  try {
    const code = (typeof localStorage !== 'undefined' && localStorage.getItem('edunixo.interface_language')) || 'en';
    (window as any).__edxI18n = { missing: getMissingUiText, language: () => activeCode };
    void applyUiLanguage(code);
  } catch (e) { /* ignore */ }
}
