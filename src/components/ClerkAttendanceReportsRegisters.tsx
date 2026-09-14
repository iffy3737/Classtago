/**
 * Clerk Attendance Reports & Registers
 * Read-only clerk workspace. Daily marking remains Teacher/Class Teacher work.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ClipboardList, FileCheck2, FileClock, Printer, Search,
  ShieldCheck, Users, AlertTriangle, CheckCircle2, Download, BookOpenCheck
} from 'lucide-react';
import { Language, User as UserType } from '../types';
import { supabase } from '../lib/supabase';
import { printSectionById } from '../utils/printSection';

type AttendanceStatus = 'P' | 'A' | 'L' | 'HD' | 'ML' | 'LV' | 'H' | 'CUST';
type AttendanceRecord = {
  id: string; academicYear: string; date: string; type: 'daily' | 'subject'; classId: string;
  studentId: string; studentName: string; grNumber: string; rollNo: number; status: AttendanceStatus;
  isLocked: boolean; isDraft: boolean; submittedAt: string; notes?: string;
};

type Props = {
  lang: Language;
  user: UserType;
  activeFeatureId?: string | null;
};

type CatalogueStudent = {
  id: string; name: string; gender: string; rollNo: number; grNumber: string; examSeatNo: string;
  mobile: string; dob: string; aadhaar: string; admissionDate: string; leavingDate: string;
  feeCategory: string; attendance: Record<number, AttendanceStatus | ''>; present: number; absent: number;
  workingDays: number; percentage: number;
};

type HolidayMeta = { isHoliday: boolean; label: string; declared: boolean; weeklyOff: boolean };

type CloudScope = { id: string; classId: string; className: string; divisionId: string; divisionName: string; classTeacher: string };
type CloudStudent = { id: string; name: string; grNumber: string; rollNo: number; gender: string; dob?: string | null; mobile?: string | null; aadhaar?: string | null; examSeatNo?: string | null; admissionDate?: string | null; leavingDate?: string | null; feeCategory?: string | null; classId: string; className: string; divisionId: string; divisionName: string; status: string; isActive: boolean };
type CloudCorrection = { id: string; studentId: string; studentName: string; grNumber: string; date: string; currentStatus: string; requestedStatus: string; reason: string; status: string; reviewNote?: string | null; createdAt?: string | null };
type CloudSnapshot = {
  academicYear: { id: string; year: string; isActive?: boolean };
  academicYears: Array<{ id: string; year: string; isActive?: boolean }>;
  school: any; schoolTiming: any; holidays: any[]; scopes: CloudScope[]; students: CloudStudent[];
  records: Array<{ id: string; studentId: string; studentName: string; grNumber: string; rollNo: number; classId: string; divisionId: string; date: string; status: string; source?: string; submittedAt?: string | null }>;
  corrections: CloudCorrection[]; generatedAt: string;
};

async function secureToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Secure Clerk session unavailable.');
  return session.access_token;
}

async function loadCloudAttendance(url: string): Promise<CloudSnapshot> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${await secureToken()}` }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Attendance data could not be loaded.');
  return payload as CloudSnapshot;
}

const normalizeDivision = (value?: string | null) => String(value || '').trim() || 'No Division';
const formatClass = (name: string, division?: string | null) => `${name}${normalizeDivision(division) === 'No Division' ? '' : ` - ${normalizeDivision(division)}`}`;
const pad = (n: number) => String(n).padStart(2, '0');
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function ClerkAttendanceReportsRegisters({ lang, user, activeFeatureId = 'cl-attendance-overview' }: Props) {
  void lang; void user;
  const [cloud, setCloud] = useState<CloudSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [month, setMonth] = useState(() => pad(new Date().getMonth() + 1));
  const [classId, setClassId] = useState('');
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState('');
  const [catalogueReady, setCatalogueReady] = useState(false);
  const [cataloguePage, setCataloguePage] = useState<1|2|3>(1);

  const activeYear = cloud?.academicYear?.year || academicYear || '';
  const selectedYearId = cloud?.academicYears?.find(y => y.year === academicYear)?.id || cloud?.academicYear?.id || '';
  const calendarYearFor = (yearLabel: string, monthValue: string) => {
    const monthNo = Number(monthValue);
    const parts = String(yearLabel || '').split('-');
    const start = Number(parts[0]) || new Date().getFullYear();
    const suffix = Number(parts[1]);
    const end = Number.isFinite(suffix) ? Math.floor(start / 100) * 100 + suffix : start + 1;
    return monthNo >= 6 ? start : end;
  };
  const requestCloud = async (yearId?: string) => {
    setLoading(true); setLoadError('');
    try {
      const yearLabel = academicYear || cloud?.academicYear?.year || '';
      const calendarYear = calendarYearFor(yearLabel, month);
      const qs = new URLSearchParams();
      if (yearId) qs.set('academicYearId', yearId);
      qs.set('month', `${calendarYear}-${month}`);
      qs.set('date', dailyDate);
      const payload = await loadCloudAttendance(`/api/clerk/attendance-reports/snapshot?${qs.toString()}`);
      setCloud(payload);
      setAcademicYear(v => v || payload.academicYear.year);
      setClassId(v => v || payload.scopes?.[0]?.id || '');
    } catch (error: any) {
      setLoadError(error?.message || 'Attendance Reports could not be loaded.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void requestCloud(); }, []);
  useEffect(() => { if (cloud && selectedYearId) void requestCloud(selectedYearId); }, [academicYear, month, dailyDate]);

  const scopeByStudent = useMemo(() => {
    const map = new Map<string,string>();
    for (const student of cloud?.students || []) {
      const scope = (cloud?.scopes || []).find(s => s.classId === student.classId && String(s.divisionId || '') === String(student.divisionId || ''));
      if (scope) map.set(student.id, scope.id);
    }
    return map;
  }, [cloud]);
  const classes = useMemo(() => (cloud?.scopes || []).map(scope => ({
    id: scope.id, className: scope.className, division: scope.divisionName || 'No Division',
    sourceClassId: scope.classId, divisionId: scope.divisionId, classTeacher: scope.classTeacher
  })), [cloud]);
  const students = useMemo(() => (cloud?.students || []).map(student => ({
    ...student, classId: scopeByStudent.get(student.id) || '', username: student.grNumber,
    phone: student.mobile || '', parentMobile: student.mobile || '', penNumber: student.examSeatNo || ''
  })), [cloud, scopeByStudent]);
  const records = useMemo<AttendanceRecord[]>(() => (cloud?.records || []).map(row => {
    const scope = (cloud?.scopes || []).find(s => s.classId === row.classId && String(s.divisionId || '') === String(row.divisionId || ''));
    return { id: row.id, academicYear: academicYear || activeYear, date: row.date, type: 'daily', classId: scope?.id || '',
      studentId: row.studentId, studentName: row.studentName, grNumber: row.grNumber, rollNo: row.rollNo,
      status: (row.status || '') as AttendanceStatus, isLocked: true, isDraft: false, submittedAt: row.submittedAt || '', notes: row.source || '' };
  }), [cloud, academicYear, activeYear]);
  const admissions = useMemo(() => (cloud?.students || []).map(student => ({
    grNumber: student.grNumber, gender: student.gender, examSeatNo: student.examSeatNo || '', parentMobile: student.mobile || '',
    mobileNumber: student.mobile || '', dob: student.dob || '', aadhaarNumber: student.aadhaar || '', admissionDate: student.admissionDate || '',
    leavingDate: student.leavingDate || '', feeCategory: student.feeCategory || ''
  })), [cloud]);
  const corrections = useMemo(() => (cloud?.corrections || []).map(row => ({
    ...row, attendanceDate: row.date, studentId: row.studentId, studentName: row.studentName,
    currentStatus: row.currentStatus, requestedStatus: row.requestedStatus
  })), [cloud]);
  const setup = useMemo(() => ({
    academicYears: (cloud?.academicYears || []).map(y => ({ id: y.id, year: y.year, isActive: Boolean(y.isActive) })),
    holidays: cloud?.holidays || [], schoolTiming: cloud?.schoolTiming || {},
    schoolProfile: { schoolName: cloud?.school?.schoolName || cloud?.school?.school_name || 'School', address: cloud?.school?.address || '', udiseCode: cloud?.school?.udiseCode || cloud?.school?.udise_code || '' },
    classTeacherAssignments: []
  }), [cloud]);

  useEffect(() => {
    setCatalogueReady(false);
  }, [academicYear, month, classId]);

  const selectedClass = classes.find(c => c.id === classId) || classes[0];
  const classStudents = useMemo(() => students
    .filter(s => !selectedClass || s.classId === selectedClass.id)
    .sort((a,b) => (a.rollNo || 0) - (b.rollNo || 0) || a.name.localeCompare(b.name)), [students, selectedClass]);

  const academicCalendarYear = (monthValue: string) => {
    const monthNo = Number(monthValue);
    const parts = String(academicYear || activeYear).split('-');
    const start = Number(parts[0]) || new Date().getFullYear();
    const suffix = Number(parts[1]);
    const end = Number.isFinite(suffix) ? Math.floor(start / 100) * 100 + suffix : start + 1;
    return monthNo >= 6 ? start : end;
  };

  const holidayForDate = (dateStr: string): HolidayMeta => {
    const declared = (setup.holidays || []).find((h: any) => dateStr >= h.startDate && dateStr <= (h.endDate || h.startDate));
    const d = new Date(`${dateStr}T00:00:00`);
    const weekday = weekdayNames[d.getDay()];
    const workingDays = setup.schoolTiming?.workingDays || ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const weeklyOff = !workingDays.includes(weekday);
    return {
      isHoliday: Boolean(declared) || weeklyOff,
      label: declared?.holidayName || (weeklyOff ? weekday : ''),
      declared: Boolean(declared),
      weeklyOff,
    };
  };

  const monthYear = academicCalendarYear(month);
  const totalCalendarDays = new Date(monthYear, Number(month), 0).getDate();
  const days = useMemo(() => Array.from({length: totalCalendarDays},(_,i)=>i+1), [totalCalendarDays]);
  const workingDayNumbers = useMemo(() => days.filter(day => !holidayForDate(`${monthYear}-${month}-${pad(day)}`).isHoliday), [days, monthYear, month]);

  const catalogueStudents = useMemo<CatalogueStudent[]>(() => classStudents.map(st => {
    const admission = admissions.find((a: any) => String(a.grNumber || a.proposedGrNumber || '') === String(st.grNumber || st.username || '')) || {};
    const attendance: Record<number, AttendanceStatus | ''> = {};
    let present = 0; let absent = 0; let workingDaysForStudent = 0;
    days.forEach(day => {
      const dateStr = `${monthYear}-${month}-${pad(day)}`;
      if (holidayForDate(dateStr).isHoliday) { attendance[day] = 'H'; return; }
      const admissionDate = String(admission.admissionDate || '');
      const leavingDate = String(admission.leavingDate || admission.dateOfLeaving || '');
      if ((admissionDate && dateStr < admissionDate) || (leavingDate && dateStr > leavingDate)) { attendance[day] = ''; return; }
      workingDaysForStudent += 1;
      const rec = records.find(r => r.type === 'daily' && r.classId === st.classId && r.studentId === st.id && r.date === dateStr);
      const status = rec?.status || '';
      attendance[day] = status;
      if (status === 'P' || status === 'L' || status === 'ML' || status === 'LV') present += 1;
      else if (status === 'HD') present += 0.5;
      else if (status === 'A') absent += 1;
    });
    const evaluated = present + absent;
    return {
      id: st.id, name: st.name, gender: st.gender || admission.gender || 'Other', rollNo: st.rollNo || 0,
      grNumber: st.grNumber || st.username || '', examSeatNo: admission.examSeatNo || admission.penNumber || st.penNumber || '',
      mobile: admission.parentMobile || admission.mobileNumber || st.parentMobile || st.phone || '', dob: st.dob || admission.dob || '',
      aadhaar: admission.aadhaarNumber || admission.aadhaar || admission.aadhaarCardNo || '',
      admissionDate: admission.admissionDate || '', leavingDate: admission.leavingDate || admission.dateOfLeaving || '',
      feeCategory: String(admission.feeCategory || admission.feeType || admission.studentCategory || ''), attendance,
      present, absent, workingDays: workingDaysForStudent, percentage: evaluated > 0 ? Math.round((present / evaluated) * 100) : 0,
    };
  }), [classStudents, admissions, days, monthYear, month, records]);

  const monthLabel = `${monthNames[Number(month)-1]} ${monthYear}`;
  const classTeacher = useMemo(() => String((selectedClass as any)?.classTeacher || 'Not Assigned'), [selectedClass]);

  const summary = useMemo(() => {
    const firstDayDate = `${monthYear}-${month}-01`;
    const lastDayDate = `${monthYear}-${month}-${pad(totalCalendarDays)}`;
    const onFirst = catalogueStudents.filter(s => !s.admissionDate || s.admissionDate <= firstDayDate).filter(s => !s.leavingDate || s.leavingDate >= firstDayDate).length;
    const newAdmissions = catalogueStudents.filter(s => s.admissionDate >= firstDayDate && s.admissionDate <= lastDayDate).length;
    const struckOff = catalogueStudents.filter(s => s.leavingDate >= firstDayDate && s.leavingDate <= lastDayDate).length;
    const onLast = Math.max(0, onFirst + newAdmissions - struckOff);
    const free = catalogueStudents.filter(s => /free|scholar|concession|rte/i.test(s.feeCategory)).length;
    const categorized = catalogueStudents.filter(s => s.feeCategory).length;
    const paying = categorized ? catalogueStudents.length - free : null;
    const boys = catalogueStudents.filter(s => String(s.gender).toLowerCase() === 'male');
    const girls = catalogueStudents.filter(s => String(s.gender).toLowerCase() === 'female');
    const avg = (list: CatalogueStudent[]) => workingDayNumbers.length ? (list.reduce((sum,s)=>sum+s.present,0) / workingDayNumbers.length).toFixed(2) : '0.00';
    return { onFirst, newAdmissions, struckOff, onLast, free: categorized ? free : null, paying, total: catalogueStudents.length, avgBoys: avg(boys), avgGirls: avg(girls), avgTotal: avg(catalogueStudents) };
  }, [catalogueStudents, monthYear, month, totalCalendarDays, workingDayNumbers.length]);

  const filteredDaily = useMemo(() => records.filter(r => r.type === 'daily' && (!selectedClass || r.classId === selectedClass.id) && r.date === dailyDate)
    .filter(r => !search || `${r.studentName} ${r.grNumber}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>(a.rollNo||0)-(b.rollNo||0)), [records, selectedClass, dailyDate, search]);
  const dailyHoliday = holidayForDate(dailyDate);

  const header = (eyebrow: string, title: string, text: string, icon: React.ReactNode) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-slate-950 p-2.5 text-white">{icon}</div><div><div className="text-[9px] font-black uppercase tracking-[.18em] text-indigo-600">{eyebrow}</div><h1 className="mt-1 text-xl font-black text-slate-950">{title}</h1><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>
    </div>
  );

  const catalogueClassNames = useMemo(() => Array.from(new Set(classes.map(c => c.className))).sort((a,b)=>String(a).localeCompare(String(b), undefined, { numeric: true })), [classes]);
  const selectedCatalogueClassName = selectedClass?.className || catalogueClassNames[0] || '';
  const catalogueDivisionOptions = useMemo(() => Array.from(new Set(classes
    .filter(c => c.className === selectedCatalogueClassName)
    .map(c => normalizeDivision(c.division)))), [classes, selectedCatalogueClassName]);
  const selectedCatalogueDivision = normalizeDivision(selectedClass?.division);
  const cataloguePrintTitle = `${academicYear || 'Academic-Year'} - ${selectedCatalogueClassName || 'Class'} - ${selectedCatalogueDivision} - ${monthLabel} Attendance Catalogue`;

  const selectCatalogueClass = (name: string) => {
    const first = classes.find(c => c.className === name);
    if (first) setClassId(first.id);
  };

  const selectCatalogueDivision = (division: string) => {
    const match = classes.find(c => c.className === selectedCatalogueClassName && normalizeDivision(c.division) === division);
    if (match) setClassId(match.id);
  };

  const filterBar = (includeMonth = true) => <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
    {includeMonth && <label className="text-xs font-bold text-slate-600">Academic Year<select value={academicYear} onChange={e=>setAcademicYear(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900">{setup.academicYears.map((y:any)=><option key={y.id} value={y.year}>{y.year}</option>)}</select></label>}
    <label className="text-xs font-bold text-slate-600">Class<select value={selectedCatalogueClassName} onChange={e=>selectCatalogueClass(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900">{catalogueClassNames.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
    <label className="text-xs font-bold text-slate-600">Division<select value={selectedCatalogueDivision} onChange={e=>selectCatalogueDivision(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900">{catalogueDivisionOptions.map(division=><option key={division} value={division}>{division}</option>)}</select></label>
    {includeMonth && <label className="text-xs font-bold text-slate-600">Month<select value={month} onChange={e=>setMonth(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900">{monthNames.map((m,i)=><option key={m} value={pad(i+1)}>{m}</option>)}</select></label>}
    {includeMonth && <button onClick={()=>setCatalogueReady(true)} className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-indigo-700">Generate Selected Catalogue</button>}
    {includeMonth && <div className="sm:col-span-2 xl:col-span-5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] font-bold text-indigo-800">Select Academic Year → Class → Division → Month. Generate and download each class/division catalogue one by one.</div>}
  </div>;

  const schoolHeader = (subtitle: string) => <div className="border-b-2 border-slate-900 pb-3 text-center">
    <div className="text-lg font-black uppercase tracking-wide">{setup.schoolProfile.schoolName || 'School'}</div>
    <div className="mt-1 text-[9px] font-semibold text-slate-500">{setup.schoolProfile.address || 'Address not configured'} · U-DISE: {setup.schoolProfile.udiseCode || '—'}</div>
    <div className="mt-2 text-[11px] font-black uppercase tracking-[.12em] text-slate-800">{subtitle}</div>
    <div className="mt-1 text-[9px] font-bold text-slate-600">Class: {selectedClass ? formatClass(selectedClass.className,selectedClass.division) : '—'} · Month: {monthLabel} · Academic Year: {academicYear} · Class Teacher: {classTeacher}</div>
  </div>;

  const page1 = <section className="catalogue-page bg-white p-6 text-slate-950">{schoolHeader('Monthly Attendance Catalogue — Page 1: Summary')}
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <table className="w-full border-collapse text-xs"><caption className="mb-2 text-left font-black">Monthly Classification</caption><tbody>
        {[['Students on First Day',summary.onFirst],['New Admitted During Month',summary.newAdmissions],['Names Struck Off',summary.struckOff],['Total Students',summary.total],['Students on Last Day',summary.onLast]].map(([l,v])=><tr key={String(l)}><td className="border border-slate-400 p-2 font-bold">{l}</td><td className="border border-slate-400 p-2 text-center font-black">{v}</td></tr>)}
      </tbody></table>
      <table className="w-full border-collapse text-xs"><caption className="mb-2 text-left font-black">Paying / Free Classification</caption><tbody>
        {[['Paying Students',summary.paying ?? '—'],['Free / Concession Students',summary.free ?? '—'],['Total Students',summary.total],['Working Days (holidays excluded)',workingDayNumbers.length]].map(([l,v])=><tr key={String(l)}><td className="border border-slate-400 p-2 font-bold">{l}</td><td className="border border-slate-400 p-2 text-center font-black">{v}</td></tr>)}
      </tbody></table>
    </div>
    <table className="mt-5 w-full border-collapse text-xs"><caption className="mb-2 text-left font-black">Average Attendance</caption><thead><tr><th className="border border-slate-400 p-2">Boys</th><th className="border border-slate-400 p-2">Girls</th><th className="border border-slate-400 p-2">Total</th></tr></thead><tbody><tr><td className="border border-slate-400 p-3 text-center font-black">{summary.avgBoys}</td><td className="border border-slate-400 p-3 text-center font-black">{summary.avgGirls}</td><td className="border border-slate-400 p-3 text-center font-black">{summary.avgTotal}</td></tr></tbody></table>
    <div className="mt-20 grid grid-cols-3 gap-10 text-center text-[10px] font-bold"><div className="border-t border-slate-600 pt-2">Class Teacher Signature</div><div className="border-t border-slate-600 pt-2">Clerk Verification</div><div className="border-t border-slate-600 pt-2">Headmaster Signature & Seal</div></div>
  </section>;

  const page2 = <section className="catalogue-page bg-white p-6 text-slate-950">{schoolHeader('Monthly Attendance Catalogue — Page 2: Student Details')}
    <div className="mt-4 overflow-hidden"><table className="w-full border-collapse text-[9px]"><thead><tr className="bg-slate-100"><th className="border border-slate-500 p-1.5">Sr No</th><th className="border border-slate-500 p-1.5">GR No</th><th className="border border-slate-500 p-1.5">Exam Seat No</th><th className="border border-slate-500 p-1.5">Mobile</th><th className="border border-slate-500 p-1.5">DOB</th><th className="border border-slate-500 p-1.5">Aadhaar</th><th className="border border-slate-500 p-1.5 text-left">Student Name</th></tr></thead><tbody>{catalogueStudents.map((s,i)=><tr key={s.id}><td className="border border-slate-400 p-1.5 text-center">{i+1}</td><td className="border border-slate-400 p-1.5 text-center font-mono">{s.grNumber}</td><td className="border border-slate-400 p-1.5 text-center font-mono">{s.examSeatNo || '—'}</td><td className="border border-slate-400 p-1.5 text-center font-mono">{s.mobile || '—'}</td><td className="border border-slate-400 p-1.5 text-center font-mono">{s.dob || '—'}</td><td className="border border-slate-400 p-1.5 text-center font-mono">{s.aadhaar || '—'}</td><td className="border border-slate-400 p-1.5 font-bold">{s.name}</td></tr>)}</tbody></table></div>
    <div className="mt-6 text-[9px] text-slate-500">Roster is read-only here. Admission/Leaving changes must come from Student Master/Lifecycle workflow.</div>
  </section>;

  const ATTENDANCE_ROWS_PER_PRINT_PAGE = 24;
  const attendanceStudentChunks = useMemo(() => {
    if (!catalogueStudents.length) return [[] as CatalogueStudent[]];
    const chunks: CatalogueStudent[][] = [];
    for (let i = 0; i < catalogueStudents.length; i += ATTENDANCE_ROWS_PER_PRINT_PAGE) {
      chunks.push(catalogueStudents.slice(i, i + ATTENDANCE_ROWS_PER_PRINT_PAGE));
    }
    return chunks;
  }, [catalogueStudents]);

  const renderAttendanceSheet = (sheetStudents: CatalogueStudent[], sheetIndex: number) => {
    const continuation = attendanceStudentChunks.length > 1 ? ` · Sheet ${sheetIndex + 1}/${attendanceStudentChunks.length}` : '';
    return <section key={`attendance-sheet-${sheetIndex}`} className="catalogue-page bg-white p-3 text-slate-950">
      {schoolHeader(`Monthly Attendance Catalogue — Page 3: Daily Attendance${continuation}`)}
      <div className="mt-3 overflow-hidden"><table className="w-full table-fixed border-collapse text-[6.5px]"><thead><tr><th className="w-6 border border-slate-700 p-0.5">Sr</th><th className="w-12 border border-slate-700 p-0.5">GR</th><th className="w-28 border border-slate-700 p-0.5 text-left">Student Name</th>{days.map(day=><th key={day} className="border border-slate-700 bg-slate-100 p-0 py-1 text-center font-black">{day}</th>)}<th className="w-7 border border-slate-700 p-0.5">P</th><th className="w-7 border border-slate-700 p-0.5">A</th><th className="w-8 border border-slate-700 p-0.5">WD</th><th className="w-9 border border-slate-700 p-0.5">Avg%</th></tr></thead>
      <tbody>{sheetStudents.length ? sheetStudents.map((s,i)=><tr key={s.id}><td className="border border-slate-700 p-0.5 text-center">{sheetIndex * ATTENDANCE_ROWS_PER_PRINT_PAGE + i + 1}</td><td className="border border-slate-700 p-0.5 text-center font-mono">{s.grNumber}</td><td className="border border-slate-700 p-0.5 font-bold truncate">{s.name}</td>{days.map(day=>{const dateStr=`${monthYear}-${month}-${pad(day)}`; const h=holidayForDate(dateStr); const status=s.attendance[day]; if(h.isHoliday){if(i!==0)return null; return <td key={day} rowSpan={sheetStudents.length} title={h.label} className="relative border border-slate-700 bg-slate-900 p-0 text-center align-middle text-white" style={{backgroundColor:'#0f172a',color:'#ffffff',WebkitPrintColorAdjust:'exact',printColorAdjust:'exact'}}><div className="absolute inset-0 flex items-center justify-center overflow-hidden"><span className="max-h-full text-[5.5px] font-black uppercase tracking-[0.08em]" style={{writingMode:'vertical-rl',textOrientation:'mixed',transform:'rotate(180deg)'}}>{h.label}</span></div></td>} return <td key={day} className="border border-slate-700 p-0 text-center font-black">{status || ''}</td>})}<td className="border border-slate-700 p-0.5 text-center font-black">{s.present}</td><td className="border border-slate-700 p-0.5 text-center font-black">{s.absent}</td><td className="border border-slate-700 p-0.5 text-center font-black">{s.workingDays}</td><td className="border border-slate-700 p-0.5 text-center font-black">{s.percentage}%</td></tr>) : <tr><td colSpan={days.length + 7} className="border border-slate-700 p-8 text-center text-slate-400">No students found for this class/division.</td></tr>}</tbody></table></div>
      <div className="mt-3 flex flex-wrap gap-4 text-[8px] font-bold"><span>P = Present</span><span>A = Absent</span><span>Dark P/A strip = Holiday / non-working day</span><span>Holiday reason is centred vertically inside the attendance strip and repeats on every continuation sheet.</span></div>
    </section>;
  };

  const page3 = <div className="space-y-3">{attendanceStudentChunks.map((chunk,index)=>renderAttendanceSheet(chunk,index))}</div>;

  const renderOverview = () => <div className="space-y-5">{header('Clerk · Read Only','Attendance Register Overview','School-wide register status. Daily attendance marking remains with Teacher/Class Teacher.',<ClipboardList className="h-5 w-5"/>)}
    {loading && <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-bold text-indigo-800">Loading canonical cloud attendance…</div>}
    {loadError && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"><AlertTriangle className="mr-2 inline h-4 w-4"/>{loadError}</div>}
    <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Classes</div><div className="mt-1 text-2xl font-black">{classes.length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Students</div><div className="mt-1 text-2xl font-black">{students.length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Daily Records</div><div className="mt-1 text-2xl font-black">{records.filter(r=>r.type==='daily').length}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-[9px] font-black uppercase text-slate-400">Corrections</div><div className="mt-1 text-2xl font-black">{corrections.length}</div></div></div>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase text-slate-500"><tr><th className="p-3">Class</th><th className="p-3">Students</th><th className="p-3">Today</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{classes.map(c=>{const roster=students.filter(s=>s.classId===c.id); const today=new Date().toISOString().slice(0,10); const todayRecords=records.filter(r=>r.type==='daily'&&r.classId===c.id&&r.date===today); return <tr key={c.id}><td className="p-3 font-black">{formatClass(c.className,c.division)}</td><td className="p-3">{roster.length}</td><td className="p-3">{todayRecords.length}/{roster.length}</td><td className="p-3">{holidayForDate(today).isHoliday?<span className="rounded-full bg-slate-900 px-2 py-1 text-[9px] font-black text-white">HOLIDAY</span>:todayRecords.length&&todayRecords.every(r=>r.isLocked)?<span className="text-emerald-700 font-black">Locked</span>:<span className="text-amber-700 font-black">Pending / Draft</span>}</td></tr>})}</tbody></table></div>
  </div>;

  const renderDaily = () => <div className="space-y-5">{header('Clerk · Daily Register','Daily Attendance Register','Read, audit and print one class/day register. This screen cannot mark or edit attendance.',<CalendarDays className="h-5 w-5"/>)}
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3"><label className="text-xs font-bold">Date<input type="date" value={dailyDate} onChange={e=>setDailyDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"/></label><label className="text-xs font-bold">Class / Division<select value={classId} onChange={e=>setClassId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">{classes.map(c=><option key={c.id} value={c.id}>{formatClass(c.className,c.division)}</option>)}</select></label><label className="text-xs font-bold">Search<div className="relative mt-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3" placeholder="Name / GR"/></div></label></div>
    {dailyHoliday.isHoliday&&<div className="rounded-2xl bg-slate-950 p-4 text-sm font-black text-white"><AlertTriangle className="mr-2 inline h-4 w-4"/>Holiday locked: {dailyHoliday.label}. No attendance should be counted for this date.</div>}
    <div id="clerk-daily-attendance-print" className="rounded-2xl border border-slate-200 bg-white p-5">{schoolHeader(`Daily Attendance Register — ${dailyDate}`)}<table className="mt-4 w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">Roll</th><th className="border p-2">GR No</th><th className="border p-2 text-left">Student</th><th className="border p-2">Status</th><th className="border p-2 text-left">Remarks</th></tr></thead><tbody>{dailyHoliday.isHoliday?<tr><td colSpan={5} className="border bg-slate-900 p-8 text-center font-black text-white">HOLIDAY — {dailyHoliday.label}</td></tr>:filteredDaily.length?filteredDaily.map(r=><tr key={r.id}><td className="border p-2 text-center">{r.rollNo}</td><td className="border p-2 text-center font-mono">{r.grNumber}</td><td className="border p-2 font-bold">{r.studentName}</td><td className="border p-2 text-center font-black">{r.status}</td><td className="border p-2">{r.notes||'—'}</td></tr>):<tr><td colSpan={5} className="border p-8 text-center text-slate-400">No submitted daily attendance found for this date/class.</td></tr>}</tbody></table></div>
    <button onClick={()=>printSectionById('clerk-daily-attendance-print','Daily Attendance Register')} className="rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white"><Printer className="mr-2 inline h-4 w-4"/>Print / PDF Daily Register</button>
  </div>;

  const renderCatalogue = (certified = false) => <div className="space-y-5">{header(certified?'Clerk · Certified Print':'Clerk · Monthly Catalogue',certified?'Certified Attendance Print':'Monthly Attendance Catalogue — 3 Pages',certified?'Prepare the official three-page attendance catalogue for verification/signature. Final certification remains governed by school authority.':'Page 1 Summary · Page 2 Student Details · Page 3 Daily Attendance. Holidays are dark-blocked and excluded from totals.',certified?<FileCheck2 className="h-5 w-5"/>:<BookOpenCheck className="h-5 w-5"/>)}
    {filterBar(true)}
    {catalogueReady&&<><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"><div className="flex gap-2">{([1,2,3] as const).map(p=><button key={p} onClick={()=>setCataloguePage(p)} className={`rounded-xl px-3 py-2 text-xs font-black ${cataloguePage===p?'bg-indigo-600 text-white':'bg-slate-100 text-slate-600'}`}>Page {p}</button>)}</div><button onClick={()=>printSectionById('clerk-attendance-catalogue-print',cataloguePrintTitle)} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><Printer className="mr-2 inline h-4 w-4"/>Download / Print This Class Catalogue</button></div>
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-sm">{cataloguePage===1?page1:cataloguePage===2?page2:page3}</div>
      <div id="clerk-attendance-catalogue-print" className="fixed -left-[20000px] top-0 w-[1120px] bg-white print:static print:w-auto"><style>{`@media print{.catalogue-page{page-break-after:always;break-after:page;}.catalogue-page:last-child{page-break-after:auto;break-after:auto;}@page{size:A3 landscape;margin:8mm;}.catalogue-page:first-of-type{page:portrait;}}`}</style>{page1}{page2}{page3}</div>
    </>}
  </div>;

  const renderCorrections = () => <div className="space-y-5">{header('Clerk · Audit Trail','Attendance Correction Log','Read-only correction history. Teachers/Class Teachers submit correction requests; Clerk does not directly rewrite historical attendance.',<FileClock className="h-5 w-5"/>)}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Change</th><th className="p-3">Reason</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{corrections.length?corrections.map((r:any,i)=><tr key={r.id||i}><td className="p-3 font-mono">{r.attendanceDate||r.date||'—'}</td><td className="p-3 font-bold">{r.studentName||r.studentId||'—'}</td><td className="p-3">{r.currentStatus||r.oldStatus||'—'} → {r.requestedStatus||r.newStatus||'—'}</td><td className="p-3">{r.reason||'—'}</td><td className="p-3 font-black">{r.status||'Pending'}</td></tr>):<tr><td colSpan={5} className="p-10 text-center text-slate-400">No correction log is available in this clerk compatibility store yet. Historical attendance remains read-only.</td></tr>}</tbody></table></div>
  </div>;

  switch (activeFeatureId) {
    case 'cl-daily-attendance-register': return renderDaily();
    case 'cl-monthly-attendance-register': return renderCatalogue(false);
    case 'cl-attendance-correction-log': return renderCorrections();
    case 'cl-attendance-certified-print': return renderCatalogue(true);
    case 'cl-attendance-overview':
    default: return renderOverview();
  }
}
