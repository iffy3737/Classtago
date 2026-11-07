import { saveNativeBlob } from "../lib/smartPrint";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ID_CARD_THEMES, ID_CARD_W_IN, ID_CARD_H_IN, renderIdCardCanvas } from "./IdCardCanvas";
import type { IdCardTheme } from "./IdCardCanvas";

type IdStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string; photoUrl: string | null };
type IdSchool = { name: string; address: string; logoUrl: string | null; signatureUrl: string | null; principalName: string };

const THEME_KEY = "classtago.idcard.theme";
const SIGN_KEY = "classtago.idcard.sign";
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
const classLabel = (s: IdStudent) => (s.className || "") + (divOf(s) ? "-" + divOf(s) : "");
const showClass = (l: string) => (l.toLowerCase().indexOf("class") === 0 ? l : "Class " + l);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export default function StudentIdCards() {
  const [data, setData] = useState<{ school: IdSchool; students: IdStudent[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [theme, setThemeState] = useState<IdCardTheme>(readTheme);
  const [useSign, setUseSignState] = useState<boolean>(readSign);
  const [previewId, setPreviewId] = useState("");
  const [previewErr, setPreviewErr] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);

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

  const students = data ? data.students : [];
  const groups = Array.from(new Set(students.map(classLabel))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const filtered = filter === "all" ? students : students.filter((s) => classLabel(s) === filter);
  const missingPhoto = filtered.filter((s) => !s.photoUrl).length;
  const previewStudent: IdStudent = filtered.find((s) => s.id === previewId) || filtered[0] || SAMPLE;

  const setTheme = (t: IdCardTheme) => {
    setThemeState(t);
    try { window.localStorage.setItem(THEME_KEY, t); } catch (e) { /* ignore */ }
  };
  const setSign = (v: boolean) => {
    setUseSignState(v);
    try { window.localStorage.setItem(SIGN_KEY, v ? "1" : "0"); } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (!data || loading) return;
    const el = previewRef.current;
    if (!el) return;
    let cancelled = false;
    (async () => {
      try {
        const st = previewStudent;
        const [photo, logo, sign] = await Promise.all([
          cachedDataUrl(st.photoUrl),
          cachedDataUrl(data.school.logoUrl),
          useSign ? cachedDataUrl(data.school.signatureUrl) : Promise.resolve(null)
        ]);
        const cv = await renderIdCardCanvas({ theme, student: st, schoolName: data.school.name, photo, logo, sign, dpi: 160 });
        if (cancelled) return;
        el.width = cv.width;
        el.height = cv.height;
        const g = el.getContext("2d");
        if (g) g.drawImage(cv, 0, 0);
        setPreviewErr("");
      } catch (e: any) {
        if (!cancelled) setPreviewErr(e && e.message ? e.message : "Preview could not be drawn.");
      }
    })();
    return () => { cancelled = true; };
  }, [data, loading, theme, useSign, previewStudent.id]);

  const makePdf = async (list: IdStudent[], filename: string) => {
    if (!data || !list.length || busy) return;
    setBusy(true);
    setError("");
    setProgress({ done: 0, total: list.length });
    try {
      const logo = await toDataUrl(data.school.logoUrl);
      const sign = useSign ? await toDataUrl(data.school.signatureUrl) : null;
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-black text-slate-900">Student ID Cards</div>
        <div className="text-xs text-slate-500">Cards admission data se apne aap banti hain (front side, 2.125 x 3.38 inch, A4 par 9 cards). Print karte waqt "Actual size / 100%" chunna, "Fit to page" nahi.</div>
        {error ? <div className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</div> : null}
        <div>
          <div className="mb-2 text-xs font-black text-slate-700">Card design</div>
          <div className="grid grid-cols-3 gap-2">
            {ID_CARD_THEMES.map((th) => (
              <button key={th.key} type="button" onClick={() => setTheme(th.key)} className={"rounded-lg border-2 px-2 py-2 text-xs font-black " + (theme === th.key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700")}>{th.label}</button>
            ))}
          </div>
          <div className="mt-3 flex justify-center rounded-xl bg-slate-100 p-3">
            <canvas ref={previewRef} width={340} height={541} style={{ width: "100%", maxWidth: 260, height: "auto", borderRadius: 12 }} />
          </div>
          <div className="mt-1 text-center text-[11px] text-slate-500">{"Preview: " + previewStudent.fullName + " (list me naam par tap karke badlo)"}</div>
          {previewErr ? <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{previewErr}</div> : null}
        </div>
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 text-xs text-slate-700">
          <input type="checkbox" checked={useSign} onChange={(e) => setSign(e.target.checked)} />
          <span className="flex-1">Card par headmaster signature chhapo</span>
          {data && data.school.signatureUrl ? <img src={data.school.signatureUrl} alt="" style={{ height: 36, maxWidth: 80, objectFit: "contain" }} /> : <span className="text-[11px] text-slate-400">image nahi hai</span>}
        </label>
        <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{"All classes (" + students.length + ")"}</option>
          {groups.map((g) => <option key={g} value={g}>{showClass(g)}</option>)}
        </select>
        {missingPhoto > 0 ? <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{missingPhoto + " student(s) ki photo admission me nahi mili. Un ke card par naam ke initials wala gola aayega."}</div> : null}
        <button type="button" disabled={busy || !filtered.length} onClick={() => makePdf(filtered, "id-cards-" + (filter === "all" ? "all" : filter) + ".pdf")} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-40">
          {busy ? "PDF ban rahi hai... " + (progress ? progress.done + "/" + progress.total : "") : "Download PDF (" + filtered.length + " cards)"}
        </button>
      </div>
      {!students.length ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Abhi koi student nahi hai. Admission confirm hone ke baad yahan card dikhega.</div> : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map((s) => (
            <div key={s.id} className={"flex items-center gap-3 p-3 " + (s.id === previewStudent.id ? "bg-indigo-50" : "")}>
              <button type="button" onClick={() => setPreviewId(s.id)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-bold text-slate-900">{s.fullName}</div>
                <div className="text-xs text-slate-500">{showClass(classLabel(s)) + " | GR " + s.grNumber + (s.photoUrl ? "" : " | photo missing")}</div>
              </button>
              <button type="button" disabled={busy} onClick={() => makePdf([s], "id-card-" + s.grNumber + ".pdf")} className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40">Card</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
