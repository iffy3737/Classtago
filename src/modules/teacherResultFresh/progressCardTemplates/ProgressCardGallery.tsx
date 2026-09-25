import React, { useState } from 'react';
import { Eye, CheckCircle2, Crown, Sparkles, Star } from 'lucide-react';
import { DESIGNS, type ProgressCardDesign } from './designs';
import ProgressCardBaseRenderer from './ProgressCardBaseRenderer';

/* Gallery — grid of 50 designs with Preview + Apply */

const SAMPLE_STUDENT = {
  studentId: 'demo',
  fullName: 'Iram Fatema Mo. Arif Bagwan',
  grNumber: '1707',
  rollNumber: '02',
  className: 'VI',
  division: 'A',
  dateOfBirth: '05-02-2013',
  fatherName: 'Mohammad Aarif Bagwan',
  motherName: 'Rovina Bi',
  address: 'Taloda, Nandurbar',
  mobileNumber: '99999 30041',
  photoUrl: null,
};

const SAMPLE_ATTENDANCE = {
  workingDays: 210, presentDays: 196, absentDays: 6, leaveDays: 6, percentage: 92.3,
};

const SAMPLE_SUBJECTS = [
  { subjectName: 'Urdu',        term1Grade: 'A+', term1Observation: 'Excellent', term2Grade: 'A+', term2Observation: 'Excellent' },
  { subjectName: 'English',     term1Grade: 'A+', term1Observation: 'Exceptional', term2Grade: 'A+', term2Observation: 'Exceptional' },
  { subjectName: 'Hindi',       term1Grade: 'A',  term1Observation: 'Very Good',  term2Grade: 'A+', term2Observation: 'Very Good' },
  { subjectName: 'Mathematics', term1Grade: 'A+', term1Observation: 'Excellent', term2Grade: 'A+', term2Observation: 'Very Good' },
  { subjectName: 'Science',     term1Grade: 'A+', term1Observation: 'Excellent', term2Grade: 'A+', term2Observation: 'Very Good' },
  { subjectName: 'Social Science', term1Grade: 'A', term1Observation: 'Good',    term2Grade: 'A+', term2Observation: 'Excellent' },
  { subjectName: 'Work Exp.',   term1Grade: 'A+', term1Observation: 'Excellent', term2Grade: 'A+', term2Observation: 'Very Good' },
  { subjectName: 'Art Education', term1Grade: 'A+', term1Observation: 'Creative', term2Grade: 'A+', term2Observation: 'Excellent' },
];

const SAMPLE_STARS = { academicPerformance: 5, improvement: 4, consistency: 4, participation: 5, homework: 4 };
const SAMPLE_SUMMARY = { grandTotal: 'Excellent', percentage: '92', grade: 'A+', rank: 1 };

const TIER_CONFIG = {
  elite:    { label: 'Elite',    icon: Crown,    color: '#7c2d12', bg: '#fef3c7' },
  royal:    { label: 'Royal',    icon: Star,     color: '#7c2d12', bg: '#fef9c3' },
  premium:  { label: 'Premium',  icon: Sparkles, color: '#0369a1', bg: '#e0f2fe' },
} as const;

interface ProgressCardGalleryProps {
  pageMode: 'one_side' | 'two_side';
  orientation?: 'portrait' | 'landscape';
  appliedDesignId?: string;
  onApply: (design: ProgressCardDesign) => void;
  schoolName?: string;
  schoolTrust?: string;
  academicYear?: string;
}

export default function ProgressCardGallery({
  pageMode,
  orientation = 'landscape',
  appliedDesignId,
  onApply,
  schoolName = 'NATIONAL HIGH SCHOOL, TALODA',
  schoolTrust = 'Bharat Vividh Vidhayak Karya Samiti, Nandurbar',
  academicYear = '2025-26',
}: ProgressCardGalleryProps) {
  const [previewDesign, setPreviewDesign] = useState<ProgressCardDesign | null>(null);
  const [filterTier, setFilterTier] = useState<'all' | 'royal' | 'premium' | 'elite'>('all');

  const filtered = filterTier === 'all' ? DESIGNS : DESIGNS.filter(d => d.tier === filterTier);

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-indigo-900">Progress Card Designs</div>
              <div className="text-[11px] text-indigo-700">
                {DESIGNS.length} premium templates · {pageMode === 'one_side' ? 'One-Side' : 'Two-Side'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm">
            {(['all', 'royal', 'premium', 'elite'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black capitalize transition ${
                  filterTier === tier ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tier === 'all' ? `All (${DESIGNS.length})` : tier}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(design => {
          const tier = TIER_CONFIG[design.tier];
          const TierIcon = tier.icon;
          const isApplied = appliedDesignId === design.id;
          return (
            <article
              key={design.id}
              className={`group overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition hover:shadow-lg ${
                isApplied ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              {/* Color preview strip */}
              <div className="relative h-32 overflow-hidden" style={{ background: `linear-gradient(135deg, ${design.primaryColor}, ${design.secondaryColor})` }}>
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(circle at 30% 20%, ${design.goldColor} 0%, transparent 40%)` }} />
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                  <div className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{ background: tier.bg, color: tier.color }}>
                    <TierIcon className="mr-0.5 inline h-2.5 w-2.5" />
                    {tier.label}
                  </div>
                  {isApplied && (
                    <div className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">
                      <CheckCircle2 className="mr-0.5 inline h-2.5 w-2.5" /> Applied
                    </div>
                  )}
                </div>
                <div className="absolute right-2 top-2 flex gap-1">
                  <div className="h-4 w-4 rounded-full border border-white/60" style={{ background: design.accentColor }} />
                  <div className="h-4 w-4 rounded-full border border-white/60" style={{ background: design.goldColor }} />
                </div>
              </div>

              <div className="p-3">
                <div className="text-sm font-black text-slate-900">{design.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-500">
                  {design.headerStyle} · {design.borderStyle.replace('_', ' ')}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {design.hasCornerOrnaments && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">Corners</span>}
                  {design.hasMedalBadge && <span className="rounded bg-yellow-50 px-1.5 py-0.5 text-[8px] font-bold text-yellow-700">Medal</span>}
                  {design.hasGoldFoil && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[8px] font-bold text-orange-700">Gold Foil</span>}
                  {design.hasRibbonBanner && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-red-700">Ribbon</span>}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPreviewDesign(design)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-50"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button
                    onClick={() => onApply(design)}
                    disabled={isApplied}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-2 text-[11px] font-black text-white hover:bg-indigo-700 disabled:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3 w-3" /> {isApplied ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewDesign && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-slate-950/85 p-3 backdrop-blur-md"
          style={{ isolation: 'isolate' }}
          onClick={() => setPreviewDesign(null)}
        >
          <div className="relative z-[10000] my-4 w-full max-w-[1140px] rounded-2xl bg-white shadow-2xl ring-4 ring-white/20" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <div>
                  <div className="text-sm font-black">{previewDesign.name}</div>
                  <div className="text-[10px] opacity-80">Preview with sample student data</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onApply(previewDesign); setPreviewDesign(null); }}
                  className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-black"
                >
                  Apply This Design
                </button>
                <button onClick={() => setPreviewDesign(null)} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-black">
                  Close
                </button>
              </div>
            </div>
            <div className="overflow-auto bg-slate-200 p-4">
              <div className="mx-auto" style={{ width: 'fit-content' }}>
                <ProgressCardBaseRenderer
                  design={previewDesign}
                  schoolName={schoolName}
                  schoolTrust={schoolTrust}
                  academicYear={academicYear}
                  pageMode={pageMode}
                  orientation={orientation}
                  student={SAMPLE_STUDENT}
                  attendance={SAMPLE_ATTENDANCE}
                  subjects={SAMPLE_SUBJECTS}
                  stars={SAMPLE_STARS}
                  summary={SAMPLE_SUMMARY}
                  classTeacherRemarks="Ayaan is a hardworking and sincere student. He has shown excellent performance in academics as well as co-curricular activities. Keep it up and aim higher."
                  urduObservation="یہ طالب علم محنتی، مودب اور بااخلاق ہے۔ اس کی کارکردگی قابلِ تعریف ہے۔"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
