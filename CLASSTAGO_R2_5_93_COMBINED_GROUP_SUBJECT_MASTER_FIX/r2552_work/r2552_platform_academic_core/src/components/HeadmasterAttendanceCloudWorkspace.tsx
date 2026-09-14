import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, FileClock,
  FileText, Loader2, RefreshCw, Search, ShieldCheck, Users, XCircle
} from 'lucide-react';
import type { User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { nextMonthStartKey, schoolCurrentMonthKey, schoolTodayKey, shiftDateKey } from '../lib/schoolDate';
import { printSectionById } from '../utils/printSection';

type CloudScope = {
  id: string;
  classId: string;
  className: string;
  divisionId: string;
  divisionName: string;
  classTeacher: string;
};

type CloudStudent = {
  id: string;
  name: string;
  grNumber: string;
  rollNo: number;
  gender: string;
  classId: string;
  className: string;
  divisionId: string;
  divisionName: string;
  status: string;
  isActive: boolean;
  admissionDate?: string | null;
  leavingDate?: string | null;
};

type CloudRecord = {
  id: string;
  studentId: string;
  studentName: string;
  grNumber: string;
  rollNo: number;
  classId: string;
  divisionId: string;
  date: string;
  status: string;
  source?: string;
  submittedAt?: string | null;
};

type CloudCorrection = {
  id: string;
  studentId: string;
  studentName: string;
  grNumber: string;
  date: string;
  currentStatus: string;
  requestedStatus: string;
  reason: string;
  status: string;
  reviewNote?: string | null;
  createdAt?: string | null;
};

type CloudSnapshot = {
  academicYear: { id: string; year: string; isActive?: boolean };
  academicYears: Array<{ id: string; year: string; isActive?: boolean }>;
  school: any;
  scopes: CloudScope[];
  students: CloudStudent[];
  records: CloudRecord[];
  corrections: CloudCorrection[];
  generatedAt: string;
};

type Props = {
  user: UserType;
  activeFeatureId?: string | null;
};

async function accessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure Headmaster session is unavailable. Please sign in again.');
  return session.access_token;
}

async function loadSnapshot(month: string, date: string): Promise<CloudSnapshot> {
  const query = new URLSearchParams({ month, date });
  const response = await fetch(`/api/clerk/attendance-reports/snapshot?${query.toString()}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Canonical attendance could not be loaded.');
  return payload as CloudSnapshot;
}

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();
const scopeLabel = (scope?: CloudScope | null) => scope ? `${scope.className}${scope.divisionName ? ` · ${scope.divisionName}` : ''}` : 'Class / Division';
const statusPill = (status: string) => {
  const key = norm(status);
  if (key === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (key === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const studentActiveOnDate = (student: CloudStudent, dateKey: string) => {
  const admitted = String(student.admissionDate || '').slice(0, 10);
  const left = String(student.leavingDate || '').slice(0, 10);
  if (admitted && dateKey < admitted) return false;
  if (left && dateKey > left) return false;
  if (!student.isActive && !left) return false;
  return true;
};

const studentRelevantInMonth = (student: CloudStudent, monthKey: string) => {
  const start = `${monthKey}-01`;
  const end = shiftDateKey(nextMonthStartKey(monthKey), -1);
  const admitted = String(student.admissionDate || '').slice(0, 10);
  const left = String(student.leavingDate || '').slice(0, 10);
  if (admitted && admitted > end) return false;
  if (left && left < start) return false;
  if (!student.isActive && !left) return false;
  return true;
};

export default function HeadmasterAttendanceCloudWorkspace({ user, activeFeatureId = 'attendance-dashboard' }: Props) {
  const [snapshot, setSnapshot] = useState<CloudSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [date, setDate] = useState(() => schoolTodayKey());
  const [month, setMonth] = useState(() => schoolCurrentMonthKey());
  const [scopeId, setScopeId] = useState('');
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyDecision, setBusyDecision] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await loadSnapshot(month, date);
      setSnapshot(data);
      setScopeId(current => current && data.scopes.some(scope => scope.id === current) ? current : (data.scopes[0]?.id || ''));
    } catch (reason: any) {
      setError(reason?.message || 'Attendance workspace could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [month, date]);

  const scopes = snapshot?.scopes || [];
  const students = snapshot?.students || [];
  const records = snapshot?.records || [];
  const corrections = snapshot?.corrections || [];
  const selectedScope = scopes.find(scope => scope.id === scopeId) || scopes[0] || null;

  const selectedStudents = useMemo(() => {
    if (!selectedScope) return [];
    return students
      .filter(student => student.classId === selectedScope.classId && String(student.divisionId || '') === String(selectedScope.divisionId || ''))
      .filter(student => studentActiveOnDate(student, date))
      .filter(student => !search || norm(student.name).includes(norm(search)) || norm(student.grNumber).includes(norm(search)))
      .sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0) || a.name.localeCompare(b.name));
  }, [students, selectedScope, search, date]);

  const dailyRecords = useMemo(() => {
    if (!selectedScope) return [];
    return records.filter(record => record.date === date && record.classId === selectedScope.classId && String(record.divisionId || '') === String(selectedScope.divisionId || ''));
  }, [records, selectedScope, date]);

  const dailyByStudent = useMemo(() => new Map(dailyRecords.map(record => [record.studentId, record])), [dailyRecords]);

  const classDailySummary = useMemo(() => scopes.map(scope => {
    const roster = students.filter(student => student.classId === scope.classId && String(student.divisionId || '') === String(scope.divisionId || '') && studentActiveOnDate(student, date));
    const rows = records.filter(record => record.date === date && record.classId === scope.classId && String(record.divisionId || '') === String(scope.divisionId || ''));
    const present = rows.filter(row => row.status === 'P').length;
    const absent = rows.filter(row => row.status === 'A').length;
    return { scope, total: roster.length, marked: rows.length, present, absent, pending: Math.max(0, roster.length - rows.length) };
  }), [scopes, students, records, date]);

  const monthlyStudentRows = useMemo(() => {
    if (!selectedScope) return [];
    const scopeStudents = students.filter(student => student.classId === selectedScope.classId && String(student.divisionId || '') === String(selectedScope.divisionId || '') && studentRelevantInMonth(student, month));
    return scopeStudents.map(student => {
      const rows = records.filter(record => record.studentId === student.id && record.date.startsWith(month));
      const present = rows.filter(row => row.status === 'P').length;
      const absent = rows.filter(row => row.status === 'A').length;
      const markedDays = present + absent;
      const rate = markedDays ? Math.round((present / markedDays) * 1000) / 10 : 0;
      return { ...student, present, absent, markedDays, rate };
    }).sort((a, b) => Number(a.rollNo || 0) - Number(b.rollNo || 0) || a.name.localeCompare(b.name));
  }, [selectedScope, students, records, month]);

  const pendingCorrections = corrections.filter(item => norm(item.status) === 'pending');
  const todayAll = classDailySummary.reduce((sum, row) => sum + row.total, 0);
  const todayMarked = classDailySummary.reduce((sum, row) => sum + row.marked, 0);
  const todayPresent = classDailySummary.reduce((sum, row) => sum + row.present, 0);
  const todayAbsent = classDailySummary.reduce((sum, row) => sum + row.absent, 0);

  const decideCorrection = async (request: CloudCorrection, decision: 'approved' | 'rejected') => {
    if (busyDecision) return;
    setBusyDecision(`${request.id}:${decision}`);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/headmaster/attendance/corrections/${encodeURIComponent(request.id)}/decision`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await accessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, note: notes[request.id] || '' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Attendance correction decision could not be saved.');
      setSuccess(decision === 'approved'
        ? `Correction approved. ${request.studentName} attendance was changed ${request.currentStatus} → ${request.requestedStatus} with audit history retained.`
        : `Correction request for ${request.studentName} was rejected; attendance was not changed.`);
      setNotes(previous => ({ ...previous, [request.id]: '' }));
      await refresh();
    } catch (reason: any) {
      setError(reason?.message || 'Attendance correction decision failed.');
    } finally {
      setBusyDecision('');
    }
  };

  const Header = ({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) => (
    <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4"><div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-300">{icon}</div><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Headmaster · Canonical Attendance</div><h2 className="mt-2 text-2xl font-black">{title}</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">{subtitle}</p></div></div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
      </div>
      <div className="mt-5 text-[10px] font-bold text-slate-400">{snapshot?.academicYear?.year || 'Current academic year'} · {user.name || 'Headmaster'} · school-scoped cloud records only</div>
    </div>
  );

  const Alerts = () => <>
    {loading && <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs font-bold text-cyan-800"><Loader2 className="mr-2 inline h-4 w-4 animate-spin"/>Loading canonical attendance…</div>}
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800"><AlertTriangle className="mr-2 inline h-4 w-4"/>{error}</div>}
    {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4"/>{success}</div>}
  </>;

  const ScopeControls = ({ includeSearch = false }: { includeSearch?: boolean }) => <div className={`grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 ${includeSearch ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
    <label className="text-xs font-bold text-slate-700">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"/></label>
    <label className="text-xs font-bold text-slate-700">Month<input type="month" value={month} onChange={event => setMonth(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"/></label>
    <label className="text-xs font-bold text-slate-700">Class / Division<select value={selectedScope?.id || ''} onChange={event => setScopeId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">{scopes.map(scope => <option key={scope.id} value={scope.id}>{scopeLabel(scope)}</option>)}</select></label>
    {includeSearch && <label className="text-xs font-bold text-slate-700">Search<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Student / GR" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3"/></div></label>}
  </div>;

  const Dashboard = () => <div className="space-y-5">
    <Header title="Attendance Command View" subtitle="Whole-school daily completion, present/absent position and pending historical correction decisions. Headmaster oversight never fabricates or directly rewrites Teacher attendance." icon={<ClipboardCheck className="h-5 w-5"/>}/>
    <Alerts/>
    <div className="max-w-xs rounded-2xl border border-slate-200 bg-white p-4"><label className="text-xs font-bold text-slate-700">Review date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"/></label></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ['Students', todayAll, <Users className="h-5 w-5"/>],
        ['Marked on Date', todayMarked, <ClipboardCheck className="h-5 w-5"/>],
        ['Present', todayPresent, <CheckCircle2 className="h-5 w-5"/>],
        ['Absent', todayAbsent, <XCircle className="h-5 w-5"/>],
        ['Pending Corrections', pendingCorrections.length, <FileClock className="h-5 w-5"/>],
      ].map(([label, value, icon]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-cyan-700">{icon as React.ReactNode}</div><div className="mt-3 text-2xl font-black text-slate-950">{String(value)}</div><div className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">{String(label)}</div></div>)}
    </div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Class</th><th className="p-3">Class Teacher</th><th className="p-3">Roster</th><th className="p-3">Marked</th><th className="p-3">Present</th><th className="p-3">Absent</th><th className="p-3">Completion</th></tr></thead><tbody>{classDailySummary.map(row => <tr key={row.scope.id} className="border-t"><td className="p-3 font-black">{scopeLabel(row.scope)}</td><td className="p-3">{row.scope.classTeacher}</td><td className="p-3">{row.total}</td><td className="p-3">{row.marked}</td><td className="p-3 font-black text-emerald-700">{row.present}</td><td className="p-3 font-black text-rose-700">{row.absent}</td><td className="p-3">{row.total > 0 && row.pending === 0 ? <span className="font-black text-emerald-700">Complete</span> : <span className="font-black text-amber-700">{row.pending} pending</span>}</td></tr>)}{!classDailySummary.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400">No active class/division scopes were found.</td></tr>}</tbody></table></div>
  </div>;

  const Daily = () => <div className="space-y-5">
    <Header title="Daily Roll-call Audit" subtitle="Read-only Headmaster review of the Class Teacher’s submitted P/A attendance. Historical edits are handled only through the correction-approval workflow." icon={<CalendarDays className="h-5 w-5"/>}/>
    <Alerts/><ScopeControls includeSearch/>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600"><b>{scopeLabel(selectedScope)}</b> · Class Teacher: <b>{selectedScope?.classTeacher || 'Not Assigned'}</b> · Submitted {dailyRecords.length}/{students.filter(student => selectedScope && student.classId === selectedScope.classId && String(student.divisionId || '') === String(selectedScope.divisionId || '') && studentActiveOnDate(student, date)).length}</div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Roll</th><th className="p-3">GR No</th><th className="p-3">Student</th><th className="p-3">Attendance</th><th className="p-3">Source</th></tr></thead><tbody>{selectedStudents.map(student => { const row = dailyByStudent.get(student.id); return <tr key={student.id} className="border-t"><td className="p-3">{student.rollNo || '—'}</td><td className="p-3 font-mono">{student.grNumber || '—'}</td><td className="p-3 font-black">{student.name}</td><td className="p-3">{row ? <span className={`rounded-full px-3 py-1 text-[10px] font-black ${row.status === 'P' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{row.status}</span> : <span className="font-black text-amber-700">UNMARKED</span>}</td><td className="p-3 text-slate-500">{row?.source || '—'}</td></tr>})}{!selectedStudents.length && <tr><td colSpan={5} className="p-8 text-center text-slate-400">No student roster is available for this class/division.</td></tr>}</tbody></table></div>
  </div>;

  const SubjectAttendance = () => <div className="space-y-5">
    <Header title="Subject-wise Attendance" subtitle="EDUNIXO does not invent period/subject attendance from daily P/A records. This page shows the canonical readiness state until a separate subject-attendance capture source is installed." icon={<FileText className="h-5 w-5"/>}/>
    <Alerts/>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"><AlertTriangle className="mr-2 inline h-5 w-5"/><b>Separate subject-wise attendance is not currently recorded in the canonical attendance table.</b> Daily Class Teacher attendance remains authoritative. No subject attendance percentage is derived from timetable rows because that would create data that was never actually marked.</div>
    <ScopeControls/>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Daily marked</div><div className="mt-1 text-2xl font-black">{dailyRecords.length}</div></div><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Present</div><div className="mt-1 text-2xl font-black text-emerald-700">{dailyRecords.filter(row => row.status === 'P').length}</div></div><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Absent</div><div className="mt-1 text-2xl font-black text-rose-700">{dailyRecords.filter(row => row.status === 'A').length}</div></div></div>
  </div>;

  const Monthly = () => <div className="space-y-5">
    <Header title="Monthly Attendance Register" subtitle="Canonical month summary by student. Percentages use only actually recorded P/A days; holidays or unmarked dates are never counted as attendance." icon={<CalendarDays className="h-5 w-5"/>}/>
    <Alerts/><ScopeControls includeSearch/>
    <div id="headmaster-monthly-attendance-print" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4"><div className="text-lg font-black">{snapshot?.school?.schoolName || snapshot?.school?.school_name || 'School Attendance Register'}</div><div className="text-xs text-slate-500">{scopeLabel(selectedScope)} · {month} · Academic Year {snapshot?.academicYear?.year || '—'} · Class Teacher {selectedScope?.classTeacher || 'Not Assigned'}</div></div>
      <table className="w-full min-w-[760px] border-collapse text-xs"><thead><tr className="bg-slate-50"><th className="border p-2">Roll</th><th className="border p-2">GR No</th><th className="border p-2 text-left">Student</th><th className="border p-2">Present</th><th className="border p-2">Absent</th><th className="border p-2">Recorded Days</th><th className="border p-2">Attendance %</th></tr></thead><tbody>{monthlyStudentRows.filter(student => !search || norm(student.name).includes(norm(search)) || norm(student.grNumber).includes(norm(search))).map(student => <tr key={student.id}><td className="border p-2 text-center">{student.rollNo || '—'}</td><td className="border p-2 text-center font-mono">{student.grNumber || '—'}</td><td className="border p-2 font-bold">{student.name}</td><td className="border p-2 text-center font-black text-emerald-700">{student.present}</td><td className="border p-2 text-center font-black text-rose-700">{student.absent}</td><td className="border p-2 text-center">{student.markedDays}</td><td className="border p-2 text-center font-black">{student.markedDays ? `${student.rate}%` : '—'}</td></tr>)}</tbody></table>
    </div>
    <button onClick={() => printSectionById('headmaster-monthly-attendance-print', `Headmaster Attendance Register - ${scopeLabel(selectedScope)} - ${month}`)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Print / PDF Monthly Register</button>
  </div>;

  const Reports = () => {
    const monthRows = scopes.map(scope => {
      const scopeRecords = records.filter(record => record.date.startsWith(month) && record.classId === scope.classId && String(record.divisionId || '') === String(scope.divisionId || ''));
      const present = scopeRecords.filter(row => row.status === 'P').length;
      const absent = scopeRecords.filter(row => row.status === 'A').length;
      const total = present + absent;
      return { scope, present, absent, total, rate: total ? Math.round((present / total) * 1000) / 10 : 0 };
    });
    return <div className="space-y-5">
      <Header title="Attendance Reports & Analytics" subtitle="School-wide class comparison from canonical student attendance. Rates are based only on recorded P/A entries for the selected month." icon={<BarChart3 className="h-5 w-5"/>}/>
      <Alerts/><ScopeControls/>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Class</th><th className="p-3">Class Teacher</th><th className="p-3">Recorded P/A</th><th className="p-3">Present</th><th className="p-3">Absent</th><th className="p-3">Rate</th></tr></thead><tbody>{monthRows.map(row => <tr key={row.scope.id} className="border-t"><td className="p-3 font-black">{scopeLabel(row.scope)}</td><td className="p-3">{row.scope.classTeacher}</td><td className="p-3">{row.total}</td><td className="p-3 font-black text-emerald-700">{row.present}</td><td className="p-3 font-black text-rose-700">{row.absent}</td><td className="p-3 font-black">{row.total ? `${row.rate}%` : '—'}</td></tr>)}</tbody></table></div>
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-6 text-cyan-900"><ShieldCheck className="mr-2 inline h-4 w-4"/>Canonical source: <b>edunixo_attendance_entries</b>. Browser-only Attendance Manager data is not used for these Headmaster reports.</div>
    </div>;
  };

  const Corrections = () => <div className="space-y-5">
    <Header title="Attendance Correction Approval" subtitle="Teacher/Class Teacher historical correction requests require Headmaster review. Approval updates the existing attendance row through the installed audited database trigger; rejection leaves attendance unchanged." icon={<FileClock className="h-5 w-5"/>}/>
    <Alerts/>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Pending</div><div className="mt-1 text-2xl font-black text-amber-700">{pendingCorrections.length}</div></div><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Approved</div><div className="mt-1 text-2xl font-black text-emerald-700">{corrections.filter(row => norm(row.status) === 'approved').length}</div></div><div className="rounded-2xl border bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Rejected</div><div className="mt-1 text-2xl font-black text-rose-700">{corrections.filter(row => norm(row.status) === 'rejected').length}</div></div></div>
    <div className="space-y-3">{corrections.map(request => <div key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{request.studentName} <span className="font-mono text-xs text-slate-400">GR {request.grNumber || '—'}</span></h3><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${statusPill(request.status)}`}>{request.status}</span></div><div className="mt-2 text-sm font-black text-slate-800">{request.date} · {request.currentStatus} → {request.requestedStatus}</div><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">{request.reason}</p>{request.reviewNote && <p className="mt-2 text-xs text-slate-500">Review note: {request.reviewNote}</p>}</div>{norm(request.status) === 'pending' && <div className="w-full xl:max-w-md"><textarea rows={2} value={notes[request.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [request.id]: event.target.value }))} placeholder="Headmaster review note (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><div className="mt-3 flex flex-wrap gap-2"><button disabled={Boolean(busyDecision)} onClick={() => void decideCorrection(request, 'approved')} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Approve & Apply</button><button disabled={Boolean(busyDecision)} onClick={() => void decideCorrection(request, 'rejected')} className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Reject</button>{busyDecision.startsWith(`${request.id}:`) && <Loader2 className="h-5 w-5 animate-spin text-cyan-700"/>}</div></div>}</div></div>)}{!corrections.length && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No attendance correction requests are recorded.</div>}</div>
  </div>;

  switch (activeFeatureId) {
    case 'daily-roll-call': return <Daily/>;
    case 'subject-attendance': return <SubjectAttendance/>;
    case 'monthly-attendance-register': return <Monthly/>;
    case 'attendance-reports': return <Reports/>;
    case 'attendance-corrections': return <Corrections/>;
    case 'attendance-dashboard':
    default: return <Dashboard/>;
  }
}
