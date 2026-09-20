import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Bell, BookMarked, BookOpen, CalendarCheck, CheckCircle2, ChevronDown,
  CircleDollarSign, Clock3, Download, FileCheck2, FileText, GraduationCap, Library,
  Link2, Loader2, RefreshCw, School, ShieldCheck, UserRound, UsersRound
} from 'lucide-react';
import type { Language, User } from '../../types';
import type { RoleModuleFeature, RoleVisibleModule } from '../../lib/roleModuleBlueprint';
import type { StudentPortalSnapshot, StudentServiceRequest } from '../studentPortal/studentPortalService';
import {
  loadParentChildLinks, loadParentLeaveApplications, loadParentPortalSnapshot, loadParentServiceRequests,
  markParentNotificationRead, openParentDocument, openParentMaterial, requestAdditionalChildLink,
  submitParentLeaveApplication, submitParentServiceRequest, type ParentChildLinkState
} from './parentPortalService';
import { subscribeMariaDynamicCommands, takePendingMariaDynamicCommands, type MariaParentPortalCommand } from '../../lib/mariaClientBridge';

interface Props {
  lang: Language;
  user: User;
  module: RoleVisibleModule;
  feature?: RoleModuleFeature | null;
  onNavigate?: (moduleId: string, featureId?: string) => void;
}

const text = (value: unknown, fallback = '—') => String(value ?? '').trim() || fallback;
const safeDate = (value: unknown) => {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const statusClass = (value: unknown) => {
  const key = String(value || '').toLowerCase();
  if (/(approved|final|published|paid|active|present|issued|resolved)/.test(key)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (/(reject|cancel|overdue|absent|inactive|failed|revoked)/.test(key)) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

function Empty({ title, body, warning = false }: { title: string; body: string; warning?: boolean }) {
  const Icon = warning ? AlertCircle : FileText;
  return <div className={`rounded-3xl border border-dashed p-7 text-center ${warning ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-white'}`}>
    <Icon className={`mx-auto h-8 w-8 ${warning ? 'text-amber-600' : 'text-slate-400'}`} />
    <div className="mt-3 text-sm font-black text-slate-950">{title}</div><p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-slate-500">{body}</p>
  </div>;
}
function Title({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return <div className="mb-5 flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="h-5 w-5" /></div><div><h2 className="text-base font-black text-slate-950">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p></div></div>;
}
function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon: React.ElementType }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-black text-slate-950">{value}</div>{hint && <div className="mt-1 text-[10px] text-slate-500">{hint}</div>}</div><div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="h-5 w-5" /></div></div></div>;
}
function RecordGrid({ row }: { row: any }) {
  const entries = Object.entries(row || {}).filter(([key, value]) => !['id','metadata','payload','columns','student'].includes(key) && value !== null && value !== undefined && typeof value !== 'object').slice(0, 10);
  return <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([key, value]) => <div key={key} className="rounded-xl bg-slate-50 p-3"><div className="text-[8px] font-black uppercase tracking-wider text-slate-400">{key.replaceAll('_',' ')}</div><div className="mt-1 break-words text-xs font-bold text-slate-800">{text(value)}</div></div>)}</div>;
}
function StudentResultCard({ row, label }: { row: any; label: string }) {
  const student = row?.student && typeof row.student === 'object' ? row.student : row;
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black text-slate-950">{label}</div><span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[9px] font-black uppercase text-cyan-700">{text(row.term, 'Published')}</span></div><div className="mt-4"><RecordGrid row={student} /></div><div className="mt-3 text-[10px] text-slate-400">Updated {safeDate(row.updatedAt)}</div></article>;
}

export default function ParentPortalWorkspace({ user, module, feature, onNavigate }: Props) {
  const [links, setLinks] = useState<ParentChildLinkState>({ children: [], pending: [] });
  const [studentId, setStudentId] = useState('');
  const [snapshot, setSnapshot] = useState<StudentPortalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');
  const [requests, setRequests] = useState<StudentServiceRequest[]>([]);
  const [leaveRows, setLeaveRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [mariaRequestType,setMariaRequestType]=useState<'certificate'|'library'|'profile_correction'|'support'>('certificate');
  const [mariaStatus,setMariaStatus]=useState('');
  const [pendingMaria,setPendingMaria]=useState<MariaParentPortalCommand|null>(null);
  const [leave, setLeave] = useState({ startDate: '', endDate: '', reason: '' });
  const [linkForm, setLinkForm] = useState({ childIdentifier: '', childDob: '' });

  const loadLinks = async () => {
    const next = await loadParentChildLinks();
    setLinks(next);
    setStudentId(current => current && next.children.some(child => child.id === current) ? current : (next.children[0]?.id || ''));
    return next;
  };
  const loadSnapshot = async (selected?: string) => {
    if (!selected) { setSnapshot(null); return; }
    setSnapshot(await loadParentPortalSnapshot(selected));
  };
  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const next = await loadLinks();
      const selected = studentId && next.children.some(child => child.id === studentId) ? studentId : (next.children[0]?.id || '');
      if (selected) await loadSnapshot(selected); else setSnapshot(null);
    } catch (e: any) { setError(e?.message || 'Parent Portal could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [user.id]);
  useEffect(() => {
    if (!studentId) return;
    setLoading(true); setError('');
    loadSnapshot(studentId).catch((e: any) => setError(e?.message || 'Child data could not be loaded.')).finally(() => setLoading(false));
  }, [studentId]);
  useEffect(() => {
    if (!studentId) return;
    if (module.id === 'pa-leave') loadParentLeaveApplications(studentId).then(setLeaveRows).catch(() => setLeaveRows([]));
    if (module.id === 'pa-certificate-requests') loadParentServiceRequests(studentId).then(setRequests).catch(() => setRequests([]));
  }, [module.id, studentId]);

  useEffect(()=>{
    const accept=(command:any)=>{if(command?.type!=='maria_parent_portal')return;setPendingMaria(command as MariaParentPortalCommand);setMariaStatus(command.statusMessage||'Maria is preparing this existing Parent Portal form. Nothing will be submitted automatically.');};
    const unsubscribe=subscribeMariaDynamicCommands(accept);
    for(const command of takePendingMariaDynamicCommands('maria_parent_portal'))accept(command);
    return unsubscribe;
  },[]);

  useEffect(()=>{
    if(!pendingMaria||!links.children.length)return;
    const norm=(value:unknown)=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0600-\u06ff]+/g,' ').trim();
    let target= pendingMaria.studentId ? links.children.find(child=>String(child.id)===String(pendingMaria.studentId)) : undefined;
    if(!target&&pendingMaria.studentName){const n=norm(pendingMaria.studentName);const exact=links.children.filter(child=>norm(child.fullName)===n);const loose=exact.length?exact:links.children.filter(child=>norm(child.fullName).includes(n)||n.includes(norm(child.fullName)));if(loose.length===1)target=loose[0];}
    if(!target&&links.children.length===1)target=links.children[0];
    if(!target){setError('Maria could not uniquely match that child in your Headmaster-approved Parent links.');setMariaStatus('Maria stopped before changing the form.');setPendingMaria(null);return;}
    if(studentId!==target.id){setStudentId(target.id);return;}
    if(pendingMaria.command==='open_child'){
      setMariaStatus(`Maria selected ${target.fullName}. No record was changed.`);
    }else if(pendingMaria.command==='prefill_service_request'){
      setMariaRequestType(pendingMaria.requestType||'certificate');setRequestTitle(String(pendingMaria.title||''));setRequestDetails(String(pendingMaria.details||''));setMariaStatus(`Maria prepared the ${pendingMaria.requestType||'certificate'} request form for ${target.fullName}. Review it and press the existing Submit button yourself.`);
    }else if(pendingMaria.command==='prefill_leave'){
      setLeave({startDate:String(pendingMaria.startDate||''),endDate:String(pendingMaria.endDate||''),reason:String(pendingMaria.reason||'')});setMariaStatus(`Maria prepared the child leave form for ${target.fullName}. Review it and press Submit Child Leave yourself.`);
    }
    setPendingMaria(null);
  },[pendingMaria,links.children,studentId]);

  const profile = snapshot?.profile;
  const unread = snapshot?.notices.rows.filter((row: any) => !row.isRead).length || 0;
  const currentHomework = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (snapshot?.homework.rows || []).filter((row: any) => !row.dueDate || String(row.dueDate) >= today);
  }, [snapshot]);

  if (loading && !links.children.length && !snapshot) return <section className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl"><div className="flex min-h-72 flex-col items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-violet-600"/><h2 className="mt-4 text-lg font-black">Loading secure Parent Portal</h2><p className="mt-2 text-xs text-slate-500">Verifying Headmaster-approved child links and published school records.</p></div></section>;

  const submitService = async (type: 'certificate'|'library'|'profile_correction'|'support') => {
    if (!studentId) return; setBusy(true); setMessage('');
    try { const out = await submitParentServiceRequest(studentId, { type, title: requestTitle, details: requestDetails }); setRequests(prev => [out.request, ...prev]); setRequestTitle(''); setRequestDetails(''); setMariaRequestType('certificate'); setMessage('Request submitted to the school office.'); }
    catch (e: any) { setMessage(e?.message || 'Request failed.'); } finally { setBusy(false); }
  };
  const submitLeave = async () => {
    if (!studentId) return; setBusy(true); setMessage('');
    try { const out = await submitParentLeaveApplication(studentId, { ...leave, leaveType: 'Student Leave' }); if (out.application) setLeaveRows(prev => [out.application, ...prev]); setLeave({ startDate: '', endDate: '', reason: '' }); setMessage('Child leave application submitted for school decision.'); }
    catch (e: any) { setMessage(e?.message || 'Leave request failed.'); } finally { setBusy(false); }
  };
  const submitLink = async () => {
    setBusy(true); setMessage('');
    try { const out = await requestAdditionalChildLink({ childIdentifier: linkForm.childIdentifier, childDob: linkForm.childDob || null }); setMessage(out.message || 'Child-link request sent to the Headmaster.'); setLinkForm({ childIdentifier: '', childDob: '' }); await loadLinks(); }
    catch (e: any) { setMessage(e?.message || 'Child-link request failed.'); } finally { setBusy(false); }
  };
  const openMaterial = async (row: any) => { if (!studentId) return; setOpening(String(row.id)); try { window.open(await openParentMaterial(String(row.id), studentId), '_blank', 'noopener,noreferrer'); } catch (e: any) { setMessage(e?.message || 'Material could not be opened.'); } finally { setOpening(''); } };
  const openDocument = async (row: any) => { if (!studentId) return; if (row.verifyUrl) { window.open(row.verifyUrl, '_blank', 'noopener,noreferrer'); return; } setOpening(String(row.id)); try { window.open(await openParentDocument(String(row.id), studentId), '_blank', 'noopener,noreferrer'); } catch (e: any) { setMessage(e?.message || 'Document could not be opened.'); } finally { setOpening(''); } };

  const header = <div className="relative overflow-hidden bg-slate-950 px-5 py-7 text-white sm:px-8"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-violet-300"><UsersRound className="h-7 w-7"/></div><div><div className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Classtago Parent Portal · Verified child access</div><h1 className="mt-1 text-2xl font-black">{module.label}</h1><p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">{feature?.label || module.description || 'Only Headmaster-approved linked children and published records are visible.'}</p></div></div>{links.children.length > 0 && <label className="min-w-64 text-[10px] font-black uppercase tracking-wider text-slate-400">Selected child<div className="relative mt-2"><select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full appearance-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 pr-10 text-sm font-black normal-case text-white outline-none"><option className="text-slate-950" value="">Choose child</option>{links.children.map(child => <option className="text-slate-950" key={child.id} value={child.id}>{child.fullName} · GR {child.grNumber || '—'}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-300"/></div></label>}</div></div>;

  let content: React.ReactNode = null;
  if (!links.children.length) {
    content = <div className="space-y-5"><Empty warning title="No approved child link yet" body="A Parent account never receives child data by matching a phone number in the browser. Your initial/additional child link must be verified by Student Master evidence and approved by the Headmaster."/>{links.pending.length > 0 && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="font-black text-amber-950">Pending Headmaster approval</div>{links.pending.map(row => <div key={row.id} className="mt-3 rounded-2xl bg-white p-4 text-xs"><b>{row.studentName}</b> · GR {text(row.grNumber)} · {text(row.requestCode)}</div>)}</div>}</div>;
  } else if (!snapshot || !profile) {
    content = <Empty warning title="Selected child data could not load" body={error || 'Choose another verified child or refresh the Parent Portal.'}/>;
  } else if (module.id === 'pa-home') {
    content = <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Attendance" value={snapshot.attendance.rate == null ? '—' : `${snapshot.attendance.rate}%`} hint={`${snapshot.attendance.present} present · ${snapshot.attendance.absent} absent`} icon={CalendarCheck}/><Stat label="Current Homework" value={currentHomework.length} hint="Published & not past due" icon={BookOpen}/><Stat label="Published Results" value={snapshot.results.rows.length} hint={`${snapshot.progressCards.rows.length} progress card(s)`} icon={GraduationCap}/><Stat label="Unread Alerts" value={unread} hint="Parent/School notifications" icon={Bell}/></div><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5"><Title icon={UserRound} title={profile.fullName} subtitle={`${profile.className} · ${profile.divisionName} · GR ${text(profile.grNumber)}`}/><RecordGrid row={{ academicYear: profile.academicYear, rollNo: profile.rollNo, accountStatus: profile.accountStatus, admissionDate: safeDate(profile.admissionDate) }}/></div><div className="rounded-3xl border border-slate-200 bg-white p-5"><Title icon={Bell} title="Latest Parent Alerts" subtitle="Only notifications delivered to this Parent login."/>{snapshot.notices.rows.length ? <div className="space-y-2">{snapshot.notices.rows.slice(0,5).map((row:any)=><div key={row.id} className="rounded-2xl bg-slate-50 p-3"><div className="text-xs font-black text-slate-900">{row.title}</div><div className="mt-1 text-[11px] text-slate-600">{row.body}</div></div>)}</div> : <Empty title="No alerts" body="School and teacher messages will appear here when published to your Parent account."/>}</div></div></div>;
  } else if (module.id === 'pa-children') {
    content = <div className="space-y-6"><Title icon={UsersRound} title="Verified Children" subtitle="Every child shown here has a Headmaster-approved Parent-child link."/><div className="grid gap-4 lg:grid-cols-2">{links.children.map(child => <button key={child.id} onClick={() => setStudentId(child.id)} className={`rounded-3xl border p-5 text-left shadow-sm ${studentId === child.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'}`}><div className="font-black text-slate-950">{child.fullName}</div><div className="mt-2 text-xs text-slate-500">GR {text(child.grNumber)} · {text(child.className)} {text(child.divisionName,'')}</div><span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[9px] font-black ${statusClass(child.status)}`}>{text(child.status,'Active')}</span></button>)}</div><div className="rounded-3xl border border-slate-200 bg-white p-5"><Title icon={School} title="Selected Child Profile" subtitle="Official academic identity is read-only from Student Master."/><RecordGrid row={{ fullName: profile.fullName, grNumber: profile.grNumber, rollNo: profile.rollNo, className: profile.className, divisionName: profile.divisionName, academicYear: profile.academicYear, gender: profile.gender, dob: safeDate(profile.dob), fatherName: profile.fatherName, motherName: profile.motherName, admissionDate: safeDate(profile.admissionDate), examSeatNo: profile.examSeatNo, accountStatus: profile.accountStatus }}/></div></div>;
  } else if (module.id === 'pa-attendance') {
    content = <div className="space-y-5"><Title icon={CalendarCheck} title="Child Attendance" subtitle="Daily published attendance for the selected child only."/><div className="grid gap-4 sm:grid-cols-3"><Stat label="Present" value={snapshot.attendance.present} icon={CheckCircle2}/><Stat label="Absent" value={snapshot.attendance.absent} icon={AlertCircle}/><Stat label="Attendance Rate" value={snapshot.attendance.rate == null ? '—' : `${snapshot.attendance.rate}%`} icon={CalendarCheck}/></div>{snapshot.attendance.rows.length ? <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Remark</th></tr></thead><tbody>{snapshot.attendance.rows.slice(0,120).map((r:any)=><tr key={r.id} className="border-t"><td className="p-3 font-bold">{safeDate(r.date)}</td><td className="p-3"><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(r.status)}`}>{text(r.status)}</span></td><td className="p-3 text-slate-500">{text(r.remarks)}</td></tr>)}</tbody></table></div> : <Empty title="No attendance published" body="Attendance will appear after the school publishes canonical entries."/>}</div>;
  } else if (module.id === 'pa-timetable') {
    content = <div className="space-y-5"><Title icon={Clock3} title="Child Timetable" subtitle="Published weekly timetable plus approved substitutions."/>{snapshot.timetable.rows.length ? <div className="grid gap-3 lg:grid-cols-2">{snapshot.timetable.rows.map((r:any)=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between"><b>{r.dayName} · Period {r.periodNo}</b><span className="text-[10px] text-slate-400">{r.startTime}–{r.endTime}</span></div><div className="mt-2 text-sm font-black text-violet-700">{r.subjectName}</div><div className="text-xs text-slate-500">{r.teacherName}</div></div>)}</div> : <Empty title="No published timetable" body="Only the selected child's class/division timetable is returned."/>}{snapshot.timetable.substitutions.length > 0 && <div><h3 className="mb-3 text-xs font-black uppercase text-slate-500">Upcoming substitutions</h3><div className="space-y-2">{snapshot.timetable.substitutions.map((r:any)=><div key={r.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs"><b>{safeDate(r.date)} · Period {r.periodNo}</b> · {r.subjectName} · {r.substituteTeacherName}</div>)}</div></div>}</div>;
  } else if (module.id === 'pa-homework-material') {
    content = <div className="space-y-7"><div><Title icon={BookOpen} title="Child Homework" subtitle="Teacher-published homework for the selected child's exact class/division."/>{snapshot.homework.rows.length ? <div className="grid gap-4 lg:grid-cols-2">{snapshot.homework.rows.map((r:any)=><article key={r.id} className="rounded-3xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-cyan-700">{r.subjectName} · Due {safeDate(r.dueDate)}</div><div className="mt-2 font-black text-slate-950">{r.title}</div><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">{r.content}</p></article>)}</div> : <Empty title="No homework" body="No published homework is currently available."/>}</div><div><Title icon={BookMarked} title="Study Material" subtitle="Signed file access remains school-scoped and child-scoped."/>{snapshot.materials.rows.length ? <div className="space-y-3">{snapshot.materials.rows.map((r:any)=><div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><b>{r.title}</b><div className="mt-1 text-[10px] text-slate-500">{r.subjectName} · {text(r.kind)}</div></div>{r.hasFile && <button onClick={()=>void openMaterial(r)} disabled={opening===String(r.id)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white disabled:opacity-50">{opening===String(r.id)?'Opening…':'Open Material'}</button>}</div>)}</div> : <Empty title="No study material" body="Published material will appear here."/>}</div></div>;
  } else if (module.id === 'pa-exam-schedule') {
    content = <div><Title icon={GraduationCap} title="Examination Schedule" subtitle="Published examinations for the selected child's class/division."/>{snapshot.exams.rows.length ? <div className="grid gap-3 lg:grid-cols-2">{snapshot.exams.rows.map((r:any)=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-black">{r.examName}</div><div className="mt-1 text-sm font-black text-violet-700">{r.subjectName}</div><div className="mt-2 text-xs text-slate-500">{safeDate(r.date)} · {text(r.startTime)}–{text(r.endTime)} · {text(r.room)}</div>{r.instructions&&<p className="mt-2 text-xs text-slate-600">{r.instructions}</p>}</div>)}</div> : <Empty title="No exam schedule" body="No published examination schedule is available."/>}</div>;
  } else if (module.id === 'pa-results-progress') {
    content = <div className="space-y-7"><div><Title icon={GraduationCap} title="Published Results" subtitle="Read-only Result Book data for the selected child."/>{snapshot.results.rows.length ? <div className="grid gap-4 xl:grid-cols-2">{snapshot.results.rows.map((r:any)=><div key={r.id}><StudentResultCard row={r} label="Result Summary"/></div>)}</div> : <Empty title="No published result" body="Teacher drafts and unapproved class results are never exposed to Parent accounts."/>}</div><div><Title icon={FileCheck2} title="Progress Cards" subtitle="Only final/published Progress Cards are visible."/>{snapshot.progressCards.rows.length ? <div className="grid gap-4 xl:grid-cols-2">{snapshot.progressCards.rows.map((r:any)=><div key={r.id}><StudentResultCard row={r} label="Progress Card"/></div>)}</div> : <Empty title="No progress card" body="Final Progress Cards will appear after publication."/>}</div></div>;
  } else if (module.id === 'pa-fees') {
    content = <div><Title icon={CircleDollarSign} title="Fees & Receipts" subtitle="Selected child's fee ledger/receipt source only."/>{snapshot.fees.rows.length ? <div className="space-y-3">{snapshot.fees.rows.map((r:any,i:number)=><div key={r.id||i} className="rounded-2xl border border-slate-200 bg-white p-4"><RecordGrid row={r}/></div>)}</div> : <Empty title="No fee record available" body="Fee data will appear when the school's canonical fee module publishes a child-linked ledger."/>}</div>;
  } else if (module.id === 'pa-admission-status') {
    content = <div className="space-y-6"><Title icon={School} title="Admission & School Status" subtitle="Read-only Student Master identity plus verified/issued child documents."/><div className="rounded-3xl border border-slate-200 bg-white p-5"><RecordGrid row={{ student:profile.fullName, grNumber:profile.grNumber, class:profile.className, division:profile.divisionName, admissionDate:safeDate(profile.admissionDate), accountStatus:profile.accountStatus }}/></div><div><h3 className="mb-3 font-black">Child Documents</h3>{snapshot.documents.rows.length ? <div className="space-y-3">{snapshot.documents.rows.map((r:any)=><div key={r.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><b>{r.name}</b><div className="mt-1 text-[10px] text-slate-400">{safeDate(r.createdAt)} · {text(r.status)}</div></div>{(r.hasDownload||r.verifyUrl)&&<button onClick={()=>void openDocument(r)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white"><Download className="mr-1 inline h-3.5 w-3.5"/> Open</button>}</div>)}</div> : <Empty title="No linked documents" body="Verified admission documents and official certificates will appear here."/>}</div></div>;
  } else if (module.id === 'pa-leave') {
    content = <div className="space-y-6"><Title icon={CalendarCheck} title="Child Leave Application" subtitle="Parent submits on behalf of the selected child; final school decision stays in the existing leave workflow."/>{message&&<div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold">{message}</div>}<div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">From<input type="date" value={leave.startDate} onChange={e=>setLeave(v=>({...v,startDate:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label><label className="text-xs font-bold">To<input type="date" value={leave.endDate} onChange={e=>setLeave(v=>({...v,endDate:e.target.value}))} className="mt-1 w-full rounded-xl border p-3"/></label></div><textarea value={leave.reason} onChange={e=>setLeave(v=>({...v,reason:e.target.value}))} rows={4} className="mt-3 w-full rounded-xl border p-3 text-xs" placeholder="Reason for child leave"/><button onClick={()=>void submitLeave()} disabled={busy||!leave.startDate||!leave.endDate||leave.reason.trim().length<3} className="mt-3 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?'Submitting…':'Submit Child Leave'}</button></div>{leaveRows.length ? <div className="space-y-3">{leaveRows.map((r:any)=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between"><b>{safeDate(r.startDate)} – {safeDate(r.endDate)}</b><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(r.status)}`}>{r.status}</span></div><div className="mt-2 text-xs text-slate-500">{r.reason}</div></div>)}</div> : <Empty title="No child leave applications" body="Submitted applications will appear here."/>}</div>;
  } else if (module.id === 'pa-certificate-requests') {
    if (feature?.id === 'pa-issued-child-documents') {
      const issued = snapshot.documents.rows.filter((row: any) => row.kind === 'certificate' || /issued/i.test(String(row.status || '')));
      content = <div className="space-y-5"><Title icon={FileCheck2} title="Issued Child Documents" subtitle="Only official, child-linked documents/certificates released by the school are shown."/>{issued.length ? <div className="space-y-3">{issued.map((r:any)=><div key={r.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><b>{r.name}</b><div className="mt-1 text-[10px] text-slate-400">{safeDate(r.createdAt)} · {text(r.status)}{r.certificateNumber?` · ${r.certificateNumber}`:''}</div></div>{(r.hasDownload||r.verifyUrl)&&<button onClick={()=>void openDocument(r)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white"><Download className="mr-1 inline h-3.5 w-3.5"/> Open</button>}</div>)}</div> : <Empty title="No issued document" body="Approved certificates and child documents will appear here after issue."/>}</div>;
    } else if (feature?.id === 'pa-certificate-status') {
      content = <div className="space-y-5"><Title icon={FileCheck2} title="Certificate Request Status" subtitle="Track requests submitted for the selected child."/>{requests.length?<div className="space-y-3">{requests.map(r=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-2"><b>{r.title}</b><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(r.status)}`}>{r.status}</span></div>{r.resolution&&<p className="mt-2 text-xs text-slate-600">{r.resolution}</p>}</div>)}</div>:<Empty title="No certificate request" body="Submitted request status will appear here."/>}</div>;
    } else {
      content = <div className="space-y-6"><Title icon={FileCheck2} title="Request Child Certificate" subtitle="Requests are linked to the selected child and decided through the existing Student Service Request desk."/>{message&&<div className="rounded-2xl border bg-white p-4 text-xs font-bold">{message}</div>}<div className="rounded-3xl border border-slate-200 bg-white p-5"><input value={requestTitle} onChange={e=>setRequestTitle(e.target.value)} className="w-full rounded-xl border p-3 text-xs" placeholder="e.g. Bonafide Certificate"/><textarea value={requestDetails} onChange={e=>setRequestDetails(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border p-3 text-xs" placeholder="Request details"/><button onClick={()=>void submitService(mariaRequestType)} disabled={busy||!requestTitle.trim()||requestDetails.trim().length<3} className="mt-3 rounded-xl bg-violet-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?'Submitting…':mariaRequestType==='certificate'?'Submit Certificate Request':'Submit Prepared Request'}</button></div>{requests.length?<div className="space-y-3">{requests.slice(0,10).map(r=><div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-2"><b>{r.title}</b><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${statusClass(r.status)}`}>{r.status}</span></div></div>)}</div>:null}</div>;
    }
  } else if (module.id === 'pa-notices-messages') {
    const readNotice = async (row:any) => { if(row.isRead)return; try{await markParentNotificationRead(String(row.id));setSnapshot(current=>current?{...current,notices:{...current.notices,rows:current.notices.rows.map((item:any)=>String(item.id)===String(row.id)?{...item,isRead:true}:item)}}:current);}catch(e:any){setMessage(e?.message||'Notification could not be marked read.');} };
    content = <div><Title icon={Bell} title="Notices & Messages" subtitle="School notices and teacher messages delivered to this Parent login."/>{snapshot.notices.rows.length ? <div className="space-y-3">{snapshot.notices.rows.map((r:any)=><button key={r.id} onClick={()=>void readNotice(r)} className={`w-full rounded-2xl border p-4 text-left ${r.isRead?'border-slate-200 bg-white':'border-violet-200 bg-violet-50'}`}><div className="flex justify-between gap-3"><b>{r.title}</b><span className="text-[9px] text-slate-400">{safeDate(r.createdAt)}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{r.body}</p></button>)}</div> : <Empty title="No Parent messages" body="Approved teacher/school communications will appear here."/>}</div>;
  } else if (module.id === 'pa-library') {
    content = <div><Title icon={Library} title="Library Information" subtitle="Selected child's own library loans/dues/history only."/>{snapshot.library.rows.length ? <div className="space-y-3">{snapshot.library.rows.map((r:any,i:number)=><div key={r.id||i} className="rounded-2xl border border-slate-200 bg-white p-4"><RecordGrid row={r}/></div>)}</div> : <Empty title="No library record" body="Child-linked library entries will appear when available."/>}</div>;
  } else if (module.id === 'pa-profile') {
    if (feature?.id === 'pa-child-link-security') {
      content = <div className="space-y-6"><Title icon={Link2} title="Child-link Security" subtitle="Add another child only after Student Master mobile/DOB verification and Headmaster approval."/>{message&&<div className="rounded-2xl border bg-white p-4 text-xs font-bold">{message}</div>}<div className="rounded-3xl border border-slate-200 bg-white p-5"><label className="text-xs font-black text-slate-600">Child GR / PEN<input value={linkForm.childIdentifier} onChange={e=>setLinkForm(v=>({...v,childIdentifier:e.target.value.toUpperCase()}))} className="mt-1 w-full rounded-xl border p-3 font-mono text-xs"/></label><label className="mt-3 block text-xs font-black text-slate-600">Child DOB (optional extra verification)<input type="date" value={linkForm.childDob} onChange={e=>setLinkForm(v=>({...v,childDob:e.target.value}))} className="mt-1 w-full rounded-xl border p-3 text-xs"/></label><button onClick={()=>void submitLink()} disabled={busy||!linkForm.childIdentifier.trim()} className="mt-4 rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?'Verifying…':'Verify & Send Link Request'}</button></div>{links.pending.length>0&&<div className="rounded-3xl border border-amber-200 bg-amber-50 p-5"><div className="font-black text-amber-950">Pending links</div>{links.pending.map(row=><div key={row.id} className="mt-2 text-xs">{row.studentName} · GR {text(row.grNumber)} · {text(row.requestCode)}</div>)}</div>}</div>;
    } else {
      content = <div className="space-y-6"><Title icon={UserRound} title="Parent Profile" subtitle="Parent identity is a real cloud account; child academic identity remains protected in Student Master."/><div className="rounded-3xl border border-slate-200 bg-white p-5"><RecordGrid row={{ name:user.name, loginId:user.username, email:user.email, phone:user.phone, role:'Parent', linkedChildren:links.children.length }}/></div>{onNavigate&&<button onClick={()=>onNavigate('pa-profile','pa-complete-profile')} className="rounded-xl bg-slate-950 px-5 py-3 text-xs font-black text-white">Complete / Update Parent Profile</button>}</div>;
    }
  } else {
    content = <Empty title={module.label} body="This Parent module is secured to Headmaster-approved child links. No school-wide administrative data is exposed."/>;
  }

  return <section className="edx-parent-portal edx-theme-safe overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-xl">{header}<div className="p-5 sm:p-7">{mariaStatus&&<div className="mb-5 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-xs font-bold leading-5 text-violet-900"><b>Maria:</b> {mariaStatus}</div>}{error&&<div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">{error}</div>}{message&&module.id!=='pa-leave'&&module.id!=='pa-certificate-requests'&&module.id!=='pa-profile'&&<div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-bold">{message}</div>}{content}<div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-6 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/><span>Privacy boundary: Parent access is derived only from Headmaster-approved, school-scoped Parent-child link records. Marks, attendance, Result Book, Teacher drafts, other students and administrative edit/approval controls remain inaccessible.</span><button onClick={()=>void refresh()} className="ml-auto shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600" title="Refresh"><RefreshCw className="h-4 w-4"/></button></div></div></section>;
}
