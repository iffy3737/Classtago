import React from 'react';
import { UserRound } from 'lucide-react';
import type { ProgressCardDesign } from './designs';

export type Orientation = 'portrait' | 'landscape';

export interface ProgressCardStudentData {
  studentId: string; fullName: string; grNumber: string; rollNumber: string;
  className: string; division: string; dateOfBirth?: string; fatherName?: string;
  motherName?: string; address?: string; mobileNumber?: string; photoUrl?: string | null;
}
export interface ProgressCardAttendance { workingDays: number; presentDays: number; absentDays: number; leaveDays: number; percentage: number; }
export interface ProgressCardSubjectRow { subjectName: string; term1Grade?: string; term1Observation?: string; term2Grade?: string; term2Observation?: string; }
export interface ProgressCardStars { academicPerformance: number; improvement: number; consistency: number; participation: number; homework: number; }
export interface ProgressCardResultSummary { grandTotal: number | string; percentage: number | string; grade: string; rank: number | string; }

export interface ProgressCardRendererProps {
  design: ProgressCardDesign;
  schoolName: string; schoolTrust: string; academicYear: string;
  pageMode: 'one_side' | 'two_side'; orientation: Orientation;
  student: ProgressCardStudentData; attendance: ProgressCardAttendance;
  subjects: ProgressCardSubjectRow[]; stars: ProgressCardStars; summary: ProgressCardResultSummary;
  classTeacherRemarks?: string; urduObservation?: string;
}

const STAR_LABELS: Array<{ key: keyof ProgressCardStars; label: string }> = [
  { key: 'academicPerformance', label: 'Academic Performance' },
  { key: 'improvement',         label: 'Improvement' },
  { key: 'consistency',         label: 'Consistency' },
  { key: 'participation',       label: 'Participation' },
  { key: 'homework',            label: 'Homework' },
];

function StarBar({ count, color }: { count: number; color: string }) {
  return <span className="inline-flex gap-0.5" style={{ color }}>{[1,2,3,4,5].map(n => <span key={n} style={{ opacity: n <= count ? 1 : 0.2 }}>★</span>)}</span>;
}

function StudentPhoto({ d, student, size = 96 }: any) {
  return (
    <div className="grid place-items-center overflow-hidden rounded-full" style={{ width: size, height: size, border: `4px solid ${d.goldColor}`, background: '#fff' }}>
      {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-full w-full object-cover"/> : <UserRound className="h-10 w-10" style={{ color: d.primaryColor }}/>}
    </div>
  );
}

function InfoTable({ d, student, compact = false }: any) {
  const rows: Array<[string,string]> = [
    ['Student Name', student.fullName],
    ['G.R. No.', student.grNumber],
    ['Roll No.', student.rollNumber],
    ['Class / Division', `${student.className}${student.division ? ' · ' + student.division : ''}`],
    ['Date of Birth', student.dateOfBirth || '—'],
    ["Father's Name", student.fatherName || '—'],
    ["Mother's Name", student.motherName || '—'],
    ['Mobile', student.mobileNumber || '—'],
  ];
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${d.primaryColor}25` }}>
      {rows.map(([label, value], i) => (
        <div key={label} className="grid text-xs" style={{ gridTemplateColumns: '140px 1fr', borderTop: i ? `1px solid ${d.primaryColor}20` : 'none' }}>
          <div className={`px-2 ${compact ? 'py-1' : 'py-1.5'} font-black`} style={{ background: `${d.primaryColor}08`, color: d.primaryColor }}>{label}</div>
          <div className={`px-2 ${compact ? 'py-1' : 'py-1.5'} font-bold`} style={{ color: d.textColor }}>{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function SubjectTable({ d, subjects, pageMode }: any) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${d.primaryColor}25` }}>
      <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: d.primaryColor, color: '#fff' }}>
            <th className="p-1.5 text-left">Subject</th>
            <th className="p-1.5">T1</th>
            <th className="p-1.5">Obs</th>
            {pageMode === 'two_side' && <th className="p-1.5">T2</th>}
            {pageMode === 'two_side' && <th className="p-1.5">Obs</th>}
          </tr>
        </thead>
        <tbody>
          {subjects.map((s: any, i: number) => (
            <tr key={i} style={{ background: i % 2 ? `${d.primaryColor}04` : '#fff' }}>
              <td className="p-1.5 font-bold" style={{ color: d.textColor }}>{s.subjectName}</td>
              <td className="p-1.5 text-center font-black" style={{ color: d.primaryColor }}>{s.term1Grade || '—'}</td>
              <td className="p-1.5 text-center text-[10px]" style={{ color: d.textColor }}>{s.term1Observation || '—'}</td>
              {pageMode === 'two_side' && <td className="p-1.5 text-center font-black" style={{ color: d.primaryColor }}>{s.term2Grade || '—'}</td>}
              {pageMode === 'two_side' && <td className="p-1.5 text-center text-[10px]" style={{ color: d.textColor }}>{s.term2Observation || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StarsTable({ d, stars, compact = false }: any) {
  return (
    <div className="rounded-xl p-2.5" style={{ border: `1px solid ${d.primaryColor}25`, background: `${d.primaryColor}04` }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: d.primaryColor, marginBottom: 4, letterSpacing: 0.5 }}>TEACHER OBSERVATION</div>
      {STAR_LABELS.map(row => (
        <div key={row.key} className="flex items-center justify-between py-0.5" style={{ borderBottom: `1px dashed ${d.primaryColor}20` }}>
          <span className={compact ? 'text-[9px]' : 'text-[10px]'} style={{ color: d.textColor, fontWeight: 700 }}>{row.label}</span>
          <StarBar count={stars[row.key] || 0} color={d.goldColor}/>
        </div>
      ))}
    </div>
  );
}

function AttendanceBox({ d, attendance }: any) {
  return (
    <div className="rounded-xl p-2" style={{ background: `${d.secondaryColor}12`, border: `1px solid ${d.primaryColor}20` }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: d.primaryColor, marginBottom: 4 }}>ATTENDANCE</div>
      <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Work</div><b>{attendance.workingDays}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Pres</div><b>{attendance.presentDays}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Abs</div><b>{attendance.absentDays}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Leave</div><b>{attendance.leaveDays}</b></div>
      </div>
      <div className="mt-1 rounded py-0.5 text-center text-[10px] font-black" style={{ background: d.primaryColor, color: d.goldColor }}>{attendance.percentage}% Present</div>
    </div>
  );
}

function SummaryBox({ d, summary }: any) {
  return (
    <div className="rounded-xl p-2" style={{ background: `${d.goldColor}15`, border: `1px solid ${d.goldColor}50` }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: d.primaryColor, marginBottom: 4 }}>RESULT</div>
      <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Total</div><b>{summary.grandTotal}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>%</div><b>{summary.percentage}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Grade</div><b style={{ color: d.primaryColor }}>{summary.grade}</b></div>
        <div className="rounded p-0.5" style={{ background: '#fff' }}><div style={{ opacity: 0.6 }}>Rank</div><b>{summary.rank}</b></div>
      </div>
    </div>
  );
}

function RemarksBox({ d, classTeacherRemarks, urduObservation }: any) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="rounded-xl p-2.5" style={{ border: `1px solid ${d.primaryColor}25` }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: d.primaryColor, marginBottom: 3 }}>CLASS TEACHER</div>
        <p className="text-[10px]" style={{ color: d.textColor, lineHeight: 1.6, minHeight: 36 }}>{classTeacherRemarks || '—'}</p>
      </div>
      <div className="rounded-xl p-2.5" dir="rtl" style={{ border: `1px solid ${d.primaryColor}25` }}>
        <div style={{ fontSize: 9, fontWeight: 900, color: d.primaryColor, marginBottom: 3, textAlign: 'right' }}>مشاہدہ</div>
        <p className="text-[10px] text-right" style={{ fontFamily: "'Noto Nastaliq Urdu', serif", color: d.textColor, lineHeight: 1.9, minHeight: 36 }}>{urduObservation || '—'}</p>
      </div>
    </div>
  );
}

function FooterBar({ d }: any) {
  return (
    <div className="flex items-center justify-between px-5 py-2 text-[9px] font-semibold" style={{ background: d.primaryColor, color: '#fff' }}>
      <span style={{ color: d.goldColor }}>◆ A Great Place To Learn & Grow</span>
      <span style={{ color: d.goldColor }}>Good Education Today · Better Nation Tomorrow</span>
    </div>
  );
}

function BorderFrame({ d }: any) {
  if (d.borderStyle === 'none') return null;
  return (
    <div className="pointer-events-none absolute inset-2 rounded-lg" style={{
      border: d.borderStyle === 'double_gold' ? `3px double ${d.goldColor}` :
              d.borderStyle === 'gold_foil' ? `4px solid ${d.goldColor}` :
              d.borderStyle === 'navy_silver' ? `2px solid ${d.primaryColor}` :
              d.borderStyle === 'ornate' ? `2px solid ${d.primaryColor}` :
              `1px solid ${d.primaryColor}40`,
      boxShadow: d.hasGoldFoil ? `inset 0 0 0 1px ${d.goldColor}60` : 'none',
    }}/>
  );
}

function Watermark({ d, schoolName, ft }: any) {
  if (!d.hasWatermark) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: 0.035, zIndex: 0 }}>
      <div style={{ fontFamily: ft, fontSize: 180, fontWeight: 900, color: d.primaryColor }}>{schoolName?.split(' ')[0] || 'SCHOOL'}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT 1: CLASSIC GRID
// ═══════════════════════════════════════════════════════════
function ClassicGridLayout(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;
  const ft = `'${d.fontTitle}', Georgia, serif`;
  return (
    <div className="relative" style={{ width: 1080, background: d.backgroundColor, color: d.textColor }}>
      <Watermark d={d} schoolName={props.schoolName} ft={ft}/>
      <BorderFrame d={d}/>
      <div style={{ background: `linear-gradient(135deg, ${d.primaryColor} 0%, ${d.secondaryColor} 50%, ${d.primaryColor} 100%)`, padding: '18px 22px', color: '#fff' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center rounded-2xl" style={{ width: 60, height: 60, background: 'rgba(255,255,255,0.1)', border: `2px solid ${d.goldColor}` }}>
              <span style={{ fontFamily: ft, fontSize: 16, fontWeight: 900, color: d.goldColor }}>NHS</span>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>{props.schoolTrust}</div>
              <div style={{ fontFamily: ft, fontSize: 22, fontWeight: 900 }}>{props.schoolName}</div>
              <div style={{ fontSize: 10, color: d.goldColor, letterSpacing: 3 }}>EDUCATION · DISCIPLINE · EXCELLENCE</div>
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontFamily: ft, fontSize: 24, fontWeight: 900, color: d.goldColor }}>PROGRESS CARD</div>
            <div style={{ fontSize: 11 }}>Academic Year · {props.academicYear}</div>
          </div>
        </div>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${d.goldColor}, transparent)` }}/>
      <div style={{ padding: 18, position: 'relative', zIndex: 1 }} className="space-y-3">
        <div className="grid gap-4" style={{ gridTemplateColumns: '120px 1fr' }}>
          <div className="flex flex-col items-center rounded-2xl p-2" style={{ background: `${d.primaryColor}08` }}>
            <StudentPhoto d={d} student={student} size={92}/>
            <div style={{ fontSize: 8, fontWeight: 900, marginTop: 4, color: d.primaryColor }}>STUDENT PHOTO</div>
          </div>
          <InfoTable d={d} student={student}/>
        </div>
        <SubjectTable d={d} subjects={subjects} pageMode={pageMode}/>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <StarsTable d={d} stars={stars}/>
          <div className="grid gap-2" style={{ gridTemplateRows: '1fr 1fr' }}>
            <AttendanceBox d={d} attendance={attendance}/>
            <SummaryBox d={d} summary={summary}/>
          </div>
        </div>
        <RemarksBox d={d} classTeacherRemarks={props.classTeacherRemarks} urduObservation={props.urduObservation}/>
      </div>
      <FooterBar d={d}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT 2: SIDEBAR LEFT
// ═══════════════════════════════════════════════════════════
function SidebarLeftLayout(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;
  const ft = `'${d.fontTitle}', Georgia, serif`;
  return (
    <div className="relative" style={{ width: 1080, background: d.backgroundColor, color: d.textColor }}>
      <BorderFrame d={d}/>
      <div className="flex">
        <div style={{ width: 280, background: d.primaryColor, color: '#fff', padding: 20 }}>
          <div className="flex flex-col items-center">
            <StudentPhoto d={d} student={student} size={110}/>
            <div style={{ fontFamily: ft, fontSize: 18, fontWeight: 900, marginTop: 10, textAlign: 'center' }}>{student.fullName}</div>
            <div style={{ fontSize: 11, color: d.goldColor, marginTop: 4 }}>{student.className}{student.division ? ' · ' + student.division : ''}</div>
            <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>Roll {student.rollNumber} · GR {student.grNumber}</div>
          </div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${d.goldColor}40` }} className="space-y-2 text-[11px]">
            <div><span style={{ color: d.goldColor, fontWeight: 700 }}>DOB:</span> {student.dateOfBirth || '—'}</div>
            <div><span style={{ color: d.goldColor, fontWeight: 700 }}>Father:</span> {student.fatherName || '—'}</div>
            <div><span style={{ color: d.goldColor, fontWeight: 700 }}>Mother:</span> {student.motherName || '—'}</div>
            <div><span style={{ color: d.goldColor, fontWeight: 700 }}>Mobile:</span> {student.mobileNumber || '—'}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <AttendanceBox d={d} attendance={attendance}/>
          </div>
        </div>
        <div style={{ flex: 1, padding: 18 }} className="space-y-3">
          <div style={{ background: d.primaryColor, color: '#fff', padding: '12px 16px', borderRadius: 12 }}>
            <div style={{ fontFamily: ft, fontSize: 18, fontWeight: 900, color: d.goldColor }}>{props.schoolName}</div>
            <div style={{ fontSize: 10 }}>{props.schoolTrust}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>Progress Card · {props.academicYear}</div>
          </div>
          <SubjectTable d={d} subjects={subjects} pageMode={pageMode}/>
          <StarsTable d={d} stars={stars}/>
          <SummaryBox d={d} summary={summary}/>
          <RemarksBox d={d} classTeacherRemarks={props.classTeacherRemarks} urduObservation={props.urduObservation}/>
        </div>
      </div>
      <FooterBar d={d}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT 3: BANNER HERO
// ═══════════════════════════════════════════════════════════
function BannerHeroLayout(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;
  const ft = `'${d.fontTitle}', Georgia, serif`;
  return (
    <div className="relative" style={{ width: 1080, background: d.backgroundColor, color: d.textColor }}>
      <Watermark d={d} schoolName={props.schoolName} ft={ft}/>
      <BorderFrame d={d}/>
      <div style={{ background: d.primaryColor, padding: '24px 30px', color: '#fff', textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: 2 }}>{props.schoolTrust}</div>
        <div style={{ fontFamily: ft, fontSize: 32, fontWeight: 900, marginTop: 4, color: d.goldColor }}>{props.schoolName}</div>
        <div style={{ fontSize: 11, marginTop: 6, letterSpacing: 4 }}>EDUCATION · DISCIPLINE · EXCELLENCE</div>
        <div style={{ display: 'inline-block', marginTop: 12, background: d.goldColor, color: d.primaryColor, padding: '6px 24px', borderRadius: 20, fontFamily: ft, fontSize: 16, fontWeight: 900 }}>
          PROGRESS CARD · {props.academicYear}
        </div>
      </div>
      <div style={{ padding: 18, position: 'relative', zIndex: 1 }} className="space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: '130px 1fr' }}>
          <div className="flex flex-col items-center rounded-2xl p-3" style={{ background: `${d.primaryColor}08`, border: `2px solid ${d.goldColor}` }}>
            <StudentPhoto d={d} student={student} size={100}/>
            <div style={{ fontFamily: ft, fontSize: 13, fontWeight: 900, marginTop: 8, textAlign: 'center', color: d.primaryColor }}>{student.fullName}</div>
            <div style={{ fontSize: 10, color: d.textColor, opacity: 0.7 }}>Roll {student.rollNumber}</div>
          </div>
          <InfoTable d={d} student={student} compact/>
        </div>
        <SubjectTable d={d} subjects={subjects} pageMode={pageMode}/>
        <div className="grid gap-3" style={{ gridTemplateColumns: '1.2fr 1fr 1fr' }}>
          <StarsTable d={d} stars={stars} compact/>
          <AttendanceBox d={d} attendance={attendance}/>
          <SummaryBox d={d} summary={summary}/>
        </div>
        <RemarksBox d={d} classTeacherRemarks={props.classTeacherRemarks} urduObservation={props.urduObservation}/>
      </div>
      <FooterBar d={d}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT 4: TWO COLUMN
// ═══════════════════════════════════════════════════════════
function TwoColumnLayout(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;
  const ft = `'${d.fontTitle}', Georgia, serif`;
  return (
    <div className="relative" style={{ width: 1080, background: d.backgroundColor, color: d.textColor }}>
      <BorderFrame d={d}/>
      <div style={{ background: d.primaryColor, color: '#fff', padding: '14px 22px' }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontFamily: ft, fontSize: 20, fontWeight: 900, color: d.goldColor }}>{props.schoolName}</div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>{props.schoolTrust}</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 12, fontWeight: 700 }}>Progress Card</div>
            <div style={{ fontSize: 10, color: d.goldColor }}>AY {props.academicYear}</div>
          </div>
        </div>
      </div>
      <div style={{ height: 3, background: d.goldColor }}/>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.15fr', gap: 0 }}>
        <div style={{ padding: 18, borderRight: `2px solid ${d.primaryColor}15` }} className="space-y-3">
          <div className="flex flex-col items-center rounded-2xl p-3" style={{ background: `${d.primaryColor}08` }}>
            <StudentPhoto d={d} student={student} size={110}/>
            <div style={{ fontFamily: ft, fontSize: 16, fontWeight: 900, marginTop: 8, color: d.primaryColor, textAlign: 'center' }}>{student.fullName}</div>
            <div style={{ fontSize: 11, color: d.textColor, opacity: 0.7 }}>{student.className} · Roll {student.rollNumber}</div>
          </div>
          <div className="space-y-1.5 text-[11px]" style={{ color: d.textColor }}>
            <div><b style={{ color: d.primaryColor }}>GR No:</b> {student.grNumber}</div>
            <div><b style={{ color: d.primaryColor }}>DOB:</b> {student.dateOfBirth || '—'}</div>
            <div><b style={{ color: d.primaryColor }}>Father:</b> {student.fatherName || '—'}</div>
            <div><b style={{ color: d.primaryColor }}>Mother:</b> {student.motherName || '—'}</div>
            <div><b style={{ color: d.primaryColor }}>Mobile:</b> {student.mobileNumber || '—'}</div>
          </div>
          <AttendanceBox d={d} attendance={attendance}/>
          <StarsTable d={d} stars={stars} compact/>
        </div>
        <div style={{ padding: 18 }} className="space-y-3">
          <SubjectTable d={d} subjects={subjects} pageMode={pageMode}/>
          <SummaryBox d={d} summary={summary}/>
          <RemarksBox d={d} classTeacherRemarks={props.classTeacherRemarks} urduObservation={props.urduObservation}/>
        </div>
      </div>
      <FooterBar d={d}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYOUT 5: MINIMAL CLEAN
// ═══════════════════════════════════════════════════════════
function MinimalCleanLayout(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;
  const ft = `'${d.fontTitle}', Georgia, serif`;
  return (
    <div className="relative" style={{ width: 1080, background: '#ffffff', color: d.textColor, padding: 32 }}>
      <div style={{ borderBottom: `3px solid ${d.primaryColor}`, paddingBottom: 14, marginBottom: 20 }}>
        <div className="flex items-end justify-between">
          <div>
            <div style={{ fontFamily: ft, fontSize: 28, fontWeight: 900, color: d.primaryColor, letterSpacing: 1 }}>{props.schoolName}</div>
            <div style={{ fontSize: 11, color: d.textColor, opacity: 0.7, marginTop: 2 }}>{props.schoolTrust}</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 11, letterSpacing: 4, color: d.primaryColor, fontWeight: 700 }}>PROGRESS CARD</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Academic Year {props.academicYear}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: '110px 1fr', marginBottom: 20 }}>
        <StudentPhoto d={d} student={student} size={100}/>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
          <div><b style={{ color: d.primaryColor }}>Name:</b> {student.fullName}</div>
          <div><b style={{ color: d.primaryColor }}>GR:</b> {student.grNumber}</div>
          <div><b style={{ color: d.primaryColor }}>Roll:</b> {student.rollNumber}</div>
          <div><b style={{ color: d.primaryColor }}>Class:</b> {student.className}</div>
          <div><b style={{ color: d.primaryColor }}>DOB:</b> {student.dateOfBirth || '—'}</div>
          <div><b style={{ color: d.primaryColor }}>Father:</b> {student.fatherName || '—'}</div>
          <div><b style={{ color: d.primaryColor }}>Mother:</b> {student.motherName || '—'}</div>
          <div><b style={{ color: d.primaryColor }}>Mobile:</b> {student.mobileNumber || '—'}</div>
        </div>
      </div>
      <div className="space-y-4">
        <SubjectTable d={d} subjects={subjects} pageMode={pageMode}/>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <StarsTable d={d} stars={stars} compact/>
          <AttendanceBox d={d} attendance={attendance}/>
          <SummaryBox d={d} summary={summary}/>
        </div>
        <RemarksBox d={d} classTeacherRemarks={props.classTeacherRemarks} urduObservation={props.urduObservation}/>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════
export default function ProgressCardBaseRenderer(props: ProgressCardRendererProps) {
  switch (props.design.layout) {
    case 'sidebar_left': return <SidebarLeftLayout {...props}/>;
    case 'banner_hero':  return <BannerHeroLayout {...props}/>;
    case 'two_column':   return <TwoColumnLayout {...props}/>;
    case 'minimal_clean': return <MinimalCleanLayout {...props}/>;
    case 'classic_grid':
    default: return <ClassicGridLayout {...props}/>;
  }
}
