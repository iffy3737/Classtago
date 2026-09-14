import React from 'react';
import { Award, GraduationCap, Medal, Sparkles, Star } from 'lucide-react';
import type { CertificateTemplatePreset } from '../lib/certificateCatalog';
import { SchoolBrandMark } from './SchoolBrandMarks';

interface DecorationProps {
  preset: CertificateTemplatePreset;
}

export function CertificateTemplateDecorations({ preset }: DecorationProps) {
  const a = preset.accent;
  const b = preset.secondary;
  switch (preset.layout) {
    case 'midnight-gold':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 rounded-sm bg-[#fffdf8] shadow-[inset_0_0_0_1px_rgba(255,255,255,.4)]" />
        <div className="absolute -left-20 -top-16 h-52 w-52 rounded-[46%] border-[9px]" style={{ borderColor: a }} />
        <div className="absolute -right-20 -top-16 h-52 w-52 rounded-[46%] border-[9px]" style={{ borderColor: a }} />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-[46%] border-[9px]" style={{ borderColor: a }} />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-[46%] border-[9px]" style={{ borderColor: a }} />
      </div>;
    case 'school-geometric':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-16 h-48 w-56 rotate-12" style={{ background: a }} />
        <div className="absolute left-7 top-0 h-32 w-3 -rotate-[35deg]" style={{ background: b }} />
        <div className="absolute -right-16 -bottom-16 h-48 w-56 rotate-12" style={{ background: a }} />
        <div className="absolute bottom-0 right-7 h-32 w-3 -rotate-[35deg]" style={{ background: b }} />
      </div>;
    case 'institutional-crest':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-7 right-7 top-0 h-28" style={{ background: a, clipPath: 'polygon(0 0,100% 0,100% 64%,72% 88%,50% 100%,28% 88%,0 64%)' }} />
        <div className="absolute inset-4 border-[5px]" style={{ borderColor: b }} />
        <div className="absolute left-1/2 top-20 h-20 w-20 -translate-x-1/2 rounded-full border-[6px] bg-white/95" style={{ borderColor: b }} />
      </div>;
    case 'ornate-heritage':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 rounded-sm bg-[#fffdf8] shadow-inner" />
        <div className="absolute inset-8 border" style={{ borderColor: a }} />
        <div className="absolute left-4 top-1 text-6xl leading-none" style={{ color: a }}>❦</div>
        <div className="absolute right-4 top-1 -scale-x-100 text-6xl leading-none" style={{ color: a }}>❦</div>
        <div className="absolute bottom-1 left-4 scale-y-[-1] text-6xl leading-none" style={{ color: a }}>❦</div>
        <div className="absolute bottom-1 right-4 scale-[-1] text-6xl leading-none" style={{ color: a }}>❦</div>
      </div>;
    case 'emerald-modern':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-0 h-full w-44 -skew-x-12" style={{ background: a }} />
        <div className="absolute left-9 top-0 h-full w-3 -skew-x-12" style={{ background: b }} />
        <div className="absolute bottom-6 right-6 top-6 w-px" style={{ background: a }} />
      </div>;
    case 'maroon-classic':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border-[5px] border-double" style={{ borderColor: a }} />
        <div className="absolute left-8 top-8 h-10 w-10 border-l-4 border-t-4" style={{ borderColor: b }} />
        <div className="absolute right-8 top-8 h-10 w-10 border-r-4 border-t-4" style={{ borderColor: b }} />
        <div className="absolute bottom-8 left-8 h-10 w-10 border-b-4 border-l-4" style={{ borderColor: b }} />
        <div className="absolute bottom-8 right-8 h-10 w-10 border-b-4 border-r-4" style={{ borderColor: b }} />
      </div>;
    case 'minimal-clean':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border border-slate-400" />
        <div className="absolute left-8 right-8 top-8 h-1" style={{ background: a }} />
        <div className="absolute bottom-8 left-8 right-8 h-px" style={{ background: b }} />
      </div>;
    case 'urdu-heritage':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-4 border-[5px] border-double" style={{ borderColor: a }} />
        <div className="absolute left-4 right-4 top-4 h-9" style={{ background: b }} />
        <div className="absolute bottom-4 left-4 right-4 h-7" style={{ background: a }} />
      </div>;
    case 'medal-column':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border-2" style={{ borderColor: b }} />
        <div className="absolute bottom-0 left-[13%] top-0 w-[18%]" style={{ background: a }} />
        <div className="absolute bottom-0 left-[16%] top-0 w-[5%] bg-white/15" />
        <div className="absolute left-[10.5%] top-[34%] flex h-24 w-24 items-center justify-center rounded-full border-[7px] bg-[#e8c35a] shadow-xl" style={{ borderColor: b }}>
          <Medal className="h-10 w-10" style={{ color: a }} />
        </div>
      </div>;
    case 'wave-modern':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-12 -top-8 h-28 w-[120%] -rotate-3 rounded-[50%]" style={{ background: a }} />
        <div className="absolute -left-8 top-12 h-12 w-[120%] -rotate-3 rounded-[50%] opacity-90" style={{ background: b }} />
        <div className="absolute -bottom-14 -right-12 h-28 w-[120%] rotate-2 rounded-[50%]" style={{ background: a }} />
      </div>;
    case 'laurel-classic':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border-2" style={{ borderColor: a }} />
        <div className="absolute inset-8 border" style={{ borderColor: b }} />
        <div className="absolute left-7 top-1/2 -translate-y-1/2 text-7xl opacity-70" style={{ color: a }}>❧</div>
        <div className="absolute right-7 top-1/2 -translate-y-1/2 -scale-x-100 text-7xl opacity-70" style={{ color: a }}>❧</div>
        <div className="absolute left-1/2 top-8 -translate-x-1/2 text-2xl" style={{ color: a }}>◆</div>
      </div>;
    case 'corner-ribbon':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border-2" style={{ borderColor: b }} />
        <div className="absolute -left-8 top-0 h-full w-28 -skew-x-6" style={{ background: a }} />
        <div className="absolute left-8 top-0 h-full w-5 -skew-x-6" style={{ background: b }} />
        <div className="absolute right-0 top-0 h-20 w-24" style={{ background: `linear-gradient(135deg, ${b}, transparent 72%)` }} />
      </div>;
    case 'split-luxury':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-6 bg-[#fffdf7] shadow-2xl" />
        <div className="absolute left-0 top-0 h-24 w-24 border-l-[18px] border-t-[18px]" style={{ borderColor: a }} />
        <div className="absolute right-0 top-0 h-24 w-24 border-r-[18px] border-t-[18px]" style={{ borderColor: a }} />
        <div className="absolute bottom-0 left-0 h-24 w-24 border-b-[18px] border-l-[18px]" style={{ borderColor: a }} />
        <div className="absolute bottom-0 right-0 h-24 w-24 border-b-[18px] border-r-[18px]" style={{ borderColor: a }} />
      </div>;
    case 'diamond-frame':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-5 border-[3px]" style={{ borderColor: a }} />
        <div className="absolute left-1/2 top-0 h-16 w-16 -translate-x-1/2 rotate-45 border-b-[5px] border-r-[5px] bg-white" style={{ borderColor: b }} />
        <div className="absolute bottom-0 left-1/2 h-16 w-16 -translate-x-1/2 rotate-45 border-l-[5px] border-t-[5px] bg-white" style={{ borderColor: b }} />
        <div className="absolute left-0 top-1/2 h-14 w-14 -translate-y-1/2 rotate-45 border-r-[4px] border-t-[4px] bg-white" style={{ borderColor: b }} />
        <div className="absolute right-0 top-1/2 h-14 w-14 -translate-y-1/2 rotate-45 border-b-[4px] border-l-[4px] bg-white" style={{ borderColor: b }} />
      </div>;
    case 'academic-banner':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 right-0 top-0 h-24" style={{ background: a }} />
        <div className="absolute left-0 right-0 top-24 h-2" style={{ background: b }} />
        <div className="absolute bottom-8 left-8 right-8 h-px" style={{ background: a }} />
      </div>;
    case 'soft-geometric':
      return <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-14 -top-16 h-52 w-52 rotate-12 rounded-[36%] opacity-95" style={{ background: b }} />
        <div className="absolute -left-24 top-10 h-52 w-52 rotate-12 rounded-[36%]" style={{ background: a }} />
        <div className="absolute -bottom-20 -right-14 h-52 w-52 -rotate-12 rounded-[36%] opacity-95" style={{ background: b }} />
        <div className="absolute -bottom-24 -right-24 h-52 w-52 -rotate-12 rounded-[36%]" style={{ background: a }} />
      </div>;
    default:
      return null;
  }
}

interface ThumbProps {
  preset: CertificateTemplatePreset;
  schoolName: string;
  managementName?: string;
  logoUrl?: string;
  studentName?: string;
  languageLabel?: string;
  selected?: boolean;
}

export function CertificateTemplateThumbnail({ preset, schoolName, managementName = 'School Management', logoUrl, studentName = 'Student Name', languageLabel = 'English', selected = false }: ThumbProps) {
  const portrait = preset.orientation === 'portrait';
  const dark = ['midnight-gold', 'ornate-heritage', 'split-luxury'].includes(preset.layout);
  return (
    <div className={`relative mx-auto overflow-hidden rounded-[14px] shadow-[0_12px_30px_rgba(15,23,42,.18)] ${portrait ? 'aspect-[0.707/1] w-[72%]' : 'aspect-[1.414/1] w-full'}`} style={{ background: preset.background, color: preset.foreground }}>
      <CertificateTemplateDecorations preset={preset} />
      <div className={`relative z-10 flex h-full flex-col items-center justify-center text-center ${portrait ? 'px-[14%] py-[14%]' : 'px-[14%] py-[10%]'} ${preset.layout === 'institutional-crest' || preset.layout === 'academic-banner' ? 'pt-[24%]' : ''}`}>
        {preset.showLogo && <SchoolBrandMark imageUrl={logoUrl} schoolName={schoolName} managementName={managementName} className={`${portrait ? 'h-10 w-10' : 'h-8 w-8'} mb-1.5`} />}
        <p className={`font-black uppercase tracking-[.16em] ${portrait ? 'text-[5px]' : 'text-[5.5px]'} ${dark ? 'text-slate-700' : ''}`}>{managementName}</p>
        <p className={`mt-1 font-black uppercase tracking-[.08em] ${portrait ? 'text-[8px]' : 'text-[9px]'}`}>{schoolName}</p>
        <div className={`mt-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[4.5px] font-black uppercase tracking-[.12em] ${dark ? 'bg-slate-900/10 text-slate-700' : 'bg-white/60'}`}>
          <GraduationCap className="h-2.5 w-2.5" /> {languageLabel}
        </div>
        <h3 className={`${portrait ? 'mt-4 text-[13px]' : 'mt-3 text-[14px]'} font-black uppercase tracking-[.05em]`} style={{ color: dark ? '#1f2937' : preset.accent }}>Certificate of Excellence</h3>
        <p className="mt-1.5 text-[5px] opacity-70">Proudly presented to</p>
        <p className={`${portrait ? 'mt-2 text-[15px]' : 'mt-1.5 text-[17px]'} font-semibold`} style={{ fontFamily: 'Georgia, Times New Roman, serif', color: dark ? '#7a5b18' : preset.foreground }}>{studentName}</p>
        <div className={`${portrait ? 'mt-3 max-w-[90%]' : 'mt-2 max-w-[72%]'} text-[5px] leading-[1.5] opacity-75`}>For outstanding achievement, dedication and excellence in the school community.</div>
        <div className={`${portrait ? 'mt-4' : 'mt-3'} flex w-full items-end justify-between text-[4.5px] font-bold opacity-75`}>
          <span className="border-t px-2 pt-1">Class Teacher</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ borderColor: preset.accent }}><Award className="h-3.5 w-3.5" /></div>
          <span className="border-t px-2 pt-1">Headmaster</span>
        </div>
      </div>
      {selected && <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[6px] font-black text-white shadow"><Star className="h-2.5 w-2.5 fill-current" /> SELECTED</div>}
    </div>
  );
}
