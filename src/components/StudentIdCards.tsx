import { saveNativeBlob } from "../lib/smartPrint";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { IdCardFace, ID_CARD_THEMES } from "./IdCardFaces";
import type { IdCardTheme } from "./IdCardFaces";

type IdStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string; photoUrl: string | null };
type IdSchool = { name: string; address: string; logoUrl: string | null; signatureUrl: string | null; principalName: string };
type Imgs = { photos: Record<string, string | null>; logo: string | null; sign: string | null };

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

const classLabel = (s: IdStudent) => s.className + (s.division ? "-" + s.division : "");
const showClass = (l: string) => (l.toLowerCase().indexOf("class") === 0 ? l : "Class " + l);

export default function StudentIdCards() {
  const [data, setData] = useState<{ school: IdSchool; students: IdStudent[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<{ students: IdStudent[]; imgs: Imgs } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [theme, setThemeState] = useState<IdCardTheme>(() => {
    try {
      const v = window.localStorage.getItem("classtago.idcard.theme");
      if (v === "candy" || v === "sunshine" || v === "violet") return v;
    } catch (e) { /* ignore */ }
    return "candy";
  });
  const setTheme = (t: IdCardTheme) => {
    setThemeState(t);
    try { window.localStorage.setItem("classtago.idcard.theme", t); } catch (e) { /* ignore */ }
  };

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
  const previewStudent: IdStudent = filtered[0] || { id: "sample", grNumber: "1001", fullName: "Student Name", className: "Class 6", division: "A", dob: "2015-01-01", mobile: "9876543210", address: "Village, Taluka, District", photoUrl: null };

  const makePdf = async (list: IdStudent[], filename: string) => {
    if (!data || !list.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const entries = await Promise.all(list.map(async (s) => [s.id, await toDataUrl(s.photoUrl)] as [string, string | null]));
      const photos: Record<string, string | null> = {};
      entries.forEach((e) => { photos[e[0]] = e[1]; });
      const logo = await toDataUrl(data.school.logoUrl);
      const sign = await toDataUrl(data.school.signatureUrl);
      setJob({ students: list, imgs: { photos, logo, sign } });
      await new Promise((r) => setTimeout(r, 700));
      const el = sheetRef.current;
      if (!el) throw new Error("Card sheet could not be prepared.");
      const mod: any = await import("html2pdf.js");
      const html2pdf = mod.default || mod;
      const blob: Blob = await html2pdf().set({
        margin: 0.3,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css"] }
      }).from(el).outputPdf("blob");
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
      setJob(null);
      setBusy(false);
    }
  };

  const pages: IdStudent[][] = [];
  if (job) { for (let i = 0; i < job.students.length; i += 9) pages.push(job.students.slice(i, i + 9)); }

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading ID card data...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-black text-slate-900">Student ID Cards</div>
        <div className="text-xs text-slate-500">Cards admission data se apne aap banti hain (front side, 2.13 x 3.37 inch, A4 par 9 cards).</div>
        {error ? <div className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</div> : null}
        <div>
          <div className="mb-2 text-xs font-black text-slate-700">Card design</div>
          <div className="grid grid-cols-3 gap-2">
            {ID_CARD_THEMES.map((th) => (
              <button key={th.key} type="button" onClick={() => setTheme(th.key)} className={"rounded-lg border-2 px-2 py-2 text-xs font-black " + (theme === th.key ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700")}>{th.label}</button>
            ))}
          </div>
          <div className="mt-3 flex justify-center rounded-xl bg-slate-100 p-3">
            <IdCardFace theme={theme} student={previewStudent} schoolName={data ? data.school.name : ""} photo={previewStudent.photoUrl} logo={data ? data.school.logoUrl : null} sign={data ? data.school.signatureUrl : null} widthIn={2.5} />
          </div>
          <div className="mt-1 text-center text-[11px] text-slate-500">{"Preview: " + previewStudent.fullName}</div>
        </div>
        <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{"All classes (" + students.length + ")"}</option>
          {groups.map((g) => <option key={g} value={g}>{showClass(g)}</option>)}
        </select>
        {missingPhoto > 0 ? <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{missingPhoto + " student(s) ki photo admission me nahi mili. Un ke card par naam ke initials wala gola aayega."}</div> : null}
        <button type="button" disabled={busy || !filtered.length} onClick={() => makePdf(filtered, "id-cards-" + (filter === "all" ? "all" : filter) + ".pdf")} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-black text-white disabled:opacity-40">
          {busy ? "PDF ban rahi hai..." : "Download PDF (" + filtered.length + " cards)"}
        </button>
      </div>
      {!students.length ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Abhi koi student nahi hai. Admission confirm hone ke baad yahan card dikhega.</div> : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-900">{s.fullName}</div>
                <div className="text-xs text-slate-500">{showClass(classLabel(s)) + " | GR " + s.grNumber + (s.photoUrl ? "" : " | photo missing")}</div>
              </div>
              <button type="button" disabled={busy} onClick={() => makePdf([s], "id-card-" + s.grNumber + ".pdf")} className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40">Card</button>
            </div>
          ))}
        </div>
      )}
      {job && data ? (
        <div style={{ position: "fixed", left: "-10000px", top: 0, width: "7.67in", background: "#ffffff" }}>
          <div ref={sheetRef}>
            {pages.map((page, pi) => (
              <div key={pi} style={{ width: "7.67in", display: "grid", gridTemplateColumns: "repeat(3, 2.13in)", gap: "0.1in", justifyContent: "center", alignContent: "start", pageBreakAfter: pi < pages.length - 1 ? "always" : "auto" }}>
                {page.map((s) => <IdCardFace key={s.id} theme={theme} student={s} schoolName={data.school.name} photo={job.imgs.photos[s.id]} logo={job.imgs.logo} sign={job.imgs.sign} widthIn={2.13} />)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
