import { saveNativeBlob } from "../lib/smartPrint";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";
import { ID_CARD_THEMES, ID_CARD_W_IN, ID_CARD_H_IN, renderIdCardCanvas } from "./IdCardCanvas";
import type { IdCardTheme } from "./IdCardCanvas";

type IdStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string; photoUrl: string | null };
type IdSchool = { name: string; address: string; logoUrl: string | null; signatureUrl: string | null; principalName: string };
type Group = { label: string; students: IdStudent[]; missing: number };
type Thumb = { student: IdStudent; photo: string | null; logo: string | null; sign: string | null };

const THEME_KEY = "classtago.idcard.theme";
const SIGN_KEY = "classtago.idcard.sign";
const SIGN_IMG_KEY = "classtago.idcard.signimg.";
const SAMPLE: IdStudent = { id: "sample", grNumber: "1001", fullName: "Student Name", className: "Class 6", division: "A", dob: "2015-01-01", mobile: "9876543210", address: "Village, Taluka, District", photoUrl: null };

const readTheme = (): IdCardTheme => {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === "candy" || v === "sunshine" || v === "violet") return v;
  } catch (e) { /* ignore */ }
  return "candy";
};
const readSign = (): boolean => {
  try { return window.localStorage.getItem(SIGN_KEY) !== "0"; } catch (e) { return true; }
};

const toDataUrl = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  if (url.indexOf("data:") === 0) return url;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise<string | null>((res) => {
      const fr = new FileReader();
      fr.onloadend = () => res(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch (e) {
    return null;
  }
};

const assetCache = new Map<string, string | null>();
const cachedDataUrl = async (url: string | null): Promise<string | null> => {
  if (!url) return null;
  if (assetCache.has(url)) return assetCache.get(url) || null;
  const v = await toDataUrl(url);
  assetCache.set(url, v);
  return v;
};

const divOf = (s: IdStudent): string => (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s.division || "") ? "" : s.division || "");
const classLabel = (s: IdStudent): string => (s.className || "") + (divOf(s) ? "-" + divOf(s) : "");
const showClass = (l: string): string => (l.toLowerCase().indexOf("class") === 0 ? l : "Class " + l);
const safeName = (s: string): string => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "cards";
const initialsOf = (n: string): string => {
  const w = (n || "").trim().split(/\s+/).filter(Boolean);
  return ((w[0] || "").charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : "")).toUpperCase() || "?";
};
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

const fileToImage = (f: File): Promise<HTMLImageElement> =>
  new Promise((res, rej) => {
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Image khul nahi payi. JPG ya PNG file chuno.")); };
    im.src = url;
  });

async function prepareSignature(f: File): Promise<string> {
  const im = await fileToImage(f);
  const iw = im.naturalWidth || im.width;
  const ih = im.naturalHeight || im.height;
  if (!iw || !ih) throw new Error("Image khaali lag rahi hai.");
  const k = Math.min(1, 1400 / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * k));
  const h = Math.max(1, Math.round(ih * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("Is device par image process nahi ho sakti.");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.drawImage(im, 0, 0, w, h);
  let x0 = 0;
  let y0 = 0;
  let x1 = w;
  let y1 = h;
  try {
    const px = g.getImageData(0, 0, w, h);
    const d = px.data;
    const hist = new Array<number>(256).fill(0);
    for (let p = 0; p < d.length; p += 4) hist[Math.round(d[p] * 0.299 + d[p + 1] * 0.587 + d[p + 2] * 0.114)]++;
    let acc = 0;
    let paper = 255;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= w * h * 0.7) { paper = v; break; }
    }
    const gain = paper > 60 ? Math.min(2.2, 255 / paper) : 1;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let ink = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const r = Math.min(255, d[p] * gain);
        const gr = Math.min(255, d[p + 1] * gain);
        const b = Math.min(255, d[p + 2] * gain);
        const l = r * 0.299 + gr * 0.587 + b * 0.114;
        const t = l >= 235 ? 1 : l <= 150 ? 0 : (l - 150) / 85;
        d[p] = r + (255 - r) * t;
        d[p + 1] = gr + (255 - gr) * t;
        d[p + 2] = b + (255 - b) * t;
        if (l < 190) {
          ink++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    g.putImageData(px, 0, 0);
    if (ink > 30 && maxX > minX && maxY > minY) {
      const pad = Math.max(6, Math.round(0.05 * Math.max(maxX - minX, maxY - minY)));
      x0 = Math.max(0, minX - pad);
      y0 = Math.max(0, minY - pad);
      x1 = Math.min(w, maxX + pad + 1);
      y1 = Math.min(h, maxY + pad + 1);
    }
  } catch (e) { /* pixel access unavailable: keep the whole image */ }
  const cw = x1 - x0;
  const ch = y1 - y0;
  const s = Math.min(1, 900 / cw, 300 / ch);
  const o = document.createElement("canvas");
  o.width = Math.max(1, Math.round(cw * s));
  o.height = Math.max(1, Math.round(ch * s));
  const og = o.getContext("2d");
  if (!og) throw new Error("Is device par image process nahi ho sakti.");
  og.fillStyle = "#ffffff";
  og.fillRect(0, 0, o.width, o.height);
  og.imageSmoothingEnabled = true;
  og.imageSmoothingQuality = "high";
  og.drawImage(c, x0, y0, cw, ch, 0, 0, o.width, o.height);
  return o.toDataURL("image/jpeg", 0.92);
}

function ThemeTile({ k, label, active, onPick, base, schoolName }: { k: IdCardTheme; label: string; active: boolean; onPick: () => void; base: Thumb | null; schoolName: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sid = base ? base.student.id : "";
  const bp = base ? base.photo : null;
  const bl = base ? base.logo : null;
  const bs = base ? base.sign : null;
  useEffect(() => {
    if (!base) return;
    let dead = false;
    (async () => {
      try {
        const cv = await renderIdCardCanvas({ theme: k, student: base.student, schoolName, photo: bp, logo: bl, sign: bs, dpi: 80 });
        const el = ref.current;
        if (dead || !el) return;
        el.width = cv.width;
        el.height = cv.height;
        const g = el.getContext("2d");
        if (g) g.drawImage(cv, 0, 0);
      } catch (e) { /* thumbnail is optional */ }
    })();
    return () => { dead = true; };
  }, [k, sid, schoolName, bp, bl, bs]);
  return (
    <button type="button" onClick={onPick} className={"rounded-xl border-2 p-2 " + (active ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white")}>
      <canvas ref={ref} width={170} height={271} style={{ width: "100%", height: "auto", borderRadius: 6, background: "#f1f5f9" }} />
      <div className={"mt-1 text-xs font-black " + (active ? "text-indigo-700" : "text-slate-700")}>{label}</div>
    </button>
  );
}

export default function StudentIdCards() {
  const [data, setData] = useState<{ school: IdSchool; students: IdStudent[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [theme, setThemeState] = useState<IdCardTheme>(readTheme);
  const [useSign, setUseSignState] = useState<boolean>(readSign);
  const [customSign, setCustomSign] = useState<string | null>(null);
  const [signMsg, setSignMsg] = useState("");
  const [openClass, setOpenClass] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewErr, setPreviewErr] = useState("");
  const [photoState, setPhotoState] = useState<"loading" | "ok" | "none" | "failed">("loading");
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session ? session.data.session.access_token : "";
        if (!token) throw new Error("Session expired. Sign in again.");
        const r = await fetch("/api/id-cards/students", { headers: { Authorization: "Bearer " + token } });
        const p = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(p.error || "ID card data could not be loaded.");
        if (!cancelled) setData(p);
      } catch (e: any) {
        if (!cancelled) setError(e && e.message ? e.message : "ID card data could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const students: IdStudent[] = data ? data.students : [];
  const groups: Group[] = (() => {
    const m = new Map<string, IdStudent[]>();
    students.forEach((s) => {
      const key = classLabel(s) || "-";
      const arr = m.get(key);
      if (arr) arr.push(s); else m.set(key, [s]);
    });
    const out: Group[] = [];
    m.forEach((list, label) => out.push({ label, students: list, missing: list.filter((s) => !s.photoUrl).length }));
    out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    return out;
  })();
  const current: Group | null = openClass ? groups.find((g) => g.label === openClass) || null : null;
  const classStudents: IdStudent[] = current ? current.students : [];
  const previewStudent: IdStudent | null = previewIdx !== null && classStudents[previewIdx] ? classStudents[previewIdx] : null;
  const schoolSign: string | null = data ? data.school.signatureUrl : null;
  const signSrc: string | null = customSign || schoolSign;
  const pid = previewStudent ? previewStudent.id : "";

  const setTheme = (t: IdCardTheme) => {
    setThemeState(t);
    try { window.localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignore */ }
  };
  const setSign = (v: boolean) => {
    setUseSignState(v);
    try { window.localStorage.setItem(SIGN_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!data) return;
    try {
      const v = window.localStorage.getItem(SIGN_IMG_KEY + data.school.name);
      setCustomSign(v && v.indexOf("data:image/") === 0 ? v : null);
    } catch (e) { setCustomSign(null); }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    let dead = false;
    (async () => {
      const st = data.students.find((s) => s.photoUrl) || data.students[0] || SAMPLE;
      const [photo, logo, sign] = await Promise.all([
        cachedDataUrl(st.photoUrl),
        cachedDataUrl(data.school.logoUrl),
        useSign ? cachedDataUrl(signSrc) : Promise.resolve(null)
      ]);
      if (!dead) setThumb({ student: st, photo, logo, sign });
    })();
    return () => { dead = true; };
  }, [data, useSign, signSrc]);

  useEffect(() => {
    if (!data || !previewStudent) return;
    const el = previewRef.current;
    if (!el) return;
    let dead = false;
    setPhotoState("loading");
    (async () => {
      try {
        const st = previewStudent;
        const [photo, logo, sign] = await Promise.all([
          cachedDataUrl(st.photoUrl),
          cachedDataUrl(data.school.logoUrl),
          useSign ? cachedDataUrl(signSrc) : Promise.resolve(null)
        ]);
        const cv = await renderIdCardCanvas({ theme, student: st, schoolName: data.school.name, photo, logo, sign, dpi: 180 });
        if (dead) return;
        el.width = cv.width;
        el.height = cv.height;
        const g = el.getContext("2d");
        if (g) g.drawImage(cv, 0, 0);
        setPhotoState(!st.photoUrl ? "none" : photo ? "ok" : "failed");
        setPreviewErr("");
      } catch (e: any) {
        if (!dead) setPreviewErr(e && e.message ? e.message : "Preview could not be drawn.");
      }
    })();
    return () => { dead = true; };
  }, [data, pid, theme, useSign, signSrc]);

  useEffect(() => {
    if (!previewStudent) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [previewStudent !== null]);

  const onSignFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f || !data) return;
    setSignMsg("Signature taiyar ho rahi hai...");
    try {
      if (f.type && f.type.indexOf("image/") !== 0) throw new Error("Sirf image file (JPG ya PNG) chuno.");
      const url = await prepareSignature(f);
      try { window.localStorage.setItem(SIGN_IMG_KEY + data.school.name, url); } catch (err) { throw new Error("Signature save nahi ho payi (browser storage full ya band hai)."); }
      setCustomSign(url);
      setSign(true);
      setSignMsg("Signature save ho gayi. Ye sirf is phone/browser me save hai.");
    } catch (err: any) {
      setSignMsg(err && err.message ? err.message : "Signature upload nahi ho payi.");
    }
  };
  const removeSign = () => {
    if (!data) return;
    try { window.localStorage.removeItem(SIGN_IMG_KEY + data.school.name); } catch (e) { /* ignore */ }
    setCustomSign(null);
    setSignMsg("Upload ki hui signature hata di.");
  };

  const makePdf = async (list: IdStudent[], filename: string) => {
    if (!data || !list.length || busy) return;
    setBusy(true);
    setError("");
    setProgress({ done: 0, total: list.length });
    try {
      const logo = await toDataUrl(data.school.logoUrl);
      const sign = useSign ? await toDataUrl(signSrc) : null;
      const mod: any = await import("jspdf");
      const JsPDF = mod.jsPDF || mod.default;
      const pdf = new JsPDF({ unit: "in", format: "a4", orientation: "portrait", compress: true });
      const pw: number = pdf.internal.pageSize.getWidth();
      const ph: number = pdf.internal.pageSize.getHeight();
      const gap = 0.1;
      const gx = (pw - (3 * ID_CARD_W_IN + 2 * gap)) / 2;
      const gy = (ph - (3 * ID_CARD_H_IN + 2 * gap)) / 2;
      const canvas = document.createElement("canvas");
      const ahead = new Map<number, Promise<string | null>>();
      const want = (k: number) => { if (k < list.length && !ahead.has(k)) ahead.set(k, toDataUrl(list[k].photoUrl)); };
      for (let k = 0; k < 4; k++) want(k);
      for (let i = 0; i < list.length; i++) {
        want(i + 4);
        const photo = await (ahead.get(i) as Promise<string | null>);
        ahead.delete(i);
        await renderIdCardCanvas({ theme, student: list[i], schoolName: data.school.name, photo, logo, sign, dpi: 300 }, canvas);
        const slot = i % 9;
        if (i > 0 && slot === 0) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", gx + (slot % 3) * (ID_CARD_W_IN + gap), gy + Math.floor(slot / 3) * (ID_CARD_H_IN + gap), ID_CARD_W_IN, ID_CARD_H_IN, undefined, "FAST");
        setProgress({ done: i + 1, total: list.length });
        await tick();
      }
      const blob: Blob = pdf.output("blob");
      if (await saveNativeBlob(blob, filename, "application/pdf")) return;
      const file = new File([blob], filename, { type: "application/pdf" });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try { await nav.share({ files: [file], title: filename }); return; } catch (e) { /* fall back to download */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e: any) {
      setError(e && e.message ? e.message : "PDF could not be created.");
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading ID card data...</div>;

  const themeLabel = (ID_CARD_THEMES.find((t) => t.key === theme) || ID_CARD_THEMES[0]).label;
  const busyText = "PDF ban rahi hai... " + (progress ? progress.done + "/" + progress.total : "");
  const photoNote = photoState === "ok" ? "Photo admission se li gayi hai." : photoState === "none" ? "Is student ki photo admission me nahi mili, isliye initials dikh rahe hain." : photoState === "failed" ? "Photo load nahi ho payi. Page refresh karke dobara try karo." : "";
  const errBox = error ? <div className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</div> : null;
  const busyBox = busy ? <div className="rounded-lg bg-indigo-50 p-2 text-xs font-bold text-indigo-700">{busyText}</div> : null;

  const signBlock = (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
      <label className="flex items-center gap-3 text-xs text-slate-700">
        <input type="checkbox" checked={useSign} onChange={(e) => setSign(e.target.checked)} />
        <span className="flex-1">Card par headmaster signature chhapo</span>
      </label>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
          {signSrc ? <img src={signSrc} alt="" style={{ maxHeight: 44, maxWidth: 104, objectFit: "contain" }} /> : <span className="px-1 text-center text-[11px] text-slate-400">signature nahi hai</span>}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <button type="button" onClick={() => { if (fileRef.current) fileRef.current.click(); }} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">Signature upload</button>
          {customSign ? <button type="button" onClick={removeSign} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">Hatao</button> : null}
        </div>
      </div>
      <div className="text-[11px] text-slate-500">{customSign ? "Upload ki hui signature use ho rahi hai. Ye sirf is phone/browser me save hai." : schoolSign ? "School profile wali signature use ho rahi hai." : "Abhi koi signature nahi hai."}</div>
      <div className="text-[11px] text-slate-400">Tip: safed kagaz par pen se sign karke seedhi roshni me photo lo. Faltu safed hissa apne aap kat jata hai.</div>
      {signMsg ? <div className="rounded-lg bg-slate-50 p-2 text-[11px] font-bold text-slate-700">{signMsg}</div> : null}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onSignFile} />
    </div>
  );

  const mainView = (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-black text-slate-900">Student ID Cards</div>
        <div className="text-xs text-slate-500">Class chuno, phir student par tap karke card dekho. Print karte waqt "Actual size / 100%" chunna.</div>
        {errBox}
        {busyBox}
        <div>
          <div className="mb-2 text-xs font-black text-slate-700">Card design</div>
          <div className="grid grid-cols-3 gap-2">
            {ID_CARD_THEMES.map((th) => <ThemeTile key={th.key} k={th.key} label={th.label} active={theme === th.key} onPick={() => setTheme(th.key)} base={thumb} schoolName={data ? data.school.name : ""} />)}
          </div>
        </div>
        {signBlock}
      </div>
      {!students.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Abhi koi student nahi hai. Admission confirm hone ke baad yahan card dikhega.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((g) => (
              <div key={g.label} className="rounded-2xl border border-slate-200 bg-white p-3">
                <button type="button" onClick={() => { setOpenClass(g.label); setPreviewIdx(null); window.scrollTo(0, 0); }} className="block w-full text-left">
                  <div className="text-lg font-black text-slate-900">{showClass(g.label)}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{g.students.length + " students"}</div>
                  <div className={"mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold " + (g.missing > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>{g.missing > 0 ? g.missing + " photo missing" : "Sab photos hain"}</div>
                  <div className="mt-2 text-xs font-black text-indigo-700">Students dekho</div>
                </button>
                <button type="button" disabled={busy} onClick={() => makePdf(g.students, "id-cards-" + safeName(g.label) + ".pdf")} className="mt-3 w-full rounded-lg bg-indigo-600 px-2 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? "Ruko..." : "PDF download"}</button>
              </div>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => makePdf(students, "id-cards-all.pdf")} className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-black text-indigo-700 disabled:opacity-40">{"Saari classes ka PDF (" + students.length + " cards)"}</button>
        </>
      )}
    </div>
  );

  const classView = current ? (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <button type="button" onClick={() => { setOpenClass(null); setPreviewIdx(null); }} className="text-xs font-black text-indigo-700">{"< Saari classes"}</button>
        <div>
          <div className="text-base font-black text-slate-900">{showClass(current.label)}</div>
          <div className="text-xs text-slate-500">{current.students.length + " students | design: " + themeLabel + " | signature " + (useSign ? "on" : "off")}</div>
        </div>
        {errBox}
        {busyBox}
        {current.missing > 0 ? <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{current.missing + " student(s) ki photo admission me nahi mili. Un ke card par initials wala gola aayega."}</div> : null}
        <button type="button" disabled={busy} onClick={() => makePdf(current.students, "id-cards-" + safeName(current.label) + ".pdf")} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-40">{"Download PDF (" + current.students.length + " cards)"}</button>
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {classStudents.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-3 p-3">
            <button type="button" onClick={() => setPreviewIdx(idx)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xs font-black text-indigo-700">
                {initialsOf(s.fullName)}
                {s.photoUrl ? <img src={s.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">{s.fullName}</span>
                <span className="block text-xs text-slate-500">{"GR " + s.grNumber + (s.photoUrl ? "" : " | photo missing")}</span>
              </span>
            </button>
            <button type="button" disabled={busy} onClick={() => makePdf([s], "id-card-" + safeName(s.grNumber) + ".pdf")} className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40">PDF</button>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const modal = previewStudent && previewIdx !== null ? (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setPreviewIdx(null)}>
      <div className="max-h-[94vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-slate-900">{previewStudent.fullName}</div>
            <div className="text-xs text-slate-500">{showClass(classLabel(previewStudent)) + " | GR " + previewStudent.grNumber}</div>
          </div>
          <button type="button" onClick={() => setPreviewIdx(null)} className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700">Band karo</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ID_CARD_THEMES.map((th) => (
            <button key={th.key} type="button" onClick={() => setTheme(th.key)} className={"rounded-lg border-2 px-2 py-2 text-xs font-black " + (theme === th.key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700")}>{th.label}</button>
          ))}
        </div>
        <div className="flex justify-center rounded-xl bg-slate-100 p-3">
          <canvas ref={previewRef} width={340} height={541} style={{ width: "100%", maxWidth: 270, height: "auto", borderRadius: 12 }} />
        </div>
        {photoNote ? <div className="text-center text-[11px] text-slate-500">{photoNote}</div> : null}
        {previewErr ? <div className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{previewErr}</div> : null}
        {errBox}
        <div className="flex items-center gap-2">
          <button type="button" disabled={previewIdx <= 0} onClick={() => setPreviewIdx(previewIdx - 1)} className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Pichla</button>
          <div className="w-16 text-center text-xs font-black text-slate-600">{(previewIdx + 1) + " / " + classStudents.length}</div>
          <button type="button" disabled={previewIdx >= classStudents.length - 1} onClick={() => setPreviewIdx(previewIdx + 1)} className="flex-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40">Agla</button>
        </div>
        <button type="button" disabled={busy} onClick={() => makePdf([previewStudent], "id-card-" + safeName(previewStudent.grNumber) + ".pdf")} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? busyText : "Is card ka PDF"}</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {classView || mainView}
      {modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
