import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Cloud, Loader2, RefreshCw, ShieldCheck, UsersRound, BookOpenCheck } from 'lucide-react';
import { AcademicAssignmentCloudService } from '../services/academicAssignmentCloudService';

const text = (value: unknown, fallback = '—') => {
  const out = String(value ?? '').trim();
  return out || fallback;
};

const assignmentLabel = (row: any, kind: 'class' | 'subject') => {
  const className = text(row?.className || row?.class_name || row?.standard || row?.class, 'Class');
  const division = text(row?.division || row?.divisionName || row?.division_name, '');
  const subject = kind === 'subject' ? text(row?.subjectName || row?.subject_name || row?.subject, 'Subject') : '';
  const teacher = text(row?.teacherName || row?.teacher_name || row?.teacherProfileName || row?.teacher, 'Teacher');
  return { className, division, subject, teacher };
};

export default function AcademicAssignmentValidity() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await AcademicAssignmentCloudService.load());
    } catch (err: any) {
      setError(err?.message || 'Academic assignment validity could not be loaded from Supabase Cloud.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const classRows = useMemo(() => Array.isArray(data?.classTeacherAssignments) ? data.classTeacherAssignments : [], [data]);
  const subjectRows = useMemo(() => Array.isArray(data?.subjectAllocations) ? data.subjectAllocations : [], [data]);

  return (
    <div className="space-y-5 text-left">
      <section className="edx-dark-contrast-surface relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_92%_8%,rgba(139,92,246,.22),transparent_35%),linear-gradient(135deg,#07182f,#080b1d_58%,#17122f)] p-5 text-white shadow-[0_28px_80px_rgba(2,6,23,.28)] sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10"><CalendarCheck2 className="h-6 w-6 text-cyan-200"/></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-200">Canonical Academic Assignment Scope</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Academic-year assignment validity</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Shows the current Supabase-backed Class Teacher and Subject Teacher assignment set. Browser LocalStorage is not used to decide production access.</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black hover:bg-white/15 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh Cloud</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric icon={Cloud} label="Academic year" value={text(data?.academicYear, 'Current year')} />
          <Metric icon={UsersRound} label="Class Teacher duties" value={String(classRows.length)} />
          <Metric icon={BookOpenCheck} label="Subject assignments" value={String(subjectRows.length)} />
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}
      {loading ? <div className="grid min-h-[260px] place-items-center rounded-2xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-600"/><p className="mt-3 text-xs font-bold text-slate-500">Loading cloud assignment validity…</p></div></div> : !error && <>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Class Teacher</p><h3 className="mt-1 font-black text-slate-900">Current valid duties</h3></div><ShieldCheck className="h-5 w-5 text-emerald-600"/></header>
          <div className="divide-y divide-slate-100">{classRows.length ? classRows.map((row:any, index:number) => { const item=assignmentLabel(row,'class'); return <div key={row?.id || index} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.2fr_.8fr_1.4fr] sm:items-center"><div className="font-black text-slate-900">{item.className}{item.division ? ` · ${item.division}` : ''}</div><div className="text-xs font-bold text-emerald-700">Active current-year duty</div><div className="text-sm font-semibold text-slate-700 sm:text-right">{item.teacher}</div></div>; }) : <div className="px-5 py-10 text-center text-sm text-slate-500">No current Class Teacher duty is assigned.</div>}</div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Subject Teacher</p><h3 className="mt-1 font-black text-slate-900">Current valid assignments</h3></div><ShieldCheck className="h-5 w-5 text-emerald-600"/></header>
          <div className="divide-y divide-slate-100">{subjectRows.length ? subjectRows.map((row:any, index:number) => { const item=assignmentLabel(row,'subject'); return <div key={row?.id || index} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1fr_1.3fr] sm:items-center"><div className="font-black text-slate-900">{item.className}{item.division ? ` · ${item.division}` : ''}</div><div className="text-sm font-semibold text-violet-700">{item.subject}</div><div className="text-sm font-semibold text-slate-700 sm:text-right">{item.teacher}</div></div>; }) : <div className="px-5 py-10 text-center text-sm text-slate-500">No current Subject Teacher assignment is configured.</div>}</div>
        </section>
      </>}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/7 p-4"><Icon className="h-4 w-4 text-cyan-200"/><div className="mt-3 text-xl font-black">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">{label}</div></div>;
}
