import React from 'react';
import { UserRound } from 'lucide-react';
import type { ProgressCardDesign } from './designs';

/* ============================================================
   Base Renderer — one component renders ALL 50 designs.
   Design config drives colors, fonts, layout, decorations.
   ============================================================ */

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
  design: ProgressCardDesign;
  schoolName: string;
  schoolTrust: string;
  academicYear: string;
  pageMode: 'one_side' | 'two_side';
  student: ProgressCardStudentData;
  attendance: ProgressCardAttendance;
  subjects: ProgressCardSubjectRow[];
  stars: ProgressCardStars;
  summary: ProgressCardResultSummary;
  classTeacherRemarks?: string;
  urduObservation?: string;
  scale?: number;
}

const STAR_LABELS: Array<{ key: keyof ProgressCardStars; label: string }> = [
  { key: 'academicPerformance', label: 'Academic Performance' },
  { key: 'improvement',         label: 'Improvement' },
  { key: 'consistency',         label: 'Consistency' },
  { key: 'participation',       label: 'Participation' },
  { key: 'homework',            label: 'Homework' },
];

function StarBar({ count, color }: { count: number; color: string }) {
  return (
    <span className="inline-flex gap-0.5" style={{ color }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ opacity: n <= count ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

// ─── Decorative sub-components ───────────────────────────────

function CornerOrnaments({ color }: { color: string }) {
  const corner = (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path d="M2 2 L2 18 M2 2 L18 2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="2" fill={color}/>
      <path d="M2 26 Q8 26 8 20" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6"/>
    </svg>
  );
  return (
    <>
      <div className="pointer-events-none absolute left-1 top-1">{corner}</div>
      <div className="pointer-events-none absolute right-1 top-1" style={{ transform: 'scaleX(-1)' }}>{corner}</div>
      <div className="pointer-events-none absolute left-1 bottom-1" style={{ transform: 'scaleY(-1)' }}>{corner}</div>
      <div className="pointer-events-none absolute right-1 bottom-1" style={{ transform: 'scale(-1,-1)' }}>{corner}</div>
    </>
  );
}

function MedalBadge({ gold, accent }: { gold: string; accent: string }) {
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 54, height: 54 }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <defs>
          <radialGradient id="medalGrad" cx="50%" cy="40%">
            <stop offset="0%" stopColor={gold}/>
            <stop offset="100%" stopColor={accent}/>
          </radialGradient>
        </defs>
        <circle cx="27" cy="27" r="25" fill="url(#medalGrad)" stroke={accent} strokeWidth="2"/>
        <circle cx="27" cy="27" r="20" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6"/>
        <text x="27" y="32" textAnchor="middle" fontSize="16" fontWeight="900" fill="#7c2d12">★</text>
      </svg>
    </div>
  );
}

function SparkleDecor({ color }: { color: string }) {
  return (
    <span className="inline-block" style={{ color }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0 L9 6 L15 7 L9 8 L8 14 L7 8 L1 7 L7 6 Z"/>
      </svg>
    </span>
  );
}

function ElegantDivider({ color }: { color: string }) {
  return (
    <div className="my-3 flex items-center gap-2">
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}/>
      <div className="flex items-center gap-1" style={{ color }}>
        <span>◆</span><span>◆</span><span>◆</span>
      </div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}/>
    </div>
  );
}

// ─── Main renderer ───────────────────────────────────────────

export default function ProgressCardBaseRenderer(props: ProgressCardRendererProps) {
  const { design: d, student, attendance, subjects, stars, summary, pageMode } = props;

  const fontTitleStack = `'${d.fontTitle}', 'Playfair Display', Georgia, serif`;
  const fontBodyStack = `'${d.fontBody}', 'Inter', system-ui, sans-serif`;

  return (
    <div
      className="relative bg-white"
      style={{
        width: 1100,
        fontFamily: fontBodyStack,
        background: d.backgroundColor,
        color: d.textColor,
      }}
    >
      {/* Watermark */}
      {d.hasWatermark && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0.035, zIndex: 0 }}
        >
          <div style={{ fontFamily: fontTitleStack, fontSize: 220, fontWeight: 900, color: d.primaryColor }}>
            {props.schoolName?.split(' ')[0] || 'SCHOOL'}
          </div>
        </div>
      )}

      {/* Border frame */}
      {d.borderStyle !== 'none' && (
        <div
          className="pointer-events-none absolute inset-2 rounded-lg"
          style={{
            border:
              d.borderStyle === 'double_gold'
                ? `3px double ${d.goldColor}`
                : d.borderStyle === 'gold_foil'
                ? `4px solid ${d.goldColor}`
                : d.borderStyle === 'navy_silver'
                ? `2px solid ${d.primaryColor}`
                : d.borderStyle === 'ornate'
                ? `2px solid ${d.primaryColor}`
                : `1px solid ${d.primaryColor}40`,
            boxShadow:
              d.hasGoldFoil
                ? `inset 0 0 0 1px ${d.goldColor}60, 0 0 30px ${d.goldColor}20`
                : 'none',
          }}
        />
      )}

      {/* Corner ornaments */}
      {d.hasCornerOrnaments && <CornerOrnaments color={d.goldColor} />}

      {/* ───────── HEADER ───────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            d.headerStyle === 'gradient'
              ? `linear-gradient(135deg, ${d.primaryColor} 0%, ${d.secondaryColor} 50%, ${d.primaryColor} 100%)`
              : d.headerStyle === 'ornate'
              ? `linear-gradient(135deg, ${d.primaryColor} 0%, ${d.secondaryColor} 100%)`
              : d.headerStyle === 'ribbon'
              ? d.primaryColor
              : d.primaryColor,
          color: '#fff',
          padding: '22px 28px',
        }}
      >
        {/* Ribbon accent */}
        {d.hasRibbonBanner && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 0, width: 200, height: 6, background: d.goldColor, borderRadius: '0 0 8px 8px' }}
          />
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="grid place-items-center rounded-2xl"
              style={{
                width: 76, height: 76,
                background: 'rgba(255,255,255,0.08)',
                border: `2px solid ${d.goldColor}`,
                backdropFilter: 'blur(6px)',
              }}
            >
              <span style={{ fontFamily: fontTitleStack, fontSize: 22, fontWeight: 900, color: d.goldColor }}>
                NHS
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: 1 }}>{props.schoolTrust}</div>
              <div
                style={{
                  fontFamily: fontTitleStack,
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  textShadow: d.hasEmbossedTitle ? `0 2px 4px rgba(0,0,0,0.4), 0 0 20px ${d.goldColor}40` : 'none',
                }}
              >
                {props.schoolName}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: d.goldColor, letterSpacing: 4, marginTop: 2 }}>
                EDUCATION · DISCIPLINE · EXCELLENCE
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            {d.hasMedalBadge && <MedalBadge gold={d.goldColor} accent={d.accentColor} />}
            <div>
              <div style={{ fontFamily: fontTitleStack, fontSize: 34, fontWeight: 900, color: d.goldColor, lineHeight: 1 }}>
                PROGRESS CARD
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                Academic Year · {props.academicYear}
              </div>
              {d.hasSparkleAccent && (
                <div className="mt-1 flex justify-end gap-2" style={{ color: d.goldColor }}>
                  <SparkleDecor color={d.goldColor}/>
                  <SparkleDecor color={d.goldColor}/>
                  <SparkleDecor color={d.goldColor}/>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gold accent strip */}
      {d.hasGoldFoil && (
        <div style={{ height: 4, background: `linear-gradient(90deg, transparent, ${d.goldColor}, transparent)` }}/>
      )}

      {/* ───────── BODY ───────── */}
      <div style={{ padding: 22, position: 'relative', zIndex: 1 }}>
        {d.hasElegantDivider && <ElegantDivider color={d.goldColor}/>}

        {/* Student info + photo */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '140px 1fr' }}>
          <div
            className="flex flex-col items-center rounded-2xl p-3"
            style={{ background: `linear-gradient(180deg, ${d.secondaryColor}15, ${d.primaryColor}10)` }}
          >
            <div
              className="grid place-items-center overflow-hidden rounded-full"
              style={{ width: 110, height: 110, border: `4px solid ${d.goldColor}`, background: '#fff' }}
            >
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-full w-full object-cover"/>
              ) : (
                <UserRound className="h-12 w-12" style={{ color: d.primaryColor }}/>
              )}
            </div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 2, marginTop: 8, color: d.primaryColor }}>
              STUDENT PHOTO
            </div>
          </div>

          <div
            className="overflow-hidden rounded-xl"
            style={{ border: `1px solid ${d.primaryColor}25` }}
          >
            {([
              ['Student Name', student.fullName],
              ['G.R. No.', student.grNumber],
              ['Roll No.', student.rollNumber],
              ['Class / Division', `${student.className}${student.division ? ' · ' + student.division : ''}`],
              ['Date of Birth', student.dateOfBirth || '—'],
              ["Father's Name", student.fatherName || '—'],
              ["Mother's Name", student.motherName || '—'],
              ['Mobile', student.mobileNumber || '—'],
            ] as Array<[string, string]>).map(([label, value], i) => (
              <div
                key={label}
                className="grid text-xs"
                style={{
                  gridTemplateColumns: '160px 1fr',
                  borderTop: i ? `1px solid ${d.primaryColor}20` : 'none',
                }}
              >
                <div
                  className="px-3 py-2 font-black"
                  style={{ background: `${d.primaryColor}08`, color: d.primaryColor, fontFamily: fontBodyStack }}
                >
                  {label}
                </div>
                <div className="px-3 py-2 font-bold" style={{ color: d.textColor }}>
                  {value || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scholastic Table */}
        <div className="mt-5">
          <div
            className="flex items-center gap-2 mb-2"
            style={{ fontFamily: fontTitleStack, fontSize: 18, fontWeight: 900, color: d.primaryColor }}
          >
            <span style={{ color: d.goldColor }}>◆</span> Scholastic Performance
          </div>
          <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${d.primaryColor}25` }}>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: d.primaryColor, color: '#fff' }}>
                  <th className="p-2 text-left">Subject</th>
                  <th className="p-2">Term 1 Grade</th>
                  <th className="p-2">Observation</th>
                  {pageMode === 'two_side' && <th className="p-2">Term 2 Grade</th>}
                  {pageMode === 'two_side' && <th className="p-2">Observation</th>}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={i} style={{ background: i % 2 ? `${d.primaryColor}04` : '#fff' }}>
                    <td className="p-2 font-bold" style={{ color: d.textColor }}>{s.subjectName}</td>
                    <td className="p-2 text-center font-black" style={{ color: d.primaryColor }}>{s.term1Grade || '—'}</td>
                    <td className="p-2 text-center" style={{ color: d.textColor }}>{s.term1Observation || '—'}</td>
                    {pageMode === 'two_side' && <td className="p-2 text-center font-black" style={{ color: d.primaryColor }}>{s.term2Grade || '—'}</td>}
                    {pageMode === 'two_side' && <td className="p-2 text-center" style={{ color: d.textColor }}>{s.term2Observation || '—'}</td>}
                  </tr>
                ))}
                {!subjects.length && (
                  <tr><td colSpan={pageMode === 'two_side' ? 5 : 3} className="p-6 text-center" style={{ color: d.textColor, opacity: 0.5 }}>No subjects yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stars + Attendance + Summary */}
        <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div
            className="rounded-xl p-3"
            style={{ border: `1px solid ${d.primaryColor}25`, background: `${d.primaryColor}04` }}
          >
            <div style={{ fontFamily: fontTitleStack, fontSize: 14, fontWeight: 900, color: d.primaryColor, marginBottom: 8 }}>
              Teacher Observation
            </div>
            {STAR_LABELS.map(row => (
              <div
                key={row.key}
                className="flex items-center justify-between py-1"
                style={{ borderBottom: `1px dashed ${d.primaryColor}20` }}
              >
                <span className="text-xs font-bold" style={{ color: d.textColor }}>{row.label}</span>
                <StarBar count={stars[row.key] || 0} color={d.goldColor}/>
              </div>
            ))}
          </div>

          <div className="grid gap-3" style={{ gridTemplateRows: '1fr 1fr' }}>
            <div
              className="rounded-xl p-3"
              style={{ background: `${d.secondaryColor}12`, border: `1px solid ${d.primaryColor}20` }}
            >
              <div style={{ fontFamily: fontTitleStack, fontSize: 13, fontWeight: 900, color: d.primaryColor, marginBottom: 6 }}>
                Attendance
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Working</div><b>{attendance.workingDays}</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Present</div><b>{attendance.presentDays}</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Absent</div><b>{attendance.absentDays}</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Leave</div><b>{attendance.leaveDays}</b>
                </div>
              </div>
              <div
                className="mt-2 rounded py-1 text-center text-xs font-black"
                style={{ background: d.primaryColor, color: d.goldColor }}
              >
                {attendance.percentage}% Attendance
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{ background: `${d.goldColor}15`, border: `1px solid ${d.goldColor}50` }}
            >
              <div style={{ fontFamily: fontTitleStack, fontSize: 13, fontWeight: 900, color: d.primaryColor, marginBottom: 6 }}>
                Result Summary
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Total</div><b>{summary.grandTotal}</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>%</div><b>{summary.percentage}%</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Grade</div><b style={{ color: d.primaryColor }}>{summary.grade}</b>
                </div>
                <div className="rounded p-1" style={{ background: '#fff' }}>
                  <div style={{ opacity: 0.6 }}>Rank</div><b>{summary.rank}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="rounded-xl p-3" style={{ border: `1px solid ${d.primaryColor}25` }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: d.primaryColor, marginBottom: 4 }}>
              CLASS TEACHER'S REMARKS
            </div>
            <p className="text-xs min-h-[50px]" style={{ color: d.textColor, lineHeight: 1.7 }}>
              {props.classTeacherRemarks || '—'}
            </p>
          </div>
          <div className="rounded-xl p-3" dir="rtl" style={{ border: `1px solid ${d.primaryColor}25` }}>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, color: d.primaryColor, marginBottom: 4, textAlign: 'right' }}>
              مشاہدہ
            </div>
            <p
              className="text-xs min-h-[50px] text-right"
              style={{ fontFamily: "'Noto Nastaliq Urdu', serif", color: d.textColor, lineHeight: 2 }}
            >
              {props.urduObservation || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ───────── FOOTER ───────── */}
      <div
        className="flex items-center justify-between px-6 py-3 text-[10px] font-semibold"
        style={{
          background: `linear-gradient(90deg, ${d.primaryColor}, ${d.secondaryColor}, ${d.primaryColor})`,
          color: '#fff',
        }}
      >
        <span style={{ color: d.goldColor }}>◆ A Great Place To Learn & Grow</span>
        <span style={{ color: d.goldColor }}>Good Education Today · Better Nation Tomorrow</span>
      </div>
    </div>
  );
}
