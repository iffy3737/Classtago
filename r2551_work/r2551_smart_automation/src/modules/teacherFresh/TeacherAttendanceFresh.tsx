import React, { useEffect, useMemo, useState } from 'react';
import { schoolCurrentMonthKey, schoolRelativeDateKey, schoolTodayKey } from '../../lib/schoolDate';
import { CalendarDays, Cloud, FileClock, History, Save, UserRoundCheck, WandSparkles, XCircle } from 'lucide-react';
import type { AttendanceCorrectionRequest, AttendanceEntry, AttendanceStudent, CalendarDay, SwiftChatStatus, TeacherCloudContext, TeacherScopeAssignment } from './types';
import { createAttendanceCorrectionRequest, getCalendarDay, listMyAttendanceCorrectionRequests, loadAttendanceForDate, loadAttendanceMonth, loadAttendanceRoster, loadSwiftChatStatus, saveDailyAttendance } from './teacherFreshService';
import { SmartPrintDialog } from '../teacherAcademicFresh/components/SmartPrintDialog';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getPhase1Cache, putPhase1Cache, queuePhase1Action } from '../../lib/phase1Offline';
import { useCollaborationWarning } from '../../hooks/useCollaborationWarning';
import { collaborationRecordKey } from '../../lib/phase6Collaboration';

export type AttendanceView = 'daily' | 'catalogue' | 'history' | 'correction' | 'sync';
interface Props { context: TeacherCloudContext | null; loading: boolean; error?: string; view: AttendanceView; }

function uniqueClassScopes(assignments: TeacherScopeAssignment[]) {
  const map = new Map<string, TeacherScopeAssignment>();
  assignments
    .filter(a => a.isClassTeacher || a.scopeType === 'class_teacher')
    .forEach(a => {
      const key = `${a.classId}:${a.divisionId || ''}`;
      if (!map.has(key) || a.scopeType === 'class_teacher') map.set(key, a);
    });
  return [...map.values()];
}
function ScopePicker({ scopes, value, onChange }: { scopes: TeacherScopeAssignment[]; value: string; onChange: (id: string) => void }) {
  return <label className="grid gap-1 text-xs font-bold text-slate-600"><span>My Class Teacher Class / Division</span><select value={value} onChange={e => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"><option value="">Select Class Teacher class</option>{scopes.map(s => <option key={s.id} value={s.id}>{s.className} · {s.division}{s.isClassTeacher ? ' · Class Teacher' : ''}</option>)}</select></label>;
}
function Empty({ message, warning=false }: { message: string; warning?: boolean }) { return <div className={`rounded-xl border border-dashed p-5 text-sm ${warning ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>{message}</div>; }
function isActiveOn(student: AttendanceStudent, date: string) { const inactive = ['inactive','disabled','passout','passed out','archived','transferred','leaving'].includes(String(student.status || '').toLowerCase()); return !(student.admissionDate && date < student.admissionDate) && !(student.leavingDate && date > student.leavingDate) && !(inactive && !student.leavingDate); }

function DailyAttendance({ context }: { context: TeacherCloudContext }) {
  const scopes = useMemo(() => uniqueClassScopes(context.assignments), [context]);
  const [scopeId, setScopeId] = useState(scopes[0]?.id || '');
  const [date, setDate] = useState(() => schoolTodayKey());
  const [roster, setRoster] = useState<AttendanceStudent[]>([]);
  const [values, setValues] = useState<Record<string, 'P'|'A'>>({});
  const [calendar, setCalendar] = useState<CalendarDay>({ date, isWorkingDay: true, locked: false });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const online = useOnlineStatus();
  const scope = scopes.find(s => s.id === scopeId) || null;
  const today = schoolTodayKey();
  const localScope = { schoolId: context.schoolId, userId: context.userId };
  const cacheKey = scope ? `${scope.id}:${date}` : '';
  const collaborationKey = cacheKey ? collaborationRecordKey('attendance', cacheKey) : '';
  const otherEditors = useCollaborationWarning(collaborationKey, Boolean(scope));

  const load = async () => {
    if (!scope) { setRoster([]); setValues({}); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const [r,c,e] = await Promise.all([loadAttendanceRoster(scope), getCalendarDay(context.schoolId,date), loadAttendanceForDate(scope,date)]);
      const next:Record<string,'P'|'A'>={}; (e as AttendanceEntry[]).forEach(x=>next[x.studentId]=x.status);
      setRoster(r); setCalendar(c); setValues(next);
      await putPhase1Cache(localScope, 'attendance_daily', cacheKey, { roster:r, calendar:c, values:next, cachedAt:new Date().toISOString() });
    } catch(err:any) {
      const cached = await getPhase1Cache<{roster:AttendanceStudent[];calendar:CalendarDay;values:Record<string,'P'|'A'>;cachedAt:string}>(localScope, 'attendance_daily', cacheKey);
      if (cached) {
        setRoster(cached.roster || []); setCalendar(cached.calendar || {date,isWorkingDay:true,locked:false}); setValues(cached.values || {});
        setMessage(`Offline cached attendance loaded${cached.cachedAt ? ` · ${new Date(cached.cachedAt).toLocaleString()}` : ''}. Changes will sync automatically when internet returns.`);
      } else setError(err?.message||'Unable to load attendance. Open this class once online before using it offline.');
    } finally { setBusy(false); }
  };

  useEffect(() => { let cancelled=false; if(cancelled)return; void load(); return()=>{cancelled=true}; },[scopeId,date,context.schoolId]);
  useEffect(() => {
    const onSync=(event:any)=>{ if(event?.detail?.kind==='attendance_save' && event?.detail?.recordKey===cacheKey && event?.detail?.ok) { setMessage('Offline attendance synced safely to EDUNIXO cloud.'); if(navigator.onLine) void load(); } };
    const onRealtime=(event:any)=>{ if(event?.detail?.table==='edunixo_attendance_entries' && navigator.onLine) void load(); };
    window.addEventListener('edunixo_phase1_sync',onSync as EventListener); window.addEventListener('edunixo_realtime_change',onRealtime as EventListener);
    return()=>{window.removeEventListener('edunixo_phase1_sync',onSync as EventListener);window.removeEventListener('edunixo_realtime_change',onRealtime as EventListener);};
  },[cacheKey]);

  const active = roster.filter(s => isActiveOn(s,date));
  const p = active.filter(s => values[s.id] === 'P').length;
  const a = active.filter(s => values[s.id] === 'A').length;
  const unmarked = active.filter(s => !values[s.id]).length;
  const directEditAllowed = date === today && calendar.isWorkingDay && !calendar.locked;
  const markAllPresent = () => setValues(v => ({...v, ...Object.fromEntries(active.map(s => [s.id,'P']))}));
  const clear = () => setValues({});
  const save = async()=>{
    if(!scope)return; setBusy(true); setError(''); setMessage('');
    try{
      if (unmarked>0) throw new Error(`Mark every active student before Save. ${unmarked} student(s) are still unmarked.`);
      if (!online) {
        const capturedAt = new Date().toISOString();
        await queuePhase1Action({ kind:'attendance_save', scope:localScope, recordKey:cacheKey, capturedAt, payload:{ context, assignment:scope, date, values, calendarDay:calendar } });
        await putPhase1Cache(localScope,'attendance_daily',cacheKey,{roster,calendar,values,cachedAt:capturedAt});
        setMessage('Attendance saved securely on this device. It will sync automatically when internet returns.');
      } else {
        await saveDailyAttendance({context,assignment:scope,date,values,calendarDay:calendar});
        await putPhase1Cache(localScope,'attendance_daily',cacheKey,{roster,calendar,values,cachedAt:new Date().toISOString()});
        setMessage('Attendance saved to EDUNIXO cloud. Historical edits require Correction Request.');
      }
    }catch(e:any){setError(e?.message||'Save failed.');}finally{setBusy(false);}
  };

  return <div className="space-y-5" data-testid="daily-attendance-complete">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-3 py-1 font-black ${online?'bg-emerald-50 text-emerald-700':'bg-amber-100 text-amber-800'}`}>{online?'Online · Cloud sync active':'Offline · Secure device draft mode'}</span>{!online&&<span className="text-slate-500">Final cloud save happens automatically after reconnection.</span>}</div>
      {otherEditors>0&&<div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">Another EDUNIXO session is currently editing this same attendance sheet. You can continue, but review before saving; server conflict protection remains active.</div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]"><ScopePicker scopes={scopes} value={scopeId} onChange={setScopeId}/><label className="grid gap-1 text-xs font-bold text-slate-600"><span>Date</span><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><div className="flex items-end gap-2"><button disabled={busy||!scope||!directEditAllowed||!active.length} onClick={markAllPresent} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black disabled:opacity-40"><WandSparkles className="h-4 w-4"/>Mark All P</button><button disabled={busy||!directEditAllowed} onClick={clear} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black disabled:opacity-40"><XCircle className="h-4 w-4"/>Clear</button></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">Present {p}</span><span className="rounded-full bg-rose-50 px-3 py-1 font-bold text-rose-700">Absent {a}</span><span className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">Unmarked {unmarked}</span><span className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700">Active {active.length}</span>{(!calendar.isWorkingDay||calendar.locked)&&<span className="rounded-full bg-slate-900 px-3 py-1 font-bold text-white">Holiday / Locked{calendar.label?` · ${calendar.label}`:''}</span>}{date < today && <span className="rounded-full bg-violet-50 px-3 py-1 font-bold text-violet-700">Historical · Correction Request only</span>}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-slate-500">Daily Teacher marking is P/A only. Offline drafts are encrypted locally and conflict-checked before cloud sync.</p><button disabled={busy||!scope||!directEditAllowed||unmarked>0||!active.length} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"><Save className="h-4 w-4"/>{online?'Save Attendance':'Save Offline'}</button></div>
      {error&&<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}{message&&<p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{message}</p>}
    </div>
    {!scope ? <Empty warning message="No Class Teacher Class / Division is assigned to this account. The Headmaster must assign Class Teacher duty before student attendance can be marked."/> : roster.length === 0 && !busy ? <Empty warning message="No cached/cloud Student Master roster matched this Class / Division. Open this class once while online."/> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="p-3">Roll</th><th className="p-3">GR No.</th><th className="p-3">Student</th><th className="p-3 text-center">Present</th><th className="p-3 text-center">Absent</th><th className="p-3">Rule / Status</th></tr></thead><tbody>{roster.map(s=>{const rowActive=isActiveOn(s,date);return <tr key={s.id} className="border-t border-slate-100"><td className="p-3">{s.rollNumber||'—'}</td><td className="p-3 font-mono text-xs">{s.grNumber}</td><td className="p-3 font-bold text-slate-900">{s.fullName}</td><td className="p-3 text-center"><button disabled={!rowActive||!directEditAllowed} onClick={()=>setValues(v=>({...v,[s.id]:'P'}))} className={`rounded-lg px-4 py-2 text-xs font-black ${values[s.id]==='P'?'bg-emerald-600 text-white':'bg-emerald-50 text-emerald-700'} disabled:opacity-30`}>P</button></td><td className="p-3 text-center"><button disabled={!rowActive||!directEditAllowed} onClick={()=>setValues(v=>({...v,[s.id]:'A'}))} className={`rounded-lg px-4 py-2 text-xs font-black ${values[s.id]==='A'?'bg-rose-600 text-white':'bg-rose-50 text-rose-700'} disabled:opacity-30`}>A</button></td><td className="p-3 text-xs text-slate-500">{rowActive?(values[s.id]?'Marked':'Awaiting P/A'):s.admissionDate&&date<s.admissionDate?'Before admission':'After leaving'}</td></tr>})}</tbody></table></div></div>}
  </div>;
}

function MonthlyCatalogue({ context, historyOnly=false }: { context: TeacherCloudContext; historyOnly?: boolean }) {
  const scopes=useMemo(()=>uniqueClassScopes(context.assignments),[context]);
  const [scopeId,setScopeId]=useState(scopes[0]?.id||''); const [month,setMonth]=useState(()=>schoolCurrentMonthKey()); const [tab,setTab]=useState<'summary'|'students'|'daily'>(historyOnly?'daily':'summary'); const [data,setData]=useState<any>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const scope=scopes.find(s=>s.id===scopeId)||null;
  useEffect(()=>{ if(!scope){setData(null);return;} let c=false;(async()=>{setBusy(true);setError('');try{const d=await loadAttendanceMonth(scope,month);if(!c)setData(d);}catch(e:any){if(!c)setError(e?.message||'Unable to load monthly catalogue.');}finally{if(!c)setBusy(false);}})();return()=>{c=true}},[scopeId,month]);
  const daysInMonth=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(); const entryMap=new Map<string,string>(); (data?.entries||[]).forEach((e:any)=>entryMap.set(`${e.student_id}:${e.attendance_date}`,e.status)); const calendarMap=new Map<string,any>(); (data?.calendar||[]).forEach((d:any)=>calendarMap.set(d.calendar_date,d)); const roster:AttendanceStudent[]=data?.roster||[];
  const recordedDates=[...new Set((data?.entries||[]).map((e:any)=>String(e.attendance_date||'')).filter(Boolean))] as string[];
  const schoolToday=schoolTodayKey();
  const configuredWorkingDates=(data?.calendar||[]).filter((d:any)=>d.is_working_day===true).map((d:any)=>String(d.calendar_date||'')).filter(Boolean);
  const workingDateKeys=[...new Set((configuredWorkingDates.length?configuredWorkingDates:recordedDates).filter((dateKey:string)=>dateKey.slice(0,7)===month && (month!==schoolToday.slice(0,7)||dateKey<=schoolToday)))].sort();
  const workingDays=workingDateKeys.length;
  const counts=roster.map(s=>{let p=0,a=0;const eligibleWorkingDates=workingDateKeys.filter(ds=>(!s.admissionDate||ds>=s.admissionDate)&&(!s.leavingDate||ds<=s.leavingDate));for(const ds of eligibleWorkingDates){const v=entryMap.get(`${s.id}:${ds}`);if(v==='P')p++;if(v==='A')a++;}return {student:s,p,a,eligibleDays:eligibleWorkingDates.length};});
  const normalizedGender=(value:unknown)=>String(value||'').trim().toLowerCase(); const boys=counts.filter(x=>['male','boy','m'].includes(normalizedGender(x.student.gender))); const girls=counts.filter(x=>['female','girl','f'].includes(normalizedGender(x.student.gender))); const avg=(rows:typeof counts)=>{const denominator=rows.reduce((sum,x)=>sum+x.eligibleDays,0);return denominator?rows.reduce((sum,x)=>sum+x.p,0)/denominator:0;};
  const first=`${month}-01`; const last=`${month}-${String(daysInMonth).padStart(2,'0')}`; const onFirst=roster.filter(s=>!s.admissionDate||s.admissionDate<=first).length; const newAdmitted=roster.filter(s=>s.admissionDate&&s.admissionDate>first&&s.admissionDate<=last).length; const struck=roster.filter(s=>s.leavingDate&&s.leavingDate>=first&&s.leavingDate<=last).length; const onLast=roster.filter(s=>(!s.admissionDate||s.admissionDate<=last)&&(!s.leavingDate||s.leavingDate>last)).length;

  return <div className="space-y-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-2"><ScopePicker scopes={scopes} value={scopeId} onChange={setScopeId}/><label className="grid gap-1 text-xs font-bold text-slate-600"><span>Month</span><input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label></div>{!historyOnly&&<div className="mt-4 flex flex-wrap gap-2">{([['summary','Page 1 · Summary'],['students','Page 2 · Student Details'],['daily','Page 3 · Daily Attendance']] as const).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-black ${tab===id?'bg-slate-950 text-white':'border border-slate-200 bg-white text-slate-700'}`}>{label}</button>)}<SmartPrintDialog targetId="teacher-attendance-catalogue-print" /></div>}</div>
    {!scope ? <Empty warning message="No Class Teacher Class / Division is assigned for the Attendance Catalogue."/> : error ? <Empty warning message={error}/> : busy ? <Empty message="Loading monthly catalogue from cloud…"/> : <div id="teacher-attendance-catalogue-print" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 text-center"><h2 className="text-lg font-black">{context.schoolName}</h2><p className="mt-1 text-xs text-slate-500">Attendance Catalogue · {scope.className} · {scope.division} · {month} · {context.academicYear}</p><p className="mt-1 text-xs font-bold text-slate-700">Class Teacher: {scope.isClassTeacher ? context.teacherName : 'Not linked in this Teacher scope'}</p></div>
      {tab==='summary'&&<div className="p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['On first day of month',onFirst],['New Admitted',newAdmitted],['Name Struck Off',struck],['Total',roster.length],['On last day of month',onLast]].map(([l,v])=><div key={String(l)} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-black uppercase text-slate-500">{l}</p><p className="mt-2 text-2xl font-black">{v}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border p-4"><b>Paying</b><p className="mt-1 text-sm text-slate-500">Not configured in Student Master</p></div><div className="rounded-xl border p-4"><b>Free</b><p className="mt-1 text-sm text-slate-500">Not configured in Student Master</p></div><div className="rounded-xl border p-4"><b>Total</b><p className="mt-1 text-2xl font-black">{roster.length}</p></div></div><div className="mt-5"><h3 className="text-sm font-black text-slate-900">Average Attendance</h3><p className="mt-1 text-xs text-slate-500">Calculated only over each student's eligible working days; holidays, pre-admission days, post-leaving days and future days are excluded.</p></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><b>Boys Average</b><p className="text-2xl font-black">{workingDays?(avg(boys)*100).toFixed(1)+'%':'Not configured'}</p></div><div className="rounded-xl bg-slate-50 p-4"><b>Girls Average</b><p className="text-2xl font-black">{workingDays?(avg(girls)*100).toFixed(1)+'%':'Not configured'}</p></div><div className="rounded-xl bg-slate-50 p-4"><b>Total Average</b><p className="text-2xl font-black">{workingDays?(avg(counts)*100).toFixed(1)+'%':'Not configured'}</p></div></div><div className="mt-8 flex justify-between gap-4 text-sm"><span>Class Teacher Signature __________________</span><span>Headmaster Signature __________________</span></div></div>}
      {tab==='students'&&<div className="overflow-x-auto p-3"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-50"><tr><th className="p-2">Sr</th><th className="p-2">GR No.</th><th className="p-2">Exam Seat No.</th><th className="p-2">Mobile No.</th><th className="p-2">Date of Birth</th><th className="p-2">Aadhaar Card No.</th><th className="p-2 text-left">Name of Student</th></tr></thead><tbody>{roster.map((s,i)=><tr key={s.id} className="border-t"><td className="p-2 text-center">{i+1}</td><td className="p-2">{s.grNumber}</td><td className="p-2">{s.examSeatNo||'—'}</td><td className="p-2">{s.contactNumber||'—'}</td><td className="p-2">{s.dateOfBirth||'—'}</td><td className="p-2">{s.aadhaarNumber||'—'}</td><td className="p-2 font-bold">{s.fullName}</td></tr>)}{!roster.length&&<tr><td colSpan={7} className="p-6 text-center text-slate-500">No Student Master roster matched this Class / Division.</td></tr>}</tbody></table></div>}
      {tab==='daily'&&<div className="overflow-x-auto p-3"><table className="min-w-[1500px] text-[10px]"><thead><tr><th className="sticky left-0 bg-white p-2 text-left">Student</th>{Array.from({length:daysInMonth},(_,i)=><th key={i} className={`p-1 text-center ${calendarMap.get(`${month}-${String(i+1).padStart(2,'0')}`)?.is_working_day===false?'bg-slate-800 text-white':''}`}>{i+1}</th>)}<th className="p-2">P</th><th className="p-2">A</th><th className="p-2">Avg %</th><th className="p-2">Remarks</th></tr></thead><tbody>{counts.map(x=><tr key={x.student.id} className="border-t"><td className="sticky left-0 bg-white p-2 font-bold">{x.student.fullName}</td>{Array.from({length:daysInMonth},(_,i)=>{const ds=`${month}-${String(i+1).padStart(2,'0')}`;const cal=calendarMap.get(ds);const pre=x.student.admissionDate&&ds<x.student.admissionDate;const post=x.student.leavingDate&&ds>x.student.leavingDate;const v=entryMap.get(`${x.student.id}:${ds}`);return <td key={ds} className={`p-1 text-center font-black ${cal?.is_working_day===false?'bg-slate-800 text-white':pre||post?'bg-slate-100 text-slate-300':v==='A'?'text-rose-600':v==='P'?'text-emerald-700':''}`}>{cal?.is_working_day===false?'H':pre||post?'—':v||''}</td>})}<td className="p-2 font-bold">{x.p}</td><td className="p-2 font-bold">{x.a}</td><td className="p-2 font-bold">{x.eligibleDays ? `${(x.p/x.eligibleDays*100).toFixed(1)}%` : '—'}</td><td className="p-2">{x.student.leavingReason||''}</td></tr>)}</tbody></table><p className="mt-4 text-xs text-slate-500">Total Working Days of Month: {workingDays || 'Not configured'} · Historical cells are read-only. Use Attendance Correction Request for past changes.</p></div>}
    </div>}
  </div>;
}

function Correction({ context }: { context: TeacherCloudContext }) {
  const scopes = useMemo(() => uniqueClassScopes(context.assignments), [context]);
  const [scopeId, setScopeId] = useState(scopes[0]?.id || '');
  const yesterday = schoolRelativeDateKey(-1);
  const [date, setDate] = useState(yesterday);
  const [roster, setRoster] = useState<AttendanceStudent[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [studentId, setStudentId] = useState('');
  const [current, setCurrent] = useState<'P'|'A'>('P');
  const [requested, setRequested] = useState<'P'|'A'>('A');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const scope = scopes.find(s => s.id === scopeId) || null;
  const selectedEntry = entries.find(x => x.studentId === studentId) || null;

  const reload = async () => {
    if (!scope) { setRoster([]); setEntries([]); return; }
    try {
      const [r, e, q] = await Promise.all([
        loadAttendanceRoster(scope),
        loadAttendanceForDate(scope, date),
        listMyAttendanceCorrectionRequests(context.userId),
      ]);
      setRoster(r); setEntries(e); setRequests(q);
      setStudentId(prev => r.some(x => x.id === prev) ? prev : (r[0]?.id || ''));
      setErr('');
    } catch (e: any) { setErr(e?.message || 'Unable to load corrections.'); }
  };
  useEffect(() => { void reload(); }, [scopeId, date]);
  useEffect(() => {
    const e = entries.find(x => x.studentId === studentId);
    if (e) { setCurrent(e.status); setRequested(e.status === 'P' ? 'A' : 'P'); }
  }, [studentId, entries]);

  const submit = async () => {
    if (!scope || !studentId || !selectedEntry) return;
    setErr(''); setMsg('');
    try {
      await createAttendanceCorrectionRequest({ context, assignment: scope, studentId, date, currentStatus: current, requestedStatus: requested, reason });
      setMsg('Correction request submitted for auditable approval.');
      setReason(''); await reload();
    } catch (e: any) { setErr(e?.message || 'Request failed.'); }
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <ScopePicker scopes={scopes} value={scopeId} onChange={setScopeId}/>
        <label className="grid gap-1 text-xs font-bold text-slate-600"><span>Historical Attendance Date</span><input type="date" value={date} max={yesterday} onChange={e=>setDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"/></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600"><span>Student</span><select value={studentId} onChange={e=>setStudentId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5"><option value="">Select student</option>{roster.map(s=><option key={s.id} value={s.id}>{s.fullName} · {s.grNumber}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-xs font-bold text-slate-600"><span>Current</span><select value={current} disabled className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><option>P</option><option>A</option></select></label><label className="grid gap-1 text-xs font-bold text-slate-600"><span>Requested</span><select value={requested} disabled={!selectedEntry} onChange={e=>setRequested(e.target.value as 'P'|'A')} className="rounded-xl border border-slate-200 px-3 py-2.5 disabled:bg-slate-50"><option>P</option><option>A</option></select></label></div>
        <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2"><span>Reason</span><textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Reason for correction (required)"/></label>
      </div>
      {studentId && !selectedEntry && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">No recorded P/A attendance exists for this student on the selected date, so a correction request cannot be fabricated.</p>}
      <button disabled={!scope||!studentId||!selectedEntry||!reason.trim()||current===requested} onClick={submit} className="mt-4 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Submit Correction Request</button>
      {err&&<p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{err}</p>}{msg&&<p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{msg}</p>}
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black">My Correction Requests</h3><div className="mt-3 space-y-2">{requests.map(r=><div key={r.id} className="rounded-xl border border-slate-200 p-3 text-xs"><div className="flex justify-between gap-3"><b>{roster.find(s=>s.id===r.studentId)?.fullName || 'Student'} · {r.attendanceDate} · {r.currentStatus} → {r.requestedStatus}</b><span className="rounded-full bg-slate-100 px-2 py-1 font-bold uppercase">{r.status}</span></div><p className="mt-1 text-slate-500">{r.reason}</p></div>)}{requests.length===0&&<p className="text-sm text-slate-500">No correction requests found.</p>}</div></div>
  </div>;
}

function SyncStatus({context}:{context:TeacherCloudContext}) { const[s,setS]=useState<SwiftChatStatus|null>(null);useEffect(()=>{void loadSwiftChatStatus(context.schoolId).then(setS)},[context.schoolId]);return <div className="space-y-5"><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><div className="flex gap-3"><Cloud className="mt-0.5 h-5 w-5 text-cyan-700"/><div><h2 className="font-black text-cyan-950">SwiftChat / Maharashtra Smart Attendance</h2><p className="mt-1 text-sm text-cyan-800">Auto-Sync Ready only. Official student-wise API/webhook is not claimed until credentials/endpoints are confirmed.</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><b className="text-sm">Official API / Webhook</b><p className="mt-2 text-xl font-black">{s?.officialApiConfigured?'Configured':'Not confirmed'}</p></div><div className="rounded-xl bg-slate-50 p-4"><b className="text-sm">Connector</b><p className="mt-2 text-xl font-black">{s?.connectorEnabled?'Enabled':'Disabled'}</p></div></div><div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-600"><p><b>Primary matching key:</b> Child UID</p><p className="mt-1"><b>Expected payload:</b> School Code, Class, Section, Attendance Date, Child UID, Student Name, Present/Absent, submission/update status.</p><p className="mt-1"><b>Last sync:</b> {s?.lastSyncAt||'Never'}</p>{s?.lastMessage&&<p className="mt-1"><b>Status:</b> {s.lastMessage}</p>}</div></div></div> }

export default function TeacherAttendanceFresh({context,loading,error,view}:Props){ if(loading)return <Empty message="Loading Teacher attendance scope from cloud…"/>; if(error||!context)return <Empty warning message={error||'Teacher cloud context unavailable.'}/>; const title=view==='daily'?'Daily Attendance':view==='catalogue'?'Monthly Catalogue':view==='history'?'Attendance History':view==='correction'?'Attendance Correction Request':'SwiftChat Sync Status'; const Icon=view==='daily'?UserRoundCheck:view==='catalogue'?CalendarDays:view==='history'?History:view==='correction'?FileClock:Cloud; return <div className="space-y-5" data-testid={`attendance-${view}`}><div className="flex items-center gap-3"><div className="rounded-xl bg-slate-950 p-2.5 text-white"><Icon className="h-5 w-5"/></div><div><h1 className="text-xl font-black text-slate-950">{title}</h1><p className="text-xs text-slate-500">Class Teacher assignment only · P/A daily marking · locked holidays · auditable historical correction.</p></div></div>{view==='daily'&&<DailyAttendance context={context}/>} {view==='catalogue'&&<MonthlyCatalogue context={context}/>} {view==='history'&&<MonthlyCatalogue context={context} historyOnly/>} {view==='correction'&&<Correction context={context}/>} {view==='sync'&&<SyncStatus context={context}/>}</div> }
