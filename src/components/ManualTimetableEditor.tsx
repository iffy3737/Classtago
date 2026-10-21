import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";

const keyOf = (c: string, d?: string) => (!d || d === "No Division" ? c : c + "-" + d);

export default function ManualTimetableEditor({ timetable, workload, setup, onChange }: { timetable: any[]; workload: any[]; setup: any; onChange: (next: any[]) => void }) {
  const classes = useMemo(() => {
    const m = new Map<string, { className: string; division: string; key: string }>();
    (workload || []).forEach((w: any) => {
      if (!w.className) return;
      const key = keyOf(w.className, w.division);
      if (!m.has(key)) m.set(key, { className: w.className, division: w.division || "", key });
    });
    return Array.from(m.values()).sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  }, [workload]);

  const [classKey, setClassKey] = useState("");
  const [editing, setEditing] = useState<{ day: string; period: number } | null>(null);
  const [form, setForm] = useState({ subject: "", teacher: "", room: "" });
  const [copyDay, setCopyDay] = useState("");
  const [copyTo, setCopyTo] = useState("");

  const activeKey = classKey || (classes[0] ? classes[0].key : "");
  const activeClass: any = classes.find(c => c.key === activeKey);
  const days: string[] = (setup && setup.workingDays) || [];
  const periodsFor = (d: string) => Number((setup && setup.weeklyPeriodSettings && setup.weeklyPeriodSettings[d]) ?? (setup && setup.periodsPerDay)) || 0;
  const maxP = Math.max(0, ...days.map(periodsFor));

  const classCells = useMemo(() => (timetable || []).filter((c: any) => keyOf(c.className, c.division) === activeKey), [timetable, activeKey]);
  const cellAt = (d: string, p: number): any => classCells.find((c: any) => c.day === d && c.period === p);
  const rowsOf = (key: string) => (workload || []).filter((w: any) => keyOf(w.className, w.division) === key);
  const teacherFor = (key: string, subject: string) => { const r: any = rowsOf(key).find((w: any) => w.subjectName === subject); return r ? r.teacherName : ""; };
  const subjects = useMemo(() => Array.from(new Set(rowsOf(activeKey).map((w: any) => w.subjectName).filter(Boolean))).sort() as string[], [workload, activeKey]);
  const allTeachers = useMemo(() => Array.from(new Set((workload || []).map((w: any) => w.teacherName).filter(Boolean))).sort() as string[], [workload]);

  const openCell = (day: string, period: number) => {
    const ex = cellAt(day, period);
    setForm({ subject: ex ? ex.subjectName : "", teacher: ex ? ex.teacherName : "", room: ex ? ex.roomNumber || "" : "" });
    setEditing({ day, period });
  };

  const existing = editing ? cellAt(editing.day, editing.period) : null;
  const conflict: any = editing && form.teacher
    ? (timetable || []).find((c: any) => c.teacherName === form.teacher && c.day === editing.day && c.period === editing.period && keyOf(c.className, c.division) !== activeKey)
    : null;

  const save = () => {
    if (!editing || !activeClass || !form.subject) return;
    const id = "cell_" + activeKey + "_" + editing.day + "_" + editing.period;
    const cell = { id: existing ? existing.id : id, className: activeClass.className, division: activeClass.division, day: editing.day, period: editing.period, subjectName: form.subject, teacherName: form.teacher, roomNumber: form.room, isLocked: existing ? !!existing.isLocked : false };
    const next = (timetable || []).filter((c: any) => !(keyOf(c.className, c.division) === activeKey && c.day === editing.day && c.period === editing.period));
    next.push(cell);
    onChange(next);
    setEditing(null);
  };

  const clearCell = () => {
    if (!editing) return;
    onChange((timetable || []).filter((c: any) => !(keyOf(c.className, c.division) === activeKey && c.day === editing.day && c.period === editing.period)));
    setEditing(null);
  };

  const doCopyDay = () => {
    if (!copyDay) return;
    const targets = days.filter(d => d !== copyDay);
    if (!window.confirm(copyDay + " ka timetable baaki sab dinon me copy ho jayega (unka purana hat jayega). Continue?")) return;
    const src = classCells.filter((c: any) => c.day === copyDay);
    const next = (timetable || []).filter((c: any) => !(keyOf(c.className, c.division) === activeKey && targets.includes(c.day)));
    targets.forEach(d => src.forEach((s: any) => { if (s.period <= periodsFor(d)) next.push({ ...s, id: "cell_" + activeKey + "_" + d + "_" + s.period, day: d, isLocked: false }); }));
    onChange(next);
  };

  const doCopyClass = () => {
    const target = classes.find(c => c.key === copyTo);
    if (!target) return;
    if (!window.confirm(activeKey + " ka timetable " + copyTo + " me copy hoga (uska purana hat jayega). Teacher " + copyTo + " ki workload se aayega. Continue?")) return;
    const next = (timetable || []).filter((c: any) => keyOf(c.className, c.division) !== copyTo);
    classCells.forEach((s: any) => next.push({ ...s, id: "cell_" + copyTo + "_" + s.day + "_" + s.period, className: target.className, division: target.division, teacherName: teacherFor(copyTo, s.subjectName), roomNumber: "", isLocked: false }));
    onChange(next);
  };

  if (!classes.length) {
    return <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-sm text-slate-300">Pehle "Workload" tab me teaching assignments (class, subject, teacher) add karo, phir yahan timetable bana sakoge.</div>;
  }

  const sel = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div className="text-xs font-black uppercase tracking-widest text-cyan-300">Manual Timetable Entry</div>
        <select className={sel} value={activeKey} onChange={e => setClassKey(e.target.value)}>
          {classes.map(c => <option key={c.key} value={c.key}>{"Class " + c.key}</option>)}
        </select>
        <div className="text-xs text-slate-400">Kisi bhi box par tap karo, subject aur teacher chuno. Changes auto-save hote hain; Supabase me draft save karne ke liye "Interactive Board" tab ka Save Draft button use karo.</div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900 p-2">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="p-1 text-[10px] text-slate-400">P</th>
              {days.map(d => <th key={d} className="p-1 text-[11px] font-black text-slate-200">{d.slice(0, 3)}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxP }, (_, i) => i + 1).map(p => (
              <tr key={p}>
                <td className="p-1 text-center text-[11px] font-black text-slate-400">{p}</td>
                {days.map(d => {
                  if (p > periodsFor(d)) return <td key={d} className="rounded-lg bg-slate-950/40" />;
                  const c = cellAt(d, p);
                  return (
                    <td key={d} className="p-0">
                      <button type="button" onClick={() => openCell(d, p)} className={"min-h-[52px] w-full min-w-[70px] rounded-lg border px-1 py-1 text-left text-[10px] leading-tight " + (c ? "border-cyan-500/40 bg-slate-800 text-slate-100" : "border-dashed border-slate-600 bg-slate-900 text-slate-500")}>
                        {c ? (<><div className="font-black">{c.subjectName}{c.isLocked ? " 🔒" : ""}</div><div className="text-slate-400">{c.teacherName}</div></>) : <div className="text-center text-base">+</div>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 space-y-3">
        <div className="text-xs font-black uppercase tracking-widest text-slate-300">Copy (jaldi bharne ke liye)</div>
        <div className="flex gap-2">
          <select className={sel} value={copyDay} onChange={e => setCopyDay(e.target.value)}>
            <option value="">Din chuno</option>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button type="button" onClick={doCopyDay} disabled={!copyDay} className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Baaki dinon me copy</button>
        </div>
        <div className="flex gap-2">
          <select className={sel} value={copyTo} onChange={e => setCopyTo(e.target.value)}>
            <option value="">Doosri class chuno</option>
            {classes.filter(c => c.key !== activeKey).map(c => <option key={c.key} value={c.key}>{c.key}</option>)}
          </select>
          <button type="button" onClick={doCopyClass} disabled={!copyTo} className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Class me copy</button>
        </div>
      </div>

      {editing && createPortal(
        <div className="fixed inset-0 flex items-end justify-center bg-black/60 p-3 md:items-center" style={{ zIndex: 2147483000 }} onClick={() => setEditing(null)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-600 bg-slate-900 p-4 text-slate-100" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-black">{"Class " + activeKey + " · " + editing.day + " · Period " + editing.period}</div>
            {existing && existing.isLocked && <div className="rounded-lg bg-amber-500/15 p-2 text-xs text-amber-300">Ye cell locked hai. Badalne se pehle Interactive Board se unlock karo.</div>}
            <label className="block text-xs text-slate-400">Subject
              <select className={sel} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value, teacher: teacherFor(activeKey, e.target.value) || form.teacher })}>
                <option value="">Subject chuno</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-400">Teacher
              <select className={sel} value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}>
                <option value="">Teacher chuno</option>
                {allTeachers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-400">Room (optional)
              <input className={sel} value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
            </label>
            {conflict && <div className="rounded-lg bg-rose-500/15 p-2 text-xs font-bold text-rose-300">{"Warning: " + form.teacher + " is period me " + keyOf(conflict.className, conflict.division) + " me pehle se laga hai."}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={!form.subject || !!(existing && existing.isLocked)} className={"flex-1 rounded-lg px-3 py-2 text-sm font-black text-white disabled:opacity-40 " + (conflict ? "bg-rose-600" : "bg-cyan-600")}>{conflict ? "Phir bhi save karo" : "Save"}</button>
              {existing && <button type="button" onClick={clearCell} disabled={!!existing.isLocked} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-black text-white disabled:opacity-40">Hatao</button>}
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-black text-slate-300">Band</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
