import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileClock, Loader2, RefreshCw, Send, ShieldCheck, UserRound, XCircle } from 'lucide-react';
import type { User } from '../../types';
import type { TeacherCloudContext } from '../teacherFresh/types';
import type { TeacherLeaveApplication, TeacherLeaveSettings, TeacherLeaveView } from './types';
import { cancelTeacherLeaveApplication, loadTeacherLeaveApplications, loadTeacherLeaveSettings, submitTeacherLeaveApplication } from './teacherLeaveService';

const STAFF_LEAVE_TYPES = [
  'Casual Leave (CL)', 'Sick Leave (SL)', 'Medical Leave', 'Earned Leave (EL)',
  'Maternity Leave', 'Paternity Leave', 'Child Care Leave', 'Official Duty',
  'Training', 'Workshop', 'Election Duty', 'Examination Duty', 'Family Function',
  'Personal Work', 'Emergency', 'Death in Family', 'Other'
];

const statusTone = (status: string) => {
  const key = String(status || '').toLowerCase();
  if (key === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (key === 'rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (key === 'cancelled') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

function daysInclusive(start: string, end: string, halfDay: boolean) {
  if (!start || !end || start > end) return 0;
  if (halfDay && start === end) return 0.5;
  const a = new Date(`${start}T00:00:00`), b = new Date(`${end}T00:00:00`);
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

function overlapsHoliday(settings: TeacherLeaveSettings | null, start: string, end: string) {
  if (!settings || !start || !end) return [];
  return settings.holidays.filter(h => h.startDate <= end && h.endDate >= start);
}

export default function TeacherLeavePersonalHR({
  user, context, loading, error, view,
}: {
  user: User;
  context: TeacherCloudContext | null;
  loading: boolean;
  error?: string;
  view: TeacherLeaveView;
}) {
  const [applications, setApplications] = useState<TeacherLeaveApplication[]>([]);
  const [settings, setSettings] = useState<TeacherLeaveSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave (CL)');
  const [customLeaveType, setCustomLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [halfDayOption, setHalfDayOption] = useState<'Morning Session' | 'Afternoon Session'>('Morning Session');
  const [reason, setReason] = useState('');

  const reload = async () => {
    setBusy(true); setLoadError('');
    try {
      const [apps, leaveSettings] = await Promise.all([loadTeacherLeaveApplications(), loadTeacherLeaveSettings()]);
      setApplications(apps);
      setSettings(leaveSettings);
    } catch (e: any) {
      setLoadError(e?.message || 'Unable to load Teacher leave records.');
    } finally { setBusy(false); }
  };

  useEffect(() => { if (!loading && context) void reload(); }, [loading, context?.userId, context?.schoolId]);

  const summary = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === 'Pending').length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
    cancelled: applications.filter(a => a.status === 'Cancelled').length,
  }), [applications]);

  const requestDays = daysInclusive(startDate, endDate, halfDay);
  const holidayHits = overlapsHoliday(settings, startDate, endDate);
  const finalLeaveType = leaveType === 'Other' ? customLeaveType.trim() : leaveType;

  const submit = async () => {
    if (!context || !startDate || !endDate || startDate > endDate || !finalLeaveType || !reason.trim()) return;
    setBusy(true); setLoadError(''); setMessage('');
    try {
      await submitTeacherLeaveApplication({
        applicantName: context.teacherName || user.name,
        shalarthId: user.shalarthId || null,
        employeeCode: user.employeeCode || null,
        startDate, endDate, isHalfDay: halfDay,
        halfDayOption: halfDay ? halfDayOption : null,
        leaveType: finalLeaveType,
        reason: reason.trim(),
      });
      setMessage('Leave application submitted to the Headmaster for final decision.');
      setStartDate(''); setEndDate(''); setHalfDay(false); setReason(''); setCustomLeaveType(''); setLeaveType('Casual Leave (CL)');
      await reload();
    } catch (e: any) { setLoadError(e?.message || 'Leave application could not be submitted.'); }
    finally { setBusy(false); }
  };

  const cancel = async (row: TeacherLeaveApplication) => {
    if (row.status !== 'Pending') return;
    setActionId(row.id); setLoadError(''); setMessage('');
    try {
      await cancelTeacherLeaveApplication(row.cloudRequestId || row.id);
      setMessage('Pending leave application cancelled.');
      await reload();
    } catch (e: any) { setLoadError(e?.message || 'Leave application could not be cancelled.'); }
    finally { setActionId(''); }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading Teacher Leave & Personal HR…</div>;
  if (error || !context) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || 'Teacher cloud context is unavailable.'}</div>;

  const title = view === 'apply' ? 'Apply Leave' : view === 'status' ? 'My Leave Status' : view === 'history' ? 'My Leave History' : 'My HR & Leave Summary';

  return <div className="space-y-5">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Leave & Personal HR</div><h1 className="mt-2 text-2xl font-black">{title}</h1><p className="mt-1 text-xs text-slate-300">{context.teacherName} · {context.academicYear}</p></div>
        <button type="button" onClick={() => void reload()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}/>Refresh</button>
      </div>
    </header>

    {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{loadError}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

    {view === 'apply' && <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">Leave Type<select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{STAFF_LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
        {leaveType === 'Other' && <label className="text-xs font-bold text-slate-700">Custom Leave Type<input value={customLeaveType} onChange={e => setCustomLeaveType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>}
        <label className="text-xs font-bold text-slate-700">From Date<input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
        <label className="text-xs font-bold text-slate-700">To Date<input type="date" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs"><label className="inline-flex items-center gap-2 font-bold"><input type="checkbox" checked={halfDay} onChange={e => { setHalfDay(e.target.checked); if (e.target.checked && startDate) setEndDate(startDate); }}/>Half Day</label>{halfDay && <select value={halfDayOption} onChange={e => setHalfDayOption(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><option>Morning Session</option><option>Afternoon Session</option></select>}<span className="ml-auto font-black text-slate-700">Requested: {requestDays} day{requestDays === 1 ? '' : 's'}</span></div>
      {holidayHits.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><b>Calendar notice:</b> Selected dates overlap {holidayHits.map(h => h.name).join(', ')}. Final leave counting follows the Headmaster policy ({settings?.leaveRule || 'Rule A'}).</div>}
      <label className="block text-xs font-bold text-slate-700">Detailed Reason<textarea value={reason} onChange={e => setReason(e.target.value)} rows={5} maxLength={3000} placeholder="Enter the factual reason for this leave request." className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6"/></label>
      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>This is your personal request only. It stays Pending until the Headmaster approves or rejects it. Other staff leave records are not exposed to this Teacher account.</span></div>
      <button type="button" onClick={() => void submit()} disabled={busy || !startDate || !endDate || startDate > endDate || !finalLeaveType || !reason.trim()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}Submit to Headmaster</button>
    </section>}

    {view === 'summary' && <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Total Requests" value={summary.total} icon={<FileClock/>}/><Stat label="Pending" value={summary.pending} icon={<Clock3/>}/><Stat label="Approved" value={summary.approved} icon={<CheckCircle2/>}/><Stat label="Rejected" value={summary.rejected} icon={<XCircle/>}/><Stat label="Cancelled" value={summary.cancelled} icon={<CalendarDays/>}/></div><section className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 font-black text-slate-900"><UserRound className="h-5 w-5 text-cyan-700"/>Personal HR Identity</div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><K label="Teacher" value={context.teacherName}/><K label="Academic Year" value={context.academicYear}/><K label="SHALARTH ID" value={user.shalarthId || 'Protected / not stored'}/><K label="Designation" value={user.designation || 'Teacher'}/></dl></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="font-black text-slate-900">Current Assignment Scope</div><div className="mt-3 space-y-2">{context.assignments.length ? context.assignments.map((a, i) => <div key={`${a.id || i}`} className="rounded-xl bg-slate-50 p-3 text-xs"><b>{a.className}{a.division ? ` · ${a.division}` : ''}</b><span className="ml-2 text-slate-500">{a.subjectName || (a.isClassTeacher ? 'Class Teacher' : 'Assigned duty')}</span></div>) : <div className="text-xs text-slate-500">No active academic assignment is available.</div>}</div></div></section></>}

    {(view === 'status' || view === 'history') && <ApplicationTable rows={view === 'status' ? applications.filter(a => a.status === 'Pending') : applications} actionId={actionId} onCancel={cancel}/>} 
  </div>;
}

function ApplicationTable({ rows, actionId, onCancel }: { rows: TeacherLeaveApplication[]; actionId: string; onCancel: (row: TeacherLeaveApplication) => void }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[920px] text-xs"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Applied</th><th className="p-3">Leave</th><th className="p-3">Dates</th><th className="p-3">Reason</th><th className="p-3">Status</th><th className="p-3">Headmaster Review</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t align-top"><td className="p-3">{row.appliedAt ? String(row.appliedAt).slice(0,10) : '—'}</td><td className="p-3 font-bold">{row.leaveType}</td><td className="p-3 font-mono">{row.startDate}{row.endDate !== row.startDate ? ` → ${row.endDate}` : ''}{row.isHalfDay ? ' · Half day' : ''}</td><td className="max-w-[300px] p-3 leading-5 text-slate-600">{row.reason || '—'}</td><td className="p-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(row.status)}`}>{row.status}</span></td><td className="p-3 text-slate-600">{row.reviewedBy || 'Awaiting decision'}{row.remarks ? <div className="mt-1 text-[10px] text-slate-400">{row.remarks}</div> : null}</td><td className="p-3 text-right">{row.status === 'Pending' ? <button type="button" disabled={actionId === row.id} onClick={() => onCancel(row)} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700 disabled:opacity-50">{actionId === row.id ? 'Cancelling…' : 'Cancel'}</button> : <span className="text-[10px] text-slate-400">Locked</span>}</td></tr>)}{!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No matching personal leave application is available.</td></tr>}</tbody></table></div>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</div><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-950">{value}</div></div></div></div>; }
function K({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 font-bold text-slate-800">{value}</dd></div>; }
