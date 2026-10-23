import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";

type IdStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string; photoUrl: string | null };
type IdSchool = { name: string; address: string; logoUrl: string | null; signatureUrl: string | null; principalName: string };
type Imgs = { photos: Record<string, string | null>; logo: string | null; sign: string | null };

const ACCENT = "#4f46e5";

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

const fmtDob = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
  return m ? m[3] + "/" + m[2] + "/" + m[1] : d || "";
};

const classLabel = (s: IdStudent) => s.className + (s.division ? "-" + s.division : "");

function IdCard({ s, school, imgs }: { s: IdStudent; school: IdSchool; imgs: Imgs }) {
  const photo = imgs.photos[s.id];
  const row = (label: string, value: string) => (
    <div style={{ display: "flex", fontSize: "6.5px", lineHeight: "0.15in" }}>
      <b style={{ width: "0.4in", flexShrink: 0 }}>{label}</b>
      <span>{": " + value}</span>
    </div>
  );
  return (
    <div style={{ position: "relative", width: "2.13in", height: "3.37in", overflow: "hidden", background: "#ffffff", border: "0.01in solid #cbd5e1", fontFamily: "Arial, sans-serif", boxSizing: "border-box", color: "#0f172a" }}>
      <div style={{ position: "absolute", left: "-0.2in", right: "-0.2in", top: "-0.1in", height: "0.8in", background: ACCENT, borderRadius: "0 0 50% 50% / 0 0 35% 35%" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: "0.06in", textAlign: "center", color: "#ffffff", padding: "0 0.1in" }}>
        {imgs.logo ? <img src={imgs.logo} alt="" style={{ height: "0.2in", display: "block", margin: "0 auto 0.02in" }} /> : null}
        <div style={{ fontSize: "7.5px", fontWeight: 800, lineHeight: 1.1 }}>{school.name}</div>
      </div>
      <div style={{ position: "absolute", left: "50%", marginLeft: "-0.4in", top: "0.54in", width: "0.8in", height: "0.8in", borderRadius: "50%", border: "0.04in solid #ffffff", boxShadow: "0 0 0 0.02in " + ACCENT, overflow: "hidden", background: "#e2e8f0" }}>
        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </div>
      <div style={{ position: "absolute", left: "0.1in", right: "0.1in", top: "1.38in", height: "0.2in", background: "#fde68a", borderRadius: "0.04in", textAlign: "center", fontWeight: 800, fontSize: s.fullName.length > 22 ? "8px" : "10px", lineHeight: "0.2in", whiteSpace: "nowrap", overflow: "hidden" }}>{s.fullName}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: "1.6in", textAlign: "center", fontSize: "7px", fontWeight: 700, color: "#475569" }}>{"Class " + classLabel(s) + "  |  GR " + s.grNumber}</div>
      <div style={{ position: "absolute", left: "0.12in", right: "0.1in", top: "1.76in" }}>
        {row("DOB", fmtDob(s.dob))}
        {row("Mobile", s.mobile)}
        <div style={{ display: "flex", fontSize: "6px", lineHeight: "0.12in", maxHeight: "0.25in", overflow: "hidden" }}>
          <b style={{ width: "0.4in", flexShrink: 0, fontSize: "6.5px" }}>Address</b>
          <span>{": " + s.address}</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: "0.1in", bottom: "0.06in", width: "0.95in", height: "0.95in", background: "#ffffff" }}>
        <QRCodeSVG value={"CLASSTAGO:ST:" + s.id} size={256} level="M" marginSize={1} style={{ width: "0.95in", height: "0.95in", display: "block" }} />
      </div>
      <div style={{ position: "absolute", left: "1.1in", width: "0.93in", bottom: "0.1in", textAlign: "center" }}>
        <div style={{ height: "0.34in", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {imgs.sign ? <img src={imgs.sign} alt="" style={{ maxHeight: "0.34in", maxWidth: "0.93in" }} /> : null}
        </div>
        <div style={{ borderTop: "0.01in solid #94a3b8", fontSize: "6px", fontWeight: 700, paddingTop: "0.01in" }}>Headmaster</div>
      </div>
    </div>
  );
}

export default function StudentIdCards() {
  const [data, setData] = useState<{ school: IdSchool; students: IdStudent[] } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<{ students: IdStudent[]; imgs: Imgs } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
        <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{"All classes (" + students.length + ")"}</option>
          {groups.map((g) => <option key={g} value={g}>{"Class " + g}</option>)}
        </select>
        {missingPhoto > 0 ? <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{missingPhoto + " student(s) ki photo admission me nahi mili. Un ke card par khaali gola aayega."}</div> : null}
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
                <div className="text-xs text-slate-500">{"Class " + classLabel(s) + " | GR " + s.grNumber + (s.photoUrl ? "" : " | photo missing")}</div>
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
                {page.map((s) => <IdCard key={s.id} s={s} school={data.school} imgs={job.imgs} />)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
