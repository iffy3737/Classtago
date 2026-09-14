import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, RefreshCw, Users, BriefcaseBusiness, Repeat2, AlertTriangle } from 'lucide-react';
import type { TeacherCloudContext } from '../teacherFresh/types';
import type { TeacherTimetableData, TeacherTimetableView } from './types';
import { loadTeacherTimetableData } from './timetableService';
import { getPhase1Cache, putPhase1Cache } from '../../lib/phase1Offline';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const norm = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g,' ');

function WeeklyGrid({ rows, classMode = false }: { rows: any[]; classMode?: boolean }) {
  const maxPeriod = Math.max(0, ...rows.map(r => Number(r.period || 0)));
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No published timetable rows are available for this scope.</div>;
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[1000px] border-collapse text-xs">
      <thead className="bg-slate-950 text-white"><tr><th className="border border-slate-800 p-3 text-center">Period</th>{DAYS.map(d => <th key={d} className="border border-slate-800 p-3 text-center">{d}</th>)}</tr></thead>
      <tbody>{Array.from({length:maxPeriod},(_,i)=>i+1).map(period => <tr key={period}>
        <td className="border border-slate-200 bg-slate-50 p-3 text-center font-black">P{period}</td>
        {DAYS.map(day => { const r = rows.find(x => x.day === day && Number(x.period) === period); return <td key={day} className="h-24 border border-slate-200 p-2 align-top">
          {r ? <div className="rounded-xl bg-slate-50 p-2"><div className="font-black text-slate-950">{r.subjectName}</div><div className="mt-1 text-[11px] text-slate-600">{classMode ? r.teacherName : `${r.className}${r.division ? ` · ${r.division}` : ''}`}</div>{r.startTime && r.endTime && <div className="mt-1 text-[10px] font-bold text-slate-400">{r.startTime}–{r.endTime}</div>}</div> : <div className="pt-5 text-center text-[10px] font-bold text-slate-300">—</div>}
        </td>; })}
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function TeacherTimetableWorkload({ context, loading, error, view }: { context: TeacherCloudContext | null; loading: boolean; error?: string; view: TeacherTimetableView }) {
  const [data,setData] = useState<TeacherTimetableData | null>(null);
  const [loadError,setLoadError] = useState('');
  const [busy,setBusy] = useState(false);
  const [classScope,setClassScope] = useState('');
  const online=useOnlineStatus();
  const localScope=context?{schoolId:context.schoolId,userId:context.userId}:null;
  const reload = async () => {
    if (!context || !localScope) return;
    setBusy(true); setLoadError('');
    try { const next = await loadTeacherTimetableData(context); setData(next); await putPhase1Cache(localScope,'teacher_timetable',context.academicYear,{data:next,cachedAt:new Date().toISOString()}); if (!classScope && next.classTeacherScopes[0]) setClassScope(`${next.classTeacherScopes[0].className}|${next.classTeacherScopes[0].division}`); }
    catch (e:any) { const cached=await getPhase1Cache<any>(localScope,'teacher_timetable',context.academicYear); if(cached?.data){setData(cached.data);setLoadError('Offline cached timetable loaded. Refresh will resume when internet returns.');if(!classScope&&cached.data.classTeacherScopes?.[0])setClassScope(`${cached.data.classTeacherScopes[0].className}|${cached.data.classTeacherScopes[0].division}`)}else setLoadError(e?.message || 'Unable to load timetable data. Open Timetable once online before using it offline.'); }
    finally { setBusy(false); }
  };
  useEffect(()=>{ void reload(); },[context?.userId,context?.academicYear]);

  const workload = useMemo(() => {
    const rows = data?.regularRows || [];
    const byScope = new Map<string,{className:string;division:string;subjectName:string;periods:number}>();
    const byDay = new Map<string,number>();
    for (const r of rows) {
      const key = `${r.className}|${r.division}|${r.subjectName}`;
      const existing = byScope.get(key) || { className:r.className,division:r.division,subjectName:r.subjectName,periods:0 };
      existing.periods += 1; byScope.set(key,existing); byDay.set(r.day,(byDay.get(r.day)||0)+1);
    }
    return { total: rows.length, scopes:[...byScope.values()].sort((a,b)=>b.periods-a.periods), byDay };
  },[data]);

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading Teacher timetable scope…</div>;
  if (error || !context) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || 'Teacher cloud context is unavailable.'}</div>;

  const title = view === 'my_timetable' ? 'My Timetable' : view === 'class_timetable' ? 'Class Timetable' : view === 'workload' ? 'My Teaching Workload' : 'Substitute / Adjustment Duties';
  const selectedScope = data?.classTeacherScopes.find(s => `${s.className}|${s.division}` === classScope);
  const selectedClassRows = (data?.classRows || []).filter(r => !selectedScope || (norm(r.className)===norm(selectedScope.className) && (!selectedScope.division || norm(r.division)===norm(selectedScope.division))));

  return <div className="space-y-5">
    <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Timetable & Workload</div><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-1 text-xs text-slate-300">{context.teacherName} · {context.academicYear} · {online?'Online':'Offline cached mode'}</p></div><button onClick={()=>void reload()} disabled={busy||!online} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black"><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/>Refresh</button></div></header>
    {(loadError) && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div>}
    {data?.message && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4"/>{data.message}</div>}

    {view === 'my_timetable' && <><div className="grid gap-3 sm:grid-cols-3"><Stat icon={<CalendarDays/>} label="Weekly periods" value={String(workload.total)}/><Stat icon={<Users/>} label="Assigned scopes" value={String(workload.scopes.length)}/><Stat icon={<Clock3/>} label="Feed" value="Published Cloud"/></div><WeeklyGrid rows={data?.regularRows || []}/></>}

    {view === 'class_timetable' && <>{!data?.classTeacherScopes.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">Class Timetable is available only for an active Headmaster-assigned Class Teacher duty.</div> : <><div className="flex flex-wrap gap-2">{data.classTeacherScopes.map(s => { const k=`${s.className}|${s.division}`; return <button key={k} onClick={()=>setClassScope(k)} className={`rounded-xl px-4 py-2 text-xs font-black ${classScope===k?'bg-slate-950 text-white':'border border-slate-200 bg-white text-slate-700'}`}>{s.className}{s.division?` · ${s.division}`:''}</button>; })}</div><WeeklyGrid rows={selectedClassRows} classMode/></>}</>}

    {view === 'workload' && <><div className="grid gap-3 sm:grid-cols-3"><Stat icon={<BriefcaseBusiness/>} label="Regular periods / week" value={String(workload.total)}/><Stat icon={<Users/>} label="Class-subject scopes" value={String(workload.scopes.length)}/><Stat icon={<Repeat2/>} label="Substitute duties in feed" value={String((data?.substituteRows || []).length)}/></div><div className="grid gap-5 lg:grid-cols-2"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b bg-slate-50 p-4 font-black">Class / Subject workload</div><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="p-3">Class</th><th className="p-3">Subject</th><th className="p-3 text-right">Periods</th></tr></thead><tbody>{workload.scopes.map((s,i)=><tr key={i} className="border-t"><td className="p-3 font-bold">{s.className}{s.division?` · ${s.division}`:''}</td><td className="p-3">{s.subjectName}</td><td className="p-3 text-right font-black">{s.periods}</td></tr>)}</tbody></table></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b bg-slate-50 p-4 font-black">Day-wise workload</div><table className="w-full text-xs"><tbody>{DAYS.map(day=><tr key={day} className="border-t"><td className="p-3 font-bold">{day}</td><td className="p-3 text-right font-black">{workload.byDay.get(day)||0} periods</td></tr>)}</tbody></table></div></div></>}

    {view === 'substitute' && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Date</th><th className="p-3">Period</th><th className="p-3">Class / Division</th><th className="p-3">Subject</th><th className="p-3">Unavailable Teacher</th><th className="p-3">Status</th></tr></thead><tbody>{(data?.substituteRows || []).sort((a,b)=>b.date.localeCompare(a.date)||a.period-b.period).map(r=><tr key={r.id} className="border-t"><td className="p-3 font-bold">{r.date}</td><td className="p-3 font-black">P{r.period}</td><td className="p-3">{r.className}{r.division?` · ${r.division}`:''}</td><td className="p-3 font-bold">{r.subjectName}</td><td className="p-3">{r.originalTeacher}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">Assigned</span></td></tr>)}{!(data?.substituteRows || []).length && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No approved substitute / adjustment duty is assigned to you.</td></tr>}</tbody></table></div>}
  </div>;
}

function Stat({ icon,label,value }:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</div><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-lg font-black text-slate-950">{value}</div></div></div></div>; }
