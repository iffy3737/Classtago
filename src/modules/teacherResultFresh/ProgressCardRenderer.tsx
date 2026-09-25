import React from 'react';
import { UserRound, School2, Award, HeartPulse } from 'lucide-react';

/* ============================================================
   Progress Card Renderer (v1)
   Renders one Progress Card from:
   - template config (design + labels)
   - student data (from students + edunixo_student_profiles + users)
   - result book data (grades/marks)
   - attendance summary
   ============================================================ */

export type ProgressCardPageMode = 'one_side' | 'two_side';
export type ProgressCardClassGroup = '1-8' | '9-10' | '11-12';

export interface ProgressCardStudentData {
  studentId: string;
  fullName: string;
  grNumber: string;
  rollNumber: string;
  className: string;
  division: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  mobileNumber?: string;
  photoUrl?: string | null;
}

export interface ProgressCardAttendance {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  percentage: number;
}

export interface ProgressCardSubjectRow {
  subjectName: string;
  term1Grade?: string;
  term1Observation?: string;
  term2Grade?: string;
  term2Observation?: string;
}

export interface ProgressCardStars {
  academicPerformance: number;
  improvement: number;
  consistency: number;
  participation: number;
  homework: number;
}

export interface ProgressCardResultSummary {
  grandTotal: number | string;
  percentage: number | string;
  grade: string;
  rank: number | string;
}

export interface ProgressCardRendererProps {
  schoolName: string;
  schoolTrust: string;
  schoolAddress?: string;
  schoolLogoUrl?: string | null;
  academicYear: string;
  pageMode: ProgressCardPageMode;
  student: ProgressCardStudentData;
  attendance: ProgressCardAttendance;
  subjects: ProgressCardSubjectRow[];
  stars: ProgressCardStars;
  summary: ProgressCardResultSummary;
  classTeacherRemarks?: string;
  urduObservation?: string;
}

const STARS_LABELS: Array<{ key: keyof ProgressCardStars; label: string; labelUr: string }> = [
  { key: 'academicPerformance', label: 'Academic Performance', labelUr: 'تعلیمی کارکردگی' },
  { key: 'improvement',         label: 'Improvement',          labelUr: 'بہتری' },
  { key: 'consistency',         label: 'Consistency',          labelUr: 'مستقل مزاجی' },
  { key: 'participation',       label: 'Participation',        labelUr: 'شرکت' },
  { key: 'homework',            label: 'Homework',             labelUr: 'ہوم ورک' },
];

function StarRow({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= count ? 'opacity-100' : 'opacity-25'}>★</span>
      ))}
    </span>
  );
}

export default function ProgressCardRenderer(props: ProgressCardRendererProps) {
  const { student, attendance, subjects, stars, summary, pageMode } = props;

  return (
    <div className="w-full max-w-[1120px] bg-white text-slate-900 rounded-2xl border-2 border-amber-400 shadow-2xl overflow-hidden">

      {/* === HEADER === */}
      <div className="bg-gradient-to-r from-[#06163f] via-[#0b3d86] to-[#06163f] text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-amber-300 bg-white/10">
              <span className="text-2xl font-black text-amber-300">NHS</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-cyan-100">{props.schoolTrust}</div>
              <div className="text-2xl font-black">{props.schoolName}</div>
              <div className="text-[10px] font-semibold tracking-widest text-amber-300">
                EDUCATION · DISCIPLINE · EXCELLENCE
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-amber-300">PROGRESS CARD</div>
            <div className="text-xs font-bold">Academic Year · {props.academicYear}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-cyan-200">
              {pageMode === 'one_side' ? 'One Side' : 'Two Side'}
            </div>
          </div>
        </div>
      </div>

      {/* === STUDENT INFO + PHOTO === */}
      <div className="grid grid-cols-[140px_1fr] gap-4 p-5">
        <div className="flex flex-col items-center justify-start rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-50 p-3">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-sky-200 to-indigo-200 shadow">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-12 w-12 text-indigo-800" />
            )}
          </div>
          <div className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-500">
            Student Photo
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          {([
            ['Student Name', student.fullName],
            ['G.R. No.', student.grNumber],
            ['Roll No.', student.rollNumber],
            ['Class', student.className + (student.division ? ' · ' + student.division : '')],
            ['Date of Birth', student.dateOfBirth || '—'],
            ["Father's Name", student.fatherName || '—'],
            ["Mother's Name", student.motherName || '—'],
            ['Mobile', student.mobileNumber || '—'],
            ['Address', student.address || '—'],
          ] as Array<[string, string]>).map(([label, value], i) => (
            <div key={label} className={`grid grid-cols-[160px_1fr] text-xs ${i ? 'border-t border-slate-200' : ''}`}>
              <div className="bg-slate-50 px-3 py-2 font-black text-slate-600">{label}</div>
              <div className="px-3 py-2 font-bold text-slate-900">{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === SCHOLASTIC TABLE === */}
      <div className="px-5 pb-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#06163f]">
          <Award className="h-4 w-4 text-amber-500" /> Scholastic Performance
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#08265e] text-white">
                <th className="p-2 text-left">Subject</th>
                <th className="p-2">Term 1 Grade</th>
                <th className="p-2">Observation</th>
                {pageMode === 'two_side' && <th className="p-2">Term 2 Grade</th>}
                {pageMode === 'two_side' && <th className="p-2">Observation</th>}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="p-2 font-bold">{s.subjectName}</td>
                  <td className="p-2 text-center font-black text-indigo-700">{s.term1Grade || '—'}</td>
                  <td className="p-2 text-center">{s.term1Observation || '—'}</td>
                  {pageMode === 'two_side' && <td className="p-2 text-center font-black text-indigo-700">{s.term2Grade || '—'}</td>}
                  {pageMode === 'two_side' && <td className="p-2 text-center">{s.term2Observation || '—'}</td>}
                </tr>
              ))}
              {!subjects.length && (
                <tr><td colSpan={pageMode === 'two_side' ? 5 : 3} className="p-6 text-center text-slate-500">No subjects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === STARS === */}
      <div className="px-5 pb-4">
        <div className="mb-2 text-sm font-black text-[#06163f]">Teacher Observation</div>
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
          {STARS_LABELS.map(row => (
            <div key={row.key} className="flex items-center justify-between border-b border-dashed border-slate-200 py-1 last:border-0">
              <span className="text-xs font-bold text-slate-700">
                {row.label} <span className="text-slate-400">· {row.labelUr}</span>
              </span>
              <StarRow count={stars[row.key] || 0} />
            </div>
          ))}
        </div>
      </div>

      {/* === ATTENDANCE + SUMMARY === */}
      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-black text-emerald-900">
            <HeartPulse className="h-4 w-4" /> Attendance
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Working</div><b>{attendance.workingDays}</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Present</div><b>{attendance.presentDays}</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Absent</div><b>{attendance.absentDays}</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Leave</div><b>{attendance.leaveDays}</b></div>
          </div>
          <div className="mt-2 rounded-lg bg-emerald-600 py-1 text-center text-xs font-black text-white">
            {attendance.percentage}% Attendance
          </div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="mb-2 text-xs font-black text-indigo-900">Result Summary</div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Grand Total</div><b>{summary.grandTotal}</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Percentage</div><b>{summary.percentage}%</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Grade</div><b className="text-indigo-700">{summary.grade}</b></div>
            <div className="rounded-lg bg-white p-2"><div className="text-[10px] text-slate-500">Rank</div><b>{summary.rank}</b></div>
          </div>
        </div>
      </div>

      {/* === REMARKS === */}
      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-1 text-[10px] font-black uppercase text-slate-500">Class Teacher's Remarks</div>
          <p className="text-xs leading-6 text-slate-700 min-h-[60px]">{props.classTeacherRemarks || '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-3" dir="rtl">
          <div className="mb-1 text-[10px] font-black uppercase text-slate-500 text-right">مشاہدہ</div>
          <p className="text-xs leading-7 text-slate-700 min-h-[60px] text-right" style={{ fontFamily: 'Noto Nastaliq Urdu, Noto Naskh Arabic, serif' }}>
            {props.urduObservation || '—'}
          </p>
        </div>
      </div>

      {/* === FOOTER === */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#06163f] via-[#0b347c] to-[#06163f] px-6 py-2 text-[9px] font-semibold text-white">
        <div className="flex items-center gap-2"><School2 className="h-4 w-4 text-amber-300" /> A Great Place To Learn & Grow</div>
        <div className="text-amber-200">Good Education Today · Better Nation Tomorrow</div>
      </div>
    </div>
  );
}
