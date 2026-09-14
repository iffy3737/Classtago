import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, CircleAlert, GraduationCap, IndianRupee, Loader2, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

type AnalyticsTab = 'strength' | 'attendance' | 'results' | 'fees' | 'workload';
type Props = { lang: string; user: User; activeFeatureId?: string | null };

type AnalyticsPayload = {
  generatedAt: string;
  studentStrength: { available: boolean; total: number | null; byClass: Array<{label:string;count:number}>; admissionsByMonth: Array<{month:string;count:number}> };
  attendance: { available: boolean; sourceTable?: string | null; trend: Array<{month:string;rate:number;total:number}> };
  results: { available: boolean; sourceTable?: string | null; bySubject: Array<{label:string;average:number;passRate:number;entries:number}> };
  fees: { available: boolean; sourceTable?: string | null; total:number|null; paid:number|null; outstanding:number|null };
  staffWorkload: { available:boolean; assignmentsAvailable:boolean; sourceTables?:string[]; rows:Array<{name:string;subjectAssignments:number;classTeacherAssignments:number;totalAssignments:number}> };
};

const featureToTab: Record<string, AnalyticsTab> = {
  'student-strength-trends': 'strength',
  'attendance-trends': 'attendance',
  'result-trends': 'results',
  'fee-position-analysis': 'fees',
  'staff-workload-analysis': 'workload'
};

const tabs: Array<[AnalyticsTab,string,any]> = [
  ['strength','Student Strength Trends',GraduationCap],
  ['attendance','Attendance Trend Analysis',TrendingUp],
  ['results','Result Performance Trends',BarChart3],
  ['fees','Fee Position Analysis',IndianRupee],
  ['workload','Staff Workload Analysis',Users]
];

export default function ExecutiveDashboard({ user, activeFeatureId }: Props) {
  const [active, setActive] = useState<AnalyticsTab>(featureToTab[activeFeatureId || ''] || 'strength');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const focusedLabel = activeFeatureId ? tabs.find(([key]) => key === featureToTab[activeFeatureId])?.[1] : null;

  useEffect(() => { if (activeFeatureId && featureToTab[activeFeatureId]) setActive(featureToTab[activeFeatureId]); }, [activeFeatureId]);
  const load = async () => { setLoading(true); setError(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session?.access_token) throw new Error('Secure session unavailable.'); const response = await fetch('/api/headmaster/executive-analytics', { headers: { Authorization: `Bearer ${session.access_token}` } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Executive Dashboard could not be loaded.'); setData(payload); } catch (e:any) { setError(e.message || 'Executive Dashboard could not be loaded.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  if (loading) return <div className="grid min-h-[420px] place-items-center rounded-3xl border border-slate-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-cyan-600" /><p className="mt-4 text-sm font-bold text-slate-600">Loading school-scoped analytics…</p></div></div>;
  if (error || !data) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center"><CircleAlert className="mx-auto h-9 w-9 text-rose-600" /><div className="mt-4 font-black text-rose-900">{error}</div><button onClick={() => void load()} className="mt-5 rounded-xl bg-rose-700 px-4 py-3 text-xs font-black text-white">Retry</button></div>;

  return <div className="space-y-5">
    <header className="edx-dark-contrast-surface rounded-[1.75rem] bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.2),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(139,92,246,.2),transparent_38%),linear-gradient(135deg,#07172d,#080b1c_56%,#17112e)] p-6 text-white shadow-2xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Executive Dashboard</div><h1 className="mt-3 text-2xl font-black sm:text-3xl">{focusedLabel || 'School-wide trends for Headmaster decisions.'}</h1><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">Each submenu opens its matching school-scoped analytics view directly. Browser-only or invented figures are never substituted.</p></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-black"><RefreshCw className="h-4 w-4" />Refresh</button></div><div className="mt-5 text-[10px] font-bold text-slate-400">Headmaster: {user.name} · Updated {new Date(data.generatedAt).toLocaleString()}</div></header>

    {!activeFeatureId && <nav className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-5" aria-label="Executive Dashboard views">{tabs.map(([key,label,Icon]) => <button key={key} onClick={() => setActive(key)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-black transition ${active===key?'bg-slate-950 text-white shadow-lg':'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></button>)}</nav>}

    {active === 'strength' && <StudentStrength data={data.studentStrength} />}
    {active === 'attendance' && <Attendance data={data.attendance} />}
    {active === 'results' && <Results data={data.results} />}
    {active === 'fees' && <Fees data={data.fees} />}
    {active === 'workload' && <Workload data={data.staffWorkload} />}
  </div>;
}

function StudentStrength({ data }: { data: AnalyticsPayload['studentStrength'] }) {
  if (!data.available) return <Unavailable title="Student Strength Trends" />;
  return <Panel title="Student Strength Trends" text="Current active Student Master records grouped by class, plus admission intake by month."><Metric label="Active students" value={data.total} /><BarList rows={data.byClass.map(x => ({label:x.label,value:x.count}))} empty="No class assignment is available in Student Master." /><MiniTable title="Admission intake by month" rows={data.admissionsByMonth.map(x => [monthLabel(x.month), String(x.count)])} /></Panel>;
}
function Attendance({ data }: { data: AnalyticsPayload['attendance'] }) {
  if (!data.available) return <Unavailable title="Attendance Trend Analysis" detail="No permanent cloud attendance table is connected yet. The page is correctly routed, but it will not display LocalStorage or invented attendance." />;
  return <Panel title="Attendance Trend Analysis" text={`Cloud source: ${data.sourceTable || 'attendance records'}.`}><BarList rows={data.trend.map(x => ({label:monthLabel(x.month),value:x.rate,suffix:'%'}))} empty="No submitted attendance records were found." /></Panel>;
}
function Results({ data }: { data: AnalyticsPayload['results'] }) {
  if (!data.available) return <Unavailable title="Result Performance Trends" />;
  return <Panel title="Result Performance Trends" text="Approved and saved mark entries grouped by subject."><MiniTable title="Subject performance" headers={['Subject','Average','Pass rate','Entries']} rows={data.bySubject.map(x => [x.label,String(x.average),`${x.passRate}%`,String(x.entries)])} /></Panel>;
}
function Fees({ data }: { data: AnalyticsPayload['fees'] }) {
  if (!data.available) return <Unavailable title="Fee Position Analysis" detail="No permanent cloud fee ledger was detected. LocalStorage fee figures are intentionally excluded." />;
  return <Panel title="Fee Position Analysis" text={`Cloud source: ${data.sourceTable || 'fee ledger'}.`}><div className="grid gap-4 sm:grid-cols-3"><Metric label="Total demand" value={money(data.total)} /><Metric label="Collected" value={money(data.paid)} /><Metric label="Outstanding" value={money(data.outstanding)} alert /></div></Panel>;
}
function Workload({ data }: { data: AnalyticsPayload['staffWorkload'] }) {
  if (!data.available) return <Unavailable title="Staff Workload Analysis" />;
  return <Panel title="Staff Workload Analysis" text={data.assignmentsAvailable ? `Teaching workload counts Subject Assignments only. Class Teacher duty is shown separately and is not added to workload. Sources: ${(data.sourceTables || []).join(', ') || 'school assignments'}.` : 'Staff records are live, but assignment tables are not connected yet.'}><MiniTable title="Academic assignments" headers={['Staff','Subject Load','Class Teacher Duty','Workload Total']} rows={data.rows.map(x => [x.name,String(x.subjectAssignments),String(x.classTeacherAssignments),String(x.totalAssignments)])} /></Panel>;
}

function Panel({ title, text, children }: { title:string; text:string; children:React.ReactNode }) { return <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">{title}</div><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p><div className="mt-6 space-y-6">{children}</div></section>; }
function Metric({ label, value, alert=false }: { label:string; value:any; alert?:boolean }) { return <div className={`rounded-2xl border p-5 ${alert?'border-amber-200 bg-amber-50':'border-slate-200 bg-slate-50'}`}><div className="text-2xl font-black text-slate-950">{value ?? '—'}</div><div className="mt-1 text-xs font-bold text-slate-500">{label}</div></div>; }
function BarList({ rows, empty }: { rows:Array<{label:string;value:number;suffix?:string}>; empty:string }) { const max=Math.max(1,...rows.map(x=>Number(x.value)||0)); return rows.length ? <div className="space-y-3">{rows.map(row => <div key={row.label}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-700">{row.label}</span><span className="font-black text-slate-950">{row.value}{row.suffix||''}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600" style={{width:`${Math.max(2,(Number(row.value)||0)/max*100)}%`}} /></div></div>)}</div> : <Empty text={empty} />; }
function MiniTable({ title, headers=['Period','Value'], rows }: { title:string; headers?:string[]; rows:string[][] }) { return <div><div className="mb-3 text-sm font-black text-slate-950">{title}</div>{rows.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{headers.map(h=><th key={h} className="px-4 py-3 font-black">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row,i)=><tr key={i}>{row.map((v,j)=><td key={j} className={`px-4 py-3 ${j===0?'font-bold text-slate-800':'text-slate-600'}`}>{v}</td>)}</tr>)}</tbody></table></div> : <Empty text="No matching cloud records were found." />}</div>; }
function Empty({ text }: { text:string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">{text}</div>; }
function Unavailable({ title, detail }: { title:string; detail?:string }) { return <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-7"><CircleAlert className="h-7 w-7 text-amber-700" /><h2 className="mt-4 text-xl font-black text-amber-950">{title}</h2><p className="mt-2 text-xs leading-6 text-amber-900">{detail || 'The exact feature page is connected, but its permanent cloud dataset is not available in the current database. No mock or browser-only figures are shown.'}</p></section>; }
function monthLabel(value:string) { const [y,m]=value.split('-').map(Number); return y&&m ? new Date(y,m-1,1).toLocaleDateString(undefined,{month:'short',year:'numeric'}) : value; }
function money(value:number|null) { return value===null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`; }
