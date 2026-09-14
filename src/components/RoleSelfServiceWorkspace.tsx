import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpen, CalendarDays, CheckCircle2, CircleDollarSign,
  Clock3, FileText, GraduationCap, Library, Megaphone, ShieldCheck, UserRound, Users
} from 'lucide-react';
import type { Language, User } from '../types';
import type { RoleModuleFeature, RoleVisibleModule } from '../lib/roleModuleBlueprint';
import { LocalERPDatabase } from '../lib/supabase';
import RoleScopedTimetable from './RoleScopedTimetable';
import { resolveNoticeTranslation } from '../lib/noticeTranslations';

interface RoleSelfServiceWorkspaceProps {
  lang: Language;
  user: User;
  module: RoleVisibleModule;
  feature?: RoleModuleFeature | null;
}

function safeArray(key: string): any[] {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center"><FileText className="mx-auto h-7 w-7 text-slate-400" /><h3 className="mt-3 text-sm font-black text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-slate-500">{text}</p></div>;
}

function DataCard({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div><div className="mt-2 text-sm font-black text-slate-900">{value || '—'}</div></div>;
}

export default function RoleSelfServiceWorkspace({ user, module, feature, lang }: RoleSelfServiceWorkspaceProps) {
  const allUsers = useMemo(() => LocalERPDatabase.getUsers(), []);
  const classes = useMemo(() => LocalERPDatabase.getClasses(), []);
  const notices = useMemo(() => LocalERPDatabase.getNotices(), []);
  const homework = useMemo(() => LocalERPDatabase.getHomework(), []);
  const fees = useMemo(() => LocalERPDatabase.getFees(), []);
  const schedules = useMemo(() => LocalERPDatabase.getExamSchedules(), []);
  const marks = useMemo(() => LocalERPDatabase.getStudentMarkEntries(), []);
  const attendance = useMemo(() => safeArray('nhs_erp_attendance_v2'), []);
  const loans = useMemo(() => safeArray('nhs_library_loans'), []);
  const books = useMemo(() => safeArray('nhs_library_books'), []);
  const parentPhone = normalize(user.phone);
  const linkedChildren = useMemo(() => user.role === 'parent'
    ? allUsers.filter(candidate => candidate.role === 'student' && parentPhone && normalize(candidate.parentMobile) === parentPhone)
    : [], [allUsers, parentPhone, user.role]);
  const [selectedChildId, setSelectedChildId] = useState(linkedChildren[0]?.id || '');
  const selectedStudent = user.role === 'student'
    ? user
    : linkedChildren.find(child => child.id === selectedChildId) || linkedChildren[0] || null;
  const classInfo = classes.find(item => item.id === selectedStudent?.classId);
  const moduleId = module.id;

  if (user.role === 'parent' && !selectedStudent && moduleId !== 'pa-profile' && moduleId !== 'pa-admission-status') {
    return <section className="edx-self-service animate-fade-in rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-left"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" /><div><h2 className="text-lg font-black text-amber-950">No verified child link</h2><p className="mt-2 text-sm leading-7 text-amber-800">Is parent account ke saath koi student securely linked nahi mila. Privacy ke liye school data hide rakha gaya hai. Clerk ya Headmaster child link verify karega.</p></div></div></section>;
  }

  const scopedHomework = homework.filter(item => !selectedStudent?.classId || item.classId === selectedStudent.classId);
  const scopedNotices = notices.filter(item => item.targetRoles?.includes(user.role));
  const scopedFees = fees.filter(item => selectedStudent && (
    item.studentId === selectedStudent.id || normalize(item.studentName) === normalize(selectedStudent.name)
  ));
  const scopedAttendance = attendance.filter(item => selectedStudent && (
    item.studentId === selectedStudent.id || normalize(item.grNumber) === normalize(selectedStudent.grNumber)
  ));
  const scopedMarks = marks.filter(item => selectedStudent && (
    item.studentId === selectedStudent.id || normalize(item.grNumber) === normalize(selectedStudent.grNumber)
  ));
  const scopedSchedules = schedules.filter(item => !selectedStudent?.classId || item.classId === selectedStudent.classId);
  const scopedLoans = loans.filter(item => selectedStudent && (
    item.memberId === selectedStudent.id || item.studentId === selectedStudent.id || normalize(item.memberName) === normalize(selectedStudent.name)
  ));

  const headingIcon = moduleId.includes('fee') ? CircleDollarSign
    : moduleId.includes('attendance') || moduleId.includes('leave') ? CalendarDays
      : moduleId.includes('library') ? Library
        : moduleId.includes('notice') || moduleId.includes('homework') || moduleId.includes('material') ? Megaphone
          : moduleId.includes('result') || moduleId.includes('exam') || moduleId.includes('progress') ? GraduationCap
            : moduleId.includes('profile') || moduleId.includes('children') ? UserRound
              : BookOpen;
  const HeadingIcon = headingIcon;

  const header = (
    <div className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-6 text-slate-900 sm:px-7">
      <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-violet-100/70 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-cyan-700"><HeadingIcon className="h-6 w-6" /></div><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-700">Secure self-service workspace</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{module.label}</h1><p className="mt-2 text-xs text-slate-500">{feature?.label || module.description || 'Only role-scoped information is displayed.'}</p></div></div>
        {user.role === 'parent' && linkedChildren.length > 1 && <label className="min-w-56 text-xs font-bold text-slate-600"><span className="mb-1.5 flex items-center gap-2"><Users className="h-4 w-4" />Viewing child</span><select value={selectedStudent?.id || ''} onChange={event => setSelectedChildId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900">{linkedChildren.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>}
      </div>
    </div>
  );

  let content: React.ReactNode;
  if (moduleId === 'st-timetable' || moduleId === 'pa-timetable') {
    content = <RoleScopedTimetable lang={lang} user={user} embedded />;
  } else if (moduleId === 'st-home' || moduleId === 'pa-home' || moduleId === 'pa-children') {
    content = <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><DataCard label="Student" value={selectedStudent?.name} /><DataCard label="Class" value={classInfo ? `${classInfo.className} ${classInfo.division || ''}` : 'Not assigned'} /><DataCard label="GR / Admission" value={selectedStudent?.grNumber || selectedStudent?.admissionNo} /><DataCard label="Account status" value={selectedStudent?.status || (selectedStudent?.isActive ? 'Active' : 'Pending')} /></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Current homework</h3><p className="mt-2 text-3xl font-black text-cyan-700">{scopedHomework.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Current fee balance</h3><p className="mt-2 text-3xl font-black text-violet-700">₹{scopedFees.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0) - Number(item.paidAmount || 0)), 0).toLocaleString()}</p></div></div></div>;
  } else if (moduleId.includes('attendance')) {
    const present = scopedAttendance.filter(item => item.status === 'P').length;
    content = <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><DataCard label="Recorded days / periods" value={scopedAttendance.length} /><DataCard label="Present entries" value={present} /><DataCard label="Attendance rate" value={scopedAttendance.length ? `${Math.round((present / scopedAttendance.length) * 100)}%` : 'No record'} /></div>{scopedAttendance.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Subject</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{scopedAttendance.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,60).map((item,index)=><tr key={item.id || index}><td className="p-3 font-mono">{item.date}</td><td className="p-3">{item.type}</td><td className="p-3">{item.subject || 'Daily attendance'}</td><td className="p-3 font-black">{item.status}</td></tr>)}</tbody></table></div> : <EmptyState title="No attendance record yet" text="Attendance appears only after the teacher submits or locks the relevant register." />}</div>;
  } else if (moduleId.includes('homework') || moduleId.includes('study-material')) {
    content = scopedHomework.length ? <div className="grid gap-4 lg:grid-cols-2">{scopedHomework.slice().sort((a,b)=>String(b.assignedDate).localeCompare(String(a.assignedDate))).map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase text-cyan-700">{item.subject}</span><span className="text-[10px] font-bold text-rose-600">Due {item.dueDate}</span></div><h3 className="mt-4 font-black text-slate-900">{item.title}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{item.description}</p><p className="mt-4 text-[10px] text-slate-400">{item.teacherName}</p></article>)}</div> : <EmptyState title="No assigned content" text="No homework or study-material entry is available for this class." />;
  } else if (moduleId.includes('exam-schedule')) {
    content = scopedSchedules.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Exam</th><th className="p-3">Subject</th><th className="p-3">Time</th><th className="p-3">Room</th></tr></thead><tbody className="divide-y divide-slate-100">{scopedSchedules.map(item=><tr key={item.id}><td className="p-3 font-mono">{item.date}</td><td className="p-3 font-bold">{item.examName}</td><td className="p-3">{item.subjectName}</td><td className="p-3">{item.startTime}</td><td className="p-3">{item.room || '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No published examination schedule" text="The examination schedule will appear here after the school publishes it." />;
  } else if (moduleId.includes('result') || moduleId.includes('progress')) {
    content = scopedMarks.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Academic year</th><th className="p-3">Exam</th><th className="p-3">Subject</th><th className="p-3">Total</th><th className="p-3">Grade</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{scopedMarks.filter(item => item.status !== 'Draft').map(item=><tr key={item.id}><td className="p-3">{item.academicYear}</td><td className="p-3">{item.examId}</td><td className="p-3">{item.subjectId}</td><td className="p-3 font-black">{item.subjectTotal}</td><td className="p-3">{item.grade || '—'}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Published data</span></td></tr>)}</tbody></table></div> : <EmptyState title="No published result" text="Draft teacher marks are never shown here. Only submitted/published result data becomes visible." />;
  } else if (moduleId.includes('fee')) {
    content = scopedFees.length ? <div className="space-y-4">{scopedFees.map(item=><div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-5 sm:items-center"><div className="sm:col-span-2"><div className="font-black text-slate-900">{item.academicYear}</div><div className="mt-1 text-xs text-slate-500">Due {item.dueDate}</div></div><DataCard label="Total" value={`₹${Number(item.amount).toLocaleString()}`} /><DataCard label="Paid" value={`₹${Number(item.paidAmount).toLocaleString()}`} /><DataCard label="Status" value={item.status} /></div>)}</div> : <EmptyState title="No fee ledger found" text="The school fee ledger has no entry linked to this student record." />;
  } else if (moduleId.includes('notice') || moduleId.includes('message')) {
    content = scopedNotices.length ? <div className="space-y-4">{scopedNotices.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(item=>{ const translated = resolveNoticeTranslation(item, lang); return <article key={item.id} dir={translated.direction || 'ltr'} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase text-violet-700">{item.category}</span><span className="text-[10px] font-bold text-slate-400">{item.date}</span></div><h3 className="mt-4 font-black text-slate-900">{translated.title}</h3><p className="mt-2 text-xs leading-6 text-slate-600">{translated.content}</p></article>;})}</div> : <EmptyState title="No notice available" text="No notice is currently targeted to this role." />;
  } else if (moduleId.includes('library')) {
    content = scopedLoans.length ? <div className="grid gap-4 md:grid-cols-2">{scopedLoans.map((loan,index)=>{const book=books.find(item=>item.id===loan.bookId); return <div key={loan.id || index} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><BookOpen className="h-5 w-5 text-violet-700" /><h3 className="font-black text-slate-900">{book?.title || loan.bookTitle || 'Library book'}</h3></div><div className="mt-3 text-xs text-slate-500">Due: {loan.dueDate || '—'} · Status: {loan.status || 'Issued'}</div></div>})}</div> : <EmptyState title="No active library loan" text="Borrowed books linked to this student will appear here. Catalogue management remains with the Librarian." />;
  } else if (moduleId.includes('profile')) {
    content = <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><DataCard label="Account holder" value={user.name} /><DataCard label="Login ID" value={user.username} /><DataCard label="Role" value={user.role.replaceAll('_',' ')} /><DataCard label="Status" value={user.status || (user.isActive ? 'Active' : 'Pending')} /></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs leading-6 text-emerald-900"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0" /><span>Login ID aur role immutable hain. Password/profile update secure account section se hi hoga; child-link ya school records yahan se silently change nahi honge.</span></div></div></div>;
  } else if (moduleId.includes('request') || moduleId.includes('leave') || moduleId.includes('certificate') || moduleId.includes('document') || moduleId.includes('admission-status')) {
    content = <div className="space-y-5"><div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" /><div><h3 className="font-black text-cyan-950">Focused request surface</h3><p className="mt-2 text-xs leading-6 text-cyan-900">This module no longer opens an administrative workspace. Only the signed-in student/parent request and its status belong here.</p></div></div></div><EmptyState title="No submitted request found" text="A dedicated cloud request workflow will show records here when the corresponding request has been submitted." /></div>;
  } else {
    content = <EmptyState title={module.label} text="This focused page is ready. No unrelated administrative module is exposed to this account." />;
  }

  return <section className="edx-self-service edx-theme-safe animate-fade-in overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">{header}<div className="bg-slate-50 p-5 sm:p-7">{content}<div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-[11px] leading-6 text-slate-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>Privacy control: this screen filters data to the signed-in student or a securely linked child. School-wide edit, publish, generation and approval controls are intentionally unavailable.</span></div></div></section>;
}
