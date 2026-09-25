import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Eye,
  FileImage,
  Info,
  LayoutTemplate,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Award,
  CalendarDays,
  GraduationCap,
  HeartPulse,
  Medal,
  School2,
  Trophy,
  UserRound,
} from 'lucide-react';
import { Language, User } from '../types';
import { supabase } from '../lib/supabase';
import ProgressCardGallery from '../modules/teacherResultFresh/progressCardTemplates/ProgressCardGallery';
import { DESIGNS } from '../modules/teacherResultFresh/progressCardTemplates/designs';
import { FALLBACK_LANGUAGE_CATALOGUE, LanguageOption, getLanguageOption, languageDisplayName, resolvedDirection } from '../lib/languageCatalog';
import DocumentLanguageStudio from './DocumentLanguageStudio';
import {
  DocumentLanguageProfile,
  createDocumentLanguageProfile,
  documentLanguageDirection,
  documentLanguageFont,
  fieldSelection,
  languageValue,
  normalizeDocumentLanguageProfile,
  primaryDocumentLanguage,
  sectionSelection,
} from '../lib/documentLanguage';

interface MasterProgressCardTemplateEditorProps {
  user: User;
  language: Language;
}

type CardTypeId = 'type1' | 'type2';
type PreviewSide = 'front' | 'back';
type PreviewMode = 'live' | 'reference';
type CardLanguageDirection = 'ltr' | 'rtl';

const CUSTOM_LANGUAGE_CODE = 'custom';
const CARD_LANGUAGE_OPTIONS: LanguageOption[] = [
  ...FALLBACK_LANGUAGE_CATALOGUE,
  { code: CUSTOM_LANGUAGE_CODE, englishName: 'Custom / Other', nativeName: 'Custom / Other', scriptCode: 'Zyyy', direction: 'auto', localeCode: null },
];

type FrontFieldKey = 'aadhaar' | 'saral' | 'studentName' | 'grNo' | 'rollNo' | 'className' | 'fatherName' | 'motherName' | 'dob' | 'motherTongue' | 'address' | 'mobile';

const PROGRESS_CARD_LANGUAGE_SECTIONS = [
  { key: 'header', label: 'School Header', description: 'Management, school name, evaluation title and academic year.' },
  { key: 'studentDetails', label: 'Student Details', description: 'Student information labels; each field can override this language.' },
  { key: 'health', label: 'Health Section', description: 'Health heading and measurement labels.' },
  { key: 'attendance', label: 'Attendance', description: 'Attendance heading, month/table labels and summary labels.' },
  { key: 'guidance', label: 'Guidance / Instructions', description: 'Parent guidance heading and instruction text.' },
  { key: 'academic', label: 'Academic Tables', description: 'Term headings, subject headings, grades, marks and result labels.' },
  { key: 'observations', label: 'Teacher Observation', description: 'Observation heading, blocks and narrative.' },
  { key: 'signatures', label: 'Signature Labels', description: 'Headmaster, class teacher and parent signature captions.' },
] as const;

const PROGRESS_CARD_LANGUAGE_FIELDS = [
  { key: 'aadhaar', label: 'Aadhaar No.', sectionKey: 'studentDetails' },
  { key: 'saral', label: 'Saral ID', sectionKey: 'studentDetails' },
  { key: 'studentName', label: 'Student Name', sectionKey: 'studentDetails' },
  { key: 'grNo', label: 'G.R. No.', sectionKey: 'studentDetails' },
  { key: 'rollNo', label: 'Roll No.', sectionKey: 'studentDetails' },
  { key: 'className', label: 'Class', sectionKey: 'studentDetails' },
  { key: 'fatherName', label: "Father's Name", sectionKey: 'studentDetails' },
  { key: 'motherName', label: "Mother's Name", sectionKey: 'studentDetails' },
  { key: 'dob', label: 'Date of Birth', sectionKey: 'studentDetails' },
  { key: 'motherTongue', label: 'Mother Tongue', sectionKey: 'studentDetails' },
  { key: 'address', label: 'Address', sectionKey: 'studentDetails' },
  { key: 'mobile', label: 'Mobile No.', sectionKey: 'studentDetails' },
] as const;

const createDefaultProgressCardLanguageProfile = (): DocumentLanguageProfile => {
  const profile = createDocumentLanguageProfile('progress-card', [...PROGRESS_CARD_LANGUAGE_SECTIONS], 'en');
  profile.sections.studentDetails = { languages: ['en', 'ur'], layout: 'columns' };
  profile.sections.guidance = { languages: ['ur'], layout: 'single' };
  profile.sections.academic = { languages: ['en', 'ur'], layout: 'inline' };
  profile.sections.observations = { languages: ['ur'], layout: 'single' };
  profile.sections.signatures = { languages: ['en', 'ur'], layout: 'inline' };
  return profile;
};

type TemplateConfig = {
  structureVersion: string;
  pageSize: 'A4';
  orientation: 'Landscape';
  pageMode: 'one_side' | 'two_side';
  design: {
    templateName: string;
    primaryColor: string;
    accentColor: string;
    secondaryColor: string;
    backgroundColor: string;
    headerStyle: 'gradient' | 'solid' | 'minimal';
    borderStyle: 'gold' | 'navy' | 'thin' | 'none';
    layout: 'classic' | 'modern' | 'compact';
    logoPosition: 'left' | 'center' | 'right';
    showHealth: boolean;
    showAttendance: boolean;
    showGuidance: boolean;
    showSignatures: boolean;
  };
  documentLanguageProfile: DocumentLanguageProfile;
  languages: {
    primaryCode: string;
    secondaryCode: string;
    secondaryEnabled: boolean;
    customPrimaryName: string;
    customSecondaryName: string;
    customPrimaryDirection: CardLanguageDirection;
    customSecondaryDirection: CardLanguageDirection;
  };
  front: {
    trustName: string;
    schoolName: string;
    evaluationTitle: string;
    academicYear: string;
    sectionTitle: string;
    healthTitle: string;
    attendanceTitle: string;
    guidanceTitle: string;
    guidanceLines: string[];
    fieldLabels: Record<FrontFieldKey, Record<string, string>>;
    signatureLabels: { headmaster: string; classTeacher: string; parent: string };
  };
  type1: {
    title: string;
    backHeading: string;
    classes: number[];
    semester1Label: string;
    semester2Label: string;
    observationTitle: string;
    observationBlocks: string[];
    observationNarrative: string;
    subjects: string[];
    optionalSubjects: string[];
  };
  type2: {
    title: string;
    backHeading: string;
    classes: number[];
    firstTermLabel: string;
    secondTermLabel: string;
    resultTitle: string;
    observationTitle: string;
    observationBlocks: string[];
    observationNarrative: string;
    subjects: string[];
    optionalSubjects: string[];
  };
};

const DEFAULT_CONFIG: TemplateConfig = {
  structureVersion: 'r13-progress-card-multilingual-resultbook-v4',
  pageSize: 'A4',
  orientation: 'Landscape',
  pageMode: 'two_side',
  design: {
    templateName: 'Classic Navy',
    primaryColor: '#06163f',
    accentColor: '#fbbf24',
    secondaryColor: '#0b3d86',
    backgroundColor: '#f8fbff',
    headerStyle: 'gradient',
    borderStyle: 'gold',
    layout: 'classic',
    logoPosition: 'left',
    showHealth: true,
    showAttendance: true,
    showGuidance: true,
    showSignatures: true,
  },
  documentLanguageProfile: createDefaultProgressCardLanguageProfile(),
  languages: {
    primaryCode: 'en',
    secondaryCode: 'ur',
    secondaryEnabled: true,
    customPrimaryName: '',
    customSecondaryName: '',
    customPrimaryDirection: 'ltr',
    customSecondaryDirection: 'rtl',
  },
  front: {
    trustName: 'Bharat Vividh Vidhayak Karya Samiti, Nandurbar',
    schoolName: 'NATIONAL HIGH SCHOOL, TALODA',
    evaluationTitle: 'CONTINUOUS COMPREHENSIVE EVALUATION',
    academicYear: '2024-2025',
    sectionTitle: 'Student Information / طلب علم کی معلومات',
    healthTitle: 'Health Information / صحت سے متعلق معلومات',
    attendanceTitle: 'Attendance / حاضری',
    guidanceTitle: 'ہدایات و رہنمائی',
    guidanceLines: [
      'طالب علم باقاعدگی سے اور وقت پر اسکول آئے۔',
      'طالب علم کی غیر حاضری کی صورت میں اسکول کو بروقت اطلاع دیں۔',
      'بچے کی تعلیمی ترقی کے لیے والدین اور اساتذہ باہمی تعاون رکھیں۔',
      'کلاس روم اور اسکول کے احاطے میں صفائی کا خاص خیال رکھیں۔',
      'مطالعہ، روزانہ کی پڑھائی اور تحریری کام پر خصوصی توجہ دیں۔',
      'بچوں کو تمباکو، گٹکا اور دیگر مضر عادات سے دور رکھیں۔',
      'بچے کے روشن مستقبل کے لیے اسکول اور والدین مل کر ذمہ داری نبھائیں۔',
    ],
    fieldLabels: {
      aadhaar: { en: 'Aadhaar No.', ur: 'آدھار نمبر' },
      saral: { en: 'Saral ID', ur: 'سرل آئی ڈی' },
      studentName: { en: 'Student Name', ur: 'طالب علم کا نام' },
      grNo: { en: 'G.R. No.', ur: 'جنرل رجسٹر نمبر' },
      rollNo: { en: 'Roll No.', ur: 'رول نمبر' },
      className: { en: 'Class', ur: 'جماعت' },
      fatherName: { en: "Father's Name", ur: 'والد کا نام' },
      motherName: { en: "Mother's Name", ur: 'والدہ کا نام' },
      dob: { en: 'Date of Birth', ur: 'تاریخ پیدائش' },
      motherTongue: { en: 'Mother Tongue', ur: 'مادری زبان' },
      address: { en: 'Address', ur: 'پتہ' },
      mobile: { en: 'Mobile No.', ur: 'موبائل نمبر' },
    },
    signatureLabels: {
      headmaster: 'Head Master / ہیڈ ماسٹر',
      classTeacher: 'Class Teacher / کلاس ٹیچر',
      parent: 'Parent / والدین',
    },
  },
  type1: {
    title: 'Card Type 1',
    backHeading: 'Academic & Narrative Progress · Grade Based',
    classes: [1, 2, 3, 4, 6, 7],
    semester1Label: 'Progress Card I Semester',
    semester2Label: 'Progress Card II Semester',
    observationTitle: 'Teacher Observation / بیانیہ اندراج',
    observationBlocks: [
      'Excellent Progress / نمایاں ترقی',
      'Needs Improvement / ضروری اصلاح',
      'Encouragement / حوصلہ افزائی',
    ],
    observationNarrative: 'طالب علم کی تعلیمی پیش رفت، دلچسپی، مطالعہ اور مستقل مزاجی سے متعلق خودکار مشاہدہ یہاں آئے گا۔',
    subjects: ['Urdu', 'Marathi / Hindi', 'English', 'Mathematics', 'G. Science / EVS', 'Social Science', 'Fine Art', 'Work Experience', 'HPE'],
    optionalSubjects: ['Diniyat', 'Computer'],
  },
  type2: {
    title: 'Card Type 2',
    backHeading: 'Hybrid Academic Progress · Grade + Marks',
    classes: [5, 8],
    firstTermLabel: 'Progress Card I Semester',
    secondTermLabel: 'Progress Card II Semester',
    resultTitle: 'Final Result / سالانہ نتیجہ',
    observationTitle: 'Teacher Observation / بیانیہ اندراج',
    observationBlocks: [
      'Excellent Progress / نمایاں ترقی',
      'Needs Improvement / ضروری اصلاح',
      'Encouragement / حوصلہ افزائی',
    ],
    observationNarrative: 'طالب علم کی تعلیمی پیش رفت، دلچسپی، مطالعہ اور مستقل مزاجی سے متعلق خودکار مشاہدہ یہاں آئے گا۔',
    subjects: ['Urdu', 'Marathi / Hindi', 'English', 'Mathematics', 'G. Science / Science', 'Social Science', 'Fine Art', 'Work Experience', 'HPE'],
    optionalSubjects: ['Diniyat', 'Computer'],
  },
};


const DESIGN_PALETTES = [
  { id: 'classic_navy',    name: 'Classic Navy',     primaryColor: '#06163f', accentColor: '#fbbf24', secondaryColor: '#0b3d86', backgroundColor: '#f8fbff', borderStyle: 'gold' as const,   headerStyle: 'gradient' as const },
  { id: 'royal_gold',      name: 'Royal Gold',       primaryColor: '#4c1d0e', accentColor: '#fbbf24', secondaryColor: '#7c2d12', backgroundColor: '#fffbeb', borderStyle: 'gold' as const,   headerStyle: 'gradient' as const },
  { id: 'modern_blue',     name: 'Modern Blue',      primaryColor: '#0c4a6e', accentColor: '#22d3ee', secondaryColor: '#0284c7', backgroundColor: '#f0f9ff', borderStyle: 'navy' as const,   headerStyle: 'gradient' as const },
  { id: 'emerald_premium', name: 'Emerald Premium',  primaryColor: '#064e3b', accentColor: '#fbbf24', secondaryColor: '#047857', backgroundColor: '#ecfdf5', borderStyle: 'gold' as const,   headerStyle: 'gradient' as const },
  { id: 'maroon_elegance', name: 'Maroon Elegance',  primaryColor: '#7f1d1d', accentColor: '#fcd34d', secondaryColor: '#991b1b', backgroundColor: '#fef2f2', borderStyle: 'gold' as const,   headerStyle: 'gradient' as const },
  { id: 'slate_minimal',   name: 'Slate Minimal',    primaryColor: '#1e293b', accentColor: '#64748b', secondaryColor: '#334155', backgroundColor: '#f8fafc', borderStyle: 'thin' as const,   headerStyle: 'solid'    as const },
];

const localKey = 'edunixo_master_progress_card_classes_1_8';
const cloudTemplateKey = 'master_progress_card_classes_1_8';

const cloneDefault = (): TemplateConfig => JSON.parse(JSON.stringify(DEFAULT_CONFIG));

const mergeConfig = (raw: any): TemplateConfig => {
  const base = cloneDefault();
  if (!raw || typeof raw !== 'object') return base;
  const isR12OrLater = /^r1[2-9]-/.test(String(raw.structureVersion || ''));
  const rawLanguages = raw.languages || {};
  const rawFront = raw.front || {};
  const mergedType1 = { ...base.type1, ...(raw.type1 || {}), classes: base.type1.classes };
  const mergedType2 = { ...base.type2, ...(raw.type2 || {}), classes: base.type2.classes };
  return {
    ...base,
    ...raw,
    structureVersion: base.structureVersion,
    pageMode: raw?.pageMode === 'one_side' || raw?.pageMode === 'two_side' ? raw.pageMode : base.pageMode,
    design: { ...base.design, ...(raw?.design || {}) },
    documentLanguageProfile: raw.documentLanguageProfile ? normalizeDocumentLanguageProfile(raw.documentLanguageProfile, 'progress-card', [...PROGRESS_CARD_LANGUAGE_SECTIONS], 'en') : createDefaultProgressCardLanguageProfile(),
    languages: { ...base.languages, ...rawLanguages },
    front: {
      ...base.front,
      ...rawFront,
      guidanceTitle: isR12OrLater ? (rawFront.guidanceTitle || base.front.guidanceTitle) : base.front.guidanceTitle,
      guidanceLines: isR12OrLater && Array.isArray(rawFront.guidanceLines) ? rawFront.guidanceLines : base.front.guidanceLines,
      fieldLabels: { ...base.front.fieldLabels, ...(rawFront.fieldLabels || {}) },
      signatureLabels: { ...base.front.signatureLabels, ...(rawFront.signatureLabels || {}) },
    },
    type1: mergedType1,
    type2: {
      ...mergedType2,
      observationTitle: mergedType1.observationTitle,
      observationBlocks: mergedType1.observationBlocks,
      observationNarrative: mergedType1.observationNarrative || base.type1.observationNarrative,
    },
  };
};

const resolveCardLanguage = (code: string, customName: string, customDirection: CardLanguageDirection): LanguageOption => {
  if (code === CUSTOM_LANGUAGE_CODE) return { code, englishName: customName.trim() || 'Custom / Other', nativeName: customName.trim() || 'Custom / Other', scriptCode: 'Zyyy', direction: customDirection, localeCode: null };
  return getLanguageOption(code, CARD_LANGUAGE_OPTIONS);
};

const languageDirectionClass = (option: LanguageOption) => resolvedDirection(option) === 'rtl' ? 'text-right' : 'text-left';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10';

const TemplateBadge = ({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'cyan' }) => {
  const styles = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[tone]}`}>{children}</span>;
};

const PremiumSectionBar = ({ title, subtitle, tone = 'blue' }: { title: string; subtitle?: string; tone?: 'blue' | 'green' | 'gold' | 'rose' }) => {
  const toneClass = tone === 'green'
    ? 'from-emerald-800 via-emerald-700 to-emerald-800'
    : tone === 'gold'
      ? 'from-amber-600 via-yellow-500 to-amber-700 text-slate-950'
      : tone === 'rose'
        ? 'from-rose-800 via-rose-700 to-rose-900'
        : 'from-[#08265e] via-[#0d4b99] to-[#08265e]';
  return <div className={`rounded-xl bg-gradient-to-r ${toneClass} px-4 py-2 text-center text-white shadow-sm`}><div className="text-[12px] font-black tracking-wide">{title}</div>{subtitle && <div className="mt-0.5 text-[9px] font-semibold opacity-80">{subtitle}</div>}</div>;
};

const PremiumSignatures = ({ labels, selection }: { labels: TemplateConfig['front']['signatureLabels']; selection?: ReturnType<typeof sectionSelection> }) => (
  <div className="grid grid-cols-3 gap-3" dir={documentLanguageDirection(primaryDocumentLanguage(selection))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(selection))}}>
    {[
      ['headmaster', labels.headmaster],
      ['classTeacher', labels.classTeacher],
      ['parent', labels.parent],
    ].map(([key, label]) => (
      <div key={key} className="rounded-2xl border-2 border-slate-300 bg-white p-2 shadow-sm">
        <div className="flex min-h-[72px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-[9px] font-bold text-slate-500">SIGNATURE</div>
        <div className="mt-2 border-t border-slate-200 pt-2 text-center text-[10px] font-black text-slate-700">{label}</div>
      </div>
    ))}
  </div>
);

const FrontPreview = ({ config }: { config: TemplateConfig }) => {
  const primaryLanguage = resolveCardLanguage(config.languages.primaryCode, config.languages.customPrimaryName, config.languages.customPrimaryDirection);
  const secondaryLanguage = resolveCardLanguage(config.languages.secondaryCode, config.languages.customSecondaryName, config.languages.customSecondaryDirection);
  const primaryDir = resolvedDirection(primaryLanguage);
  const secondaryDir = resolvedDirection(secondaryLanguage);
  const studentSectionSelection = sectionSelection(config.documentLanguageProfile, 'studentDetails');
  const healthSectionSelection = sectionSelection(config.documentLanguageProfile, 'health');
  const guidanceSectionSelection = sectionSelection(config.documentLanguageProfile, 'guidance');
  const studentSectionLanguage = primaryDocumentLanguage(studentSectionSelection);
  const guidanceSectionLanguage = primaryDocumentLanguage(guidanceSectionSelection);
  const guidanceDir = documentLanguageDirection(guidanceSectionLanguage);
  const months = ['JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY'];
  const l = config.front.fieldLabels;
  const studentRows: Array<[FrontFieldKey, string]> = [
    ['aadhaar', '8887 7246 8765'],
    ['saral', 'ID-20212700104085050030'],
    ['studentName', 'Iram Fatema Mo. Arif Bagwan'],
    ['grNo', '1707'],
    ['rollNo', '02'],
    ['className', 'VI'],
    ['fatherName', 'Mohammad Aarif Bagwan'],
    ['motherName', 'Rovina Bi'],
    ['dob', '05-02-2013'],
    ['motherTongue', 'Urdu'],
    ['address', ''],
    ['mobile', '99999 30041'],
  ];
  return (
    <div className="min-w-[1120px] overflow-hidden rounded-[30px] border-[3px] border-amber-400 bg-[#f8fbff] text-slate-900 shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-r from-[#06163f] via-[#0b3d86] to-[#06163f] px-7 py-5 text-white">
        <div className="absolute -left-12 -top-16 h-44 w-44 rounded-full border-[18px] border-amber-400/20"/><div className="absolute -right-16 -bottom-20 h-52 w-52 rounded-full border-[24px] border-cyan-300/10"/>
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[22px] border-2 border-amber-300 bg-gradient-to-br from-[#102a68] to-[#06163f] shadow-lg"><div className="text-center"><div className="text-[9px] font-black text-amber-300">ESTD.</div><div className="text-2xl font-black tracking-wider">NHS</div><div className="text-[8px] font-bold text-cyan-200">TALODA</div></div></div>
            <div><div className="text-[11px] font-semibold tracking-wide text-cyan-100">{config.front.trustName}</div><div className="mt-1 text-3xl font-black tracking-wide">{config.front.schoolName}</div><div className="mt-1 text-[11px] font-semibold tracking-[.28em] text-amber-300">EDUCATION · DISCIPLINE · EXCELLENCE</div></div>
          </div>
          <div className="text-right"><div className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-300/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200"><GraduationCap className="h-4 w-4"/>{config.front.evaluationTitle}</div><div className="mt-2 text-3xl font-black text-amber-300">PROGRESS CARD</div><div className="mt-1 text-sm font-bold">Academic Year · {config.front.academicYear}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-[1.03fr_.97fr] gap-4 p-4">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-end justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">Student Profile</div><div className="mt-1 text-sm font-black text-slate-900" dir={documentLanguageDirection(studentSectionLanguage)} style={{fontFamily:documentLanguageFont(studentSectionLanguage)}}>{config.front.sectionTitle}</div></div><div className="flex flex-wrap justify-end gap-1.5">{studentSectionSelection.languages.map(code=><TemplateBadge key={code} tone={code===studentSectionLanguage?'cyan':'slate'}>{languageDisplayName(getLanguageOption(code, CARD_LANGUAGE_OPTIONS))}</TemplateBadge>)}</div></div>
            <div className="grid grid-cols-[118px_1fr] gap-4">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-sky-50 to-indigo-50 p-3"><div className="grid h-24 w-24 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-sky-200 to-indigo-200 shadow-md"><UserRound className="h-12 w-12 text-indigo-800"/></div><div className="mt-2 text-center text-[9px] font-black uppercase tracking-wide text-slate-500">Student Photo</div></div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {studentRows.map(([key, value], index) => {
                  const selection = fieldSelection(config.documentLanguageProfile, key, 'studentDetails');
                  const codes = selection.languages;
                  const firstCode = codes[0] || 'en';
                  const extraCodes = codes.slice(1);
                  return <div key={key} className={`items-stretch text-[10px] ${index ? 'border-t border-slate-200' : ''}`} style={{display:'grid',gridTemplateColumns:extraCodes.length?'155px minmax(0,1fr) 155px':'155px minmax(0,1fr)'}}><div className="flex items-center bg-slate-50 px-3 py-2 font-black text-slate-600" dir={documentLanguageDirection(firstCode)} style={{fontFamily:documentLanguageFont(firstCode),textAlign:documentLanguageDirection(firstCode)==='rtl'?'right':'left'}}>{languageValue(l[key], firstCode)}</div><div className="flex items-center px-3 py-2 font-bold text-slate-900" data-edunixo-no-translate="true">{value}</div>{extraCodes.length>0&&<div className="flex min-h-[38px] flex-col justify-center gap-1 bg-indigo-50 px-3 py-1.5 font-bold text-indigo-900">{extraCodes.map(code=><div key={code} dir={documentLanguageDirection(code)} style={{fontFamily:documentLanguageFont(code),textAlign:documentLanguageDirection(code)==='rtl'?'right':'left'}}>{languageValue(l[key], code)}</div>)}</div>}</div>;
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-3 shadow-sm">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-black text-emerald-900" dir={documentLanguageDirection(primaryDocumentLanguage(healthSectionSelection))} style={{fontFamily:documentLanguageFont(primaryDocumentLanguage(healthSectionSelection))}}><HeartPulse className="h-4 w-4"/>{config.front.healthTitle}</div><div className="text-[9px] font-semibold text-emerald-700">Auto-filled from Student Health Profile</div></div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center"><div className="rounded-xl bg-white p-2 shadow-sm"><div className="text-[9px] text-slate-500">Height</div><div className="text-sm font-black">145 cm</div></div><div className="rounded-xl bg-white p-2 shadow-sm"><div className="text-[9px] text-slate-500">Weight</div><div className="text-sm font-black">35 kg</div></div><div className="rounded-xl bg-white p-2 shadow-sm"><div className="text-[9px] text-slate-500">BMI</div><div className="text-sm font-black">16.6</div></div><div className="rounded-xl bg-white p-2 shadow-sm"><div className="text-[9px] text-slate-500">Blood Group</div><div className="text-sm font-black">B+</div></div></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <PremiumSectionBar title={config.front.attendanceTitle} subtitle="Month-wise working days and student presence" tone="green"/>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200"><table className="w-full border-collapse text-center text-[8px]"><thead><tr className="bg-slate-100">{months.map(m=><th key={m} className="border-r border-slate-200 p-1 font-black">{m}</th>)}<th className="p-1 font-black">Particular</th></tr></thead><tbody><tr>{months.map((_,i)=><td key={i} className="border-r border-t border-slate-200 p-2 font-bold">{20+(i%7)}</td>)}<td className="border-t border-slate-200 p-2 text-left font-black">Working Days</td></tr><tr>{months.map((_,i)=><td key={i} className="border-r border-t border-slate-200 p-2 font-bold text-emerald-700">{18+(i%6)}</td>)}<td className="border-t border-slate-200 p-2 text-left font-black">Present Days</td></tr></tbody></table></div>
            <div className="mt-3 grid grid-cols-4 gap-2"><div className="rounded-xl bg-[#08265e] p-2 text-center text-white"><div className="text-[8px] text-cyan-100">Working Days</div><div className="text-lg font-black">238</div></div><div className="rounded-xl bg-emerald-700 p-2 text-center text-white"><div className="text-[8px] text-emerald-100">Present</div><div className="text-lg font-black">219</div></div><div className="rounded-xl bg-amber-500 p-2 text-center text-slate-950"><div className="text-[8px]">Attendance</div><div className="text-lg font-black">92.0%</div></div><div className="rounded-xl bg-indigo-700 p-2 text-center text-white"><div className="text-[8px] text-indigo-100">Leave</div><div className="text-lg font-black">04</div></div></div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="rounded-xl bg-gradient-to-r from-[#08265e] via-[#0d4b99] to-[#08265e] px-4 py-2 text-center text-white shadow-sm"><div className="text-[14px] font-black leading-[2]" dir={guidanceDir} style={{fontFamily:documentLanguageFont(guidanceSectionLanguage)}}>{config.front.guidanceTitle}</div><div className="mt-0.5 text-[10px] font-semibold text-cyan-100">{guidanceSectionSelection.languages.map(code=>languageDisplayName(getLanguageOption(code,CARD_LANGUAGE_OPTIONS))).join(' + ')} · Instructions & Guidance</div></div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">{config.front.guidanceLines.map((line,index)=><div key={`${line}-${index}`} className={`flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[10px] leading-[2.15] text-slate-700 ${guidanceDir==='rtl'?'flex-row-reverse text-right':'text-left'}`} dir={guidanceDir} style={{fontFamily:documentLanguageFont(guidanceSectionLanguage)}}><div className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-100 text-[8px] font-black text-amber-700">{index+1}</div><span>{line}</span></div>)}</div>
          </div>
          <PremiumSignatures labels={config.front.signatureLabels} selection={sectionSelection(config.documentLanguageProfile,'signatures')}/>
        </div>
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-[#06163f] via-[#0b347c] to-[#06163f] px-6 py-2.5 text-[9px] font-semibold text-white"><div className="flex items-center gap-2"><School2 className="h-4 w-4 text-amber-300"/>A Great Place To Learn & Grow</div><div className="text-amber-200">The Future Belongs To Those Who Believe In The Beauty Of Their Dreams</div><div className="flex items-center gap-2">Good Education Today · Better Nation Tomorrow <Award className="h-4 w-4 text-amber-300"/></div></div>
    </div>
  );
};

const GradeChart = () => {
  const ranges = [['91–100','A1'],['81–90','A2'],['71–80','B1'],['61–70','B2'],['51–60','C1'],['41–50','C2'],['33–40','D'],['21–32','E1'],['20 & below','E2']];
  return <div className="grid grid-cols-[128px_repeat(9,1fr)] overflow-hidden rounded-xl border border-slate-300 text-center text-[8px] shadow-sm"><div className="bg-[#2c1853] p-2 font-black text-white">GRADE CHART</div>{ranges.map(r=><div key={r[0]} className="border-l border-slate-300 bg-sky-50 p-1 font-black text-slate-700">{r[0]}</div>)}<div className="bg-[#08265e] p-2 font-black text-white">Grade</div>{ranges.map(r=><div key={r[1]} className="border-l border-sky-700 bg-gradient-to-b from-sky-700 to-[#0b4d86] p-2 font-black text-white">{r[1]}</div>)}</div>;
};

const Type1SemesterPanel = ({ config, label, accent }: { config: TemplateConfig; label: string; accent: 'blue' | 'green' }) => {
  const grades = ['B1','A2','B2','B2','B2','C1','B2','C1','B2'];
  const academicSelection = sectionSelection(config.documentLanguageProfile, 'academic');
  const observationSelection = sectionSelection(config.documentLanguageProfile, 'observations');
  const academicLanguage = primaryDocumentLanguage(academicSelection);
  const observationLanguage = primaryDocumentLanguage(observationSelection);
  return <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
    <div className={`bg-gradient-to-r ${accent==='green'?'from-emerald-900 via-emerald-700 to-emerald-900':'from-[#06163f] via-[#0d4b99] to-[#06163f]'} px-4 py-3 text-white`}><div className="flex items-center justify-between"><div><div className="text-[10px] font-semibold text-cyan-100">{config.front.schoolName}</div><div className="text-lg font-black">{label} · {config.front.academicYear}</div></div><div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black">GRADE SYSTEM</div></div></div>
    <div className="grid grid-cols-[1.08fr_.92fr] gap-2 p-2">
      <div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 via-[#fffef7] to-emerald-50 p-3"><PremiumSectionBar title={config.type1.observationTitle} tone={accent==='green'?'green':'blue'}/><div className="mt-3 space-y-3">{config.type1.observationBlocks.map((x,i)=><div key={x} className="rounded-xl border border-white bg-white/80 p-3 shadow-sm"><div className="text-[10px] font-black text-rose-700">{x}</div><div className="mt-1 text-[10px] leading-5 text-slate-700" dir={documentLanguageDirection(observationLanguage)} style={{fontFamily:documentLanguageFont(observationLanguage),textAlign:documentLanguageDirection(observationLanguage)==='rtl'?'right':'left'}}>{config.type1.observationNarrative}</div>{i===0&&<div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-800"><Medal className="h-3 w-3"/>Strong Progress</div>}</div>)}</div></div>
      <div className="overflow-hidden rounded-xl border border-slate-200" dir={documentLanguageDirection(academicLanguage)} style={{fontFamily:documentLanguageFont(academicLanguage)}}><div className="grid grid-cols-[60px_1fr] bg-indigo-50 text-center text-[9px] font-black"><div className="border-r border-slate-200 p-2">Grade</div><div className="p-2">Subjects / مضامین</div></div>{config.type1.subjects.map((subject,index)=><div key={subject} className="grid grid-cols-[60px_1fr] border-t border-slate-200 text-[9px]"><div className="border-r border-slate-200 bg-rose-50 p-2 text-center font-black text-rose-800">{grades[index%grades.length]}</div><div className="p-2 font-bold text-slate-700">{subject}</div></div>)}<div className="border-t border-slate-200 bg-amber-50 p-1.5 text-center text-[8px] font-black text-amber-900">Optional Subjects / اختیاری مضامین</div>{config.type1.optionalSubjects.map(subject=><div key={subject} className="grid grid-cols-[60px_1fr] border-t border-slate-200 text-[9px]"><div className="border-r border-slate-200 p-2 text-center font-black">—</div><div className="p-2 font-bold">{subject}</div></div>)}</div>
    </div>
    <div className="mx-2 mb-2 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-200 text-center text-[9px]"><div className="bg-slate-50 p-2"><div className="text-slate-500">Working Days</div><div className="font-black">119</div></div><div className="border-l border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Present Days</div><div className="font-black">106</div></div><div className="border-l border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Attendance</div><div className="font-black text-emerald-700">89.1%</div></div><div className="border-l border-slate-200 bg-slate-50 p-2"><div className="text-slate-500">Overall Grade</div><div className="font-black text-indigo-700">B1</div></div></div>
  </div>;
};

const Type1BackPreview = ({ config }: { config: TemplateConfig }) => (
  <div className="min-w-[1120px] overflow-hidden rounded-[28px] border-[3px] border-amber-400 bg-[#eef4fb] p-3 shadow-2xl">
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#06163f] via-[#0b3d86] to-[#06163f] px-5 py-3 text-white"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-300 bg-white/10 text-lg font-black">NHS</div><div><div className="text-[10px] font-semibold text-cyan-100">{config.front.schoolName}</div><div className="text-xl font-black">{config.type1.backHeading}</div></div></div><TemplateBadge tone="emerald">Both Terms · Grade System</TemplateBadge></div>
    <div className="flex gap-3"><Type1SemesterPanel config={config} label={config.type1.semester1Label} accent="blue"/><Type1SemesterPanel config={config} label={config.type1.semester2Label} accent="green"/></div>
    <div className="mt-3"><GradeChart/></div><div className="mt-3"><PremiumSignatures labels={config.front.signatureLabels} selection={sectionSelection(config.documentLanguageProfile,'signatures')}/></div>
    <div className="mt-3 rounded-xl bg-[#06163f] px-4 py-2 text-center text-[9px] font-semibold text-cyan-50">Subject grades and teacher observation are presented together for a clear, parent-friendly academic review.</div>
  </div>
);

const Type2FirstTerm = ({ config }: { config: TemplateConfig }) => {
  const grades = ['C1','C1','C1','C1','B1','—','B2','B1','B1'];
  const academicLanguage = primaryDocumentLanguage(sectionSelection(config.documentLanguageProfile, 'academic'));
  const observationLanguage = primaryDocumentLanguage(sectionSelection(config.documentLanguageProfile, 'observations'));
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"><div className="bg-gradient-to-r from-[#06163f] via-[#0d4b99] to-[#06163f] px-4 py-3 text-white"><div className="flex items-center justify-between"><div><div className="text-[9px] text-cyan-100">FIRST TERM · GRADE SYSTEM</div><div className="text-lg font-black">{config.type2.firstTermLabel}</div></div><div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black">GRADE SYSTEM</div></div></div><div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold">Student: <span className="font-black">Student Name</span></div><div className="grid grid-cols-[1.05fr_.95fr] gap-2 p-2"><div className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-emerald-50 p-3"><PremiumSectionBar title={config.type1.observationTitle} tone="green"/><div className="mt-3 space-y-4">{config.type1.observationBlocks.map((block,i)=><div key={block} className="rounded-lg bg-white/80 p-3 shadow-sm"><div className="text-[10px] font-black text-rose-700">{block}</div><div className="mt-1 text-[10px] leading-[2.1]" dir={documentLanguageDirection(observationLanguage)} style={{fontFamily:documentLanguageFont(observationLanguage),textAlign:documentLanguageDirection(observationLanguage)==='rtl'?'right':'left'}}>{config.type1.observationNarrative}</div>{i===0&&<div className="mt-2 flex justify-end"><Trophy className="h-4 w-4 text-amber-500"/></div>}</div>)}</div></div><div className="overflow-hidden rounded-xl border border-slate-200" dir={documentLanguageDirection(academicLanguage)} style={{fontFamily:documentLanguageFont(academicLanguage)}}><div className="grid grid-cols-[56px_1fr] bg-indigo-50 text-center text-[9px] font-black"><div className="border-r border-slate-200 p-2">Grade</div><div className="p-2">Subjects / مضامین</div></div>{config.type2.subjects.map((s,i)=><div key={s} className="grid grid-cols-[56px_1fr] border-t border-slate-200 text-[9px]"><div className="border-r border-slate-200 bg-rose-50 p-2 text-center font-black">{grades[i]||'—'}</div><div className="p-2 font-bold">{s}</div></div>)}<div className="border-t border-slate-200 bg-amber-50 p-1.5 text-center text-[8px] font-black">Optional Subjects</div>{config.type2.optionalSubjects.map(s=><div key={s} className="grid grid-cols-[56px_1fr] border-t border-slate-200 text-[9px]"><div className="border-r border-slate-200 p-2 text-center">—</div><div className="p-2 font-bold">{s}</div></div>)}</div></div><div className="grid grid-cols-4 border-t border-slate-200 bg-slate-50 text-center text-[9px]"><div className="p-2"><div className="text-slate-500">Working Days</div><b>238</b></div><div className="border-l border-slate-200 p-2"><div className="text-slate-500">Present</div><b>189</b></div><div className="border-l border-slate-200 p-2"><div className="text-slate-500">Attendance</div><b>79.4%</b></div><div className="border-l border-slate-200 p-2"><div className="text-slate-500">Next Class</div><b>VI / IX</b></div></div></div>;
};

const Type2SecondTerm = ({ config }: { config: TemplateConfig }) => {
  const academicLanguage = primaryDocumentLanguage(sectionSelection(config.documentLanguageProfile, 'academic'));
  const academicSubjects = config.type2.subjects.slice(0,6);
  const gradeSubjects = config.type2.subjects.slice(6);
  const obtained = [25,27,25,28,39,36];
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"><div className="bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-900 px-4 py-3 text-white"><div className="flex items-center justify-between"><div><div className="text-[9px] text-emerald-100">SECOND TERM · MARKS SYSTEM</div><div className="text-lg font-black">{config.type2.secondTermLabel}</div></div><div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black">MARKS SYSTEM</div></div></div><div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold">Class: <span className="font-black">V</span> · Roll No.: <span className="font-black">01</span></div><div className="p-2" dir={documentLanguageDirection(academicLanguage)} style={{fontFamily:documentLanguageFont(academicLanguage)}}><div className="overflow-hidden rounded-xl border border-slate-200"><div className="grid grid-cols-[1.2fr_.65fr_.75fr_.75fr] bg-indigo-50 text-center text-[9px] font-black"><div className="p-2">Subjects / مضامین</div><div className="border-l border-slate-200 p-2">Total</div><div className="border-l border-slate-200 p-2">Passing</div><div className="border-l border-slate-200 p-2">Obtained</div></div>{academicSubjects.map((s,i)=><div key={s} className="grid grid-cols-[1.2fr_.65fr_.75fr_.75fr] border-t border-slate-200 text-[9px]"><div className="p-2 font-bold">{s}</div><div className="border-l border-slate-200 bg-rose-50 p-2 text-center font-black">50</div><div className="border-l border-slate-200 bg-amber-50 p-2 text-center font-black">18</div><div className="border-l border-slate-200 bg-emerald-50 p-2 text-center font-black text-emerald-800">{obtained[i]}</div></div>)}{gradeSubjects.map((s,i)=><div key={s} className="grid grid-cols-[1.2fr_.65fr_.75fr_.75fr] border-t border-slate-200 text-[9px]"><div className="p-2 font-bold">{s}</div><div className="border-l border-slate-200 p-2 text-center">—</div><div className="border-l border-slate-200 p-2 text-center font-bold">Grade</div><div className="border-l border-slate-200 bg-indigo-50 p-2 text-center font-black">{['B1','B2','B2'][i]||'B1'}</div></div>)}<div className="grid grid-cols-[1.2fr_.65fr_.75fr_.75fr] border-t border-slate-200 bg-amber-50 text-[9px]"><div className="p-2 font-black">Grace Marks</div><div className="border-l border-slate-200 p-2 text-center font-black">10</div><div className="border-l border-slate-200 p-2 text-center">—</div><div className="border-l border-slate-200 p-2 text-center font-black">—</div></div><div className="grid grid-cols-[1.2fr_.65fr_.75fr_.75fr] border-t border-slate-200 bg-[#08265e] text-[9px] text-white"><div className="p-2 font-black">Total Marks</div><div className="border-l border-white/20 p-2 text-center font-black">300</div><div className="border-l border-white/20 p-2 text-center">—</div><div className="border-l border-white/20 p-2 text-center font-black">180</div></div></div></div><div className="mx-2 mb-2 overflow-hidden rounded-xl border border-slate-200"><div className="bg-gradient-to-r from-[#08265e] to-cyan-700 px-3 py-1.5 text-[9px] font-black text-white">{config.type2.resultTitle}</div><div className="grid grid-cols-6 text-center text-[8px]"><div className="bg-slate-50 p-2"><span className="block text-slate-500">Pass</span><b className="text-emerald-700">✓</b></div><div className="border-l border-slate-200 bg-slate-50 p-2"><span className="block text-slate-500">Fail</span><b>—</b></div><div className="border-l border-slate-200 bg-slate-50 p-2"><span className="block text-slate-500">ReExam</span><b>—</b></div><div className="border-l border-slate-200 bg-slate-50 p-2"><span className="block text-slate-500">Percentage</span><b>60%</b></div><div className="border-l border-slate-200 bg-slate-50 p-2"><span className="block text-slate-500">Grade</span><b>C1</b></div><div className="border-l border-slate-200 bg-slate-50 p-2"><span className="block text-slate-500">Date of Issue</span><b>01/05/2026</b></div></div></div></div>;
};

const Type2BackPreview = ({ config }: { config: TemplateConfig }) => (
  <div className="min-w-[1120px] overflow-hidden rounded-[28px] border-[3px] border-amber-400 bg-[#eef4fb] p-3 shadow-2xl">
    <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#06163f] via-[#0b3d86] to-[#06163f] px-5 py-3 text-white"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-300 bg-white/10 text-lg font-black">NHS</div><div><div className="text-[10px] font-semibold text-cyan-100">{config.front.schoolName}</div><div className="text-xl font-black">{config.type2.backHeading}</div></div></div><div className="flex gap-2"><TemplateBadge tone="cyan">First Term · Grade</TemplateBadge><TemplateBadge tone="emerald">Second Term · Marks</TemplateBadge></div></div>
    <div className="gap-3" style={{display:'grid',gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1fr)',alignItems:'start'}}><div className="min-w-0"><Type2FirstTerm config={config}/></div><div className="min-w-0"><Type2SecondTerm config={config}/></div></div>
    <div className="mt-3"><GradeChart/></div><div className="mt-3"><PremiumSignatures labels={config.front.signatureLabels}/></div>
    <div className="mt-3 rounded-xl bg-[#06163f] px-4 py-2 text-center text-[9px] font-semibold text-white"><span className="text-amber-200">First Term evaluates by Grade · Second Term records Marks and Final Result</span></div>
  </div>
);

const MasterProgressCardTemplateEditor: React.FC<MasterProgressCardTemplateEditorProps> = ({ user, language }) => {
  const [config, setConfig] = useState<TemplateConfig>(() => {
    try { return mergeConfig(JSON.parse(localStorage.getItem(localKey) || 'null')); } catch { return cloneDefault(); }
  });
  const [selectedType, setSelectedType] = useState<CardTypeId>('type1');
  const [side, setSide] = useState<PreviewSide>('front');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [appliedDesignId, setAppliedDesignId] = useState<string>('d01');
  const [editing, setEditing] = useState(false);
  const [cardEditing, setCardEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'local' | 'unsaved'>('local');
  const [cloudSchoolId, setCloudSchoolId] = useState('');
  const [message, setMessage] = useState('');

  const isUrdu = language === 'ur';
  const primaryLanguage = resolveCardLanguage(config.languages.primaryCode, config.languages.customPrimaryName, config.languages.customPrimaryDirection);
  const secondaryLanguage = resolveCardLanguage(config.languages.secondaryCode, config.languages.customSecondaryName, config.languages.customSecondaryDirection);
  const activeType = selectedType === 'type1' ? config.type1 : config.type2;
  const referenceSrc = side === 'front' ? '/progress-card-references/type1-front-reference.jpg' : selectedType === 'type1' ? '/progress-card-references/type1-back-reference.jpg' : '/progress-card-references/type2-back-reference.jpg';

  const classSummary = useMemo(() => [
    { id:'type1' as const, title:'Card Type 1', classes:'Classes 1, 2, 3, 4, 6, 7', tone:'emerald' as const },
    { id:'type2' as const, title:'Card Type 2', classes:'Classes 5 & 8 only', tone:'amber' as const },
  ], []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const auth = await supabase.auth.getUser();
        const uid = auth.data.user?.id;
        if (!uid) { if (!cancelled) { setLoading(false); setStatus('local'); } return; }
        const membership = await supabase.from('user_school_memberships').select('school_id').eq('user_id', uid).eq('is_active', true).maybeSingle();
        if (membership.error) throw membership.error;
        const schoolId = String((membership.data as any)?.school_id || '');
        if (!schoolId) { if (!cancelled) setLoading(false); return; }
        setCloudSchoolId(schoolId);
        const row = await supabase.from('edunixo_result_templates').select('definition').eq('school_id', schoolId).eq('template_key', cloudTemplateKey).eq('active', true).maybeSingle();
        if (row.error && !/does not exist|schema cache|could not find|relation .* does not exist/i.test(String(row.error.message || ''))) throw row.error;
        const cloudDefinition = (row.data as any)?.definition;
        if (!cancelled && cloudDefinition?.config) {
          const merged = mergeConfig(cloudDefinition.config);
          setConfig(merged);
          localStorage.setItem(localKey, JSON.stringify(merged));
          setStatus('saved');
        } else if (!cancelled) {
          setStatus(row.error ? 'local' : 'unsaved');
        }
      } catch (error) {
        console.warn('Master Progress Card cloud template load unavailable; local compatibility copy retained.', error);
        if (!cancelled) setStatus('local');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const updateFront = (key: keyof TemplateConfig['front'], value: string | string[]) => {
    setConfig(prev => ({ ...prev, front: { ...prev.front, [key]: value } })); setStatus('unsaved');
  };
  const updateType = (key: string, value: string | string[]) => {
    setConfig(prev => selectedType === 'type1'
      ? ({ ...prev, type1: { ...prev.type1, [key]: value } })
      : ({ ...prev, type2: { ...prev.type2, [key]: value } }));
    setStatus('unsaved');
  };

  const updateFieldLabel = (key: FrontFieldKey, locale: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      front: {
        ...prev.front,
        fieldLabels: {
          ...prev.front.fieldLabels,
          [key]: { ...prev.front.fieldLabels[key], [locale]: value },
        },
      },
    }));
    setStatus('unsaved');
  };

  const updateSignatureLabel = (key: keyof TemplateConfig['front']['signatureLabels'], value: string) => {
    setConfig(prev => ({ ...prev, front: { ...prev.front, signatureLabels: { ...prev.front.signatureLabels, [key]: value } } }));
    setStatus('unsaved');
  };


  const updateCardLanguage = (key: keyof TemplateConfig['languages'], value: any) => {
    setConfig(prev => ({ ...prev, languages: { ...prev.languages, [key]: value } }));
    setStatus('unsaved');
  };

  const saveTemplate = async () => {
    setSaving(true); setMessage('');
    try {
      localStorage.setItem(localKey, JSON.stringify(config));
      if (!cloudSchoolId) {
        setStatus('local');
        setMessage('Saved in Preview compatibility cache. Cloud Result template table/login is not available in this session.');
        return;
      }
      const payload = {
        school_id: cloudSchoolId,
        template_key: cloudTemplateKey,
        name: 'Master Progress Card — Classes 1 to 8',
        category: 'Master Progress Card',
        description: 'Official Clerk master Progress Card definition. Type 1: Classes 1–4, 6, 7 use Grade system in both terms. Type 2: Classes 5 and 8 use Grade system in First Term and Marks system in Second Term. Common advanced front; type-specific advanced backs.',
        definition: {
          config,
          mappings: { type1: [1,2,3,4,6,7], type2: [5,8] },
          commonFront: true,
          type2BackStatus: 'official-hybrid-grade-marks',
          designStyle: 'advanced-premium-navy-gold',
          type2TermRule: { firstTerm: 'grade', secondTerm: 'marks' },
          documentLanguages: config.documentLanguageProfile,
          legacyDocumentLanguages: config.languages,
          pageSize: 'A4',
          orientation: 'Landscape',
          updatedBy: user.id,
        },
        active: true,
        updated_at: new Date().toISOString(),
      };
      const result = await supabase.from('edunixo_result_templates').upsert(payload, { onConflict:'school_id,template_key' });
      if (result.error) throw result.error;
      setStatus('saved');
      setMessage('Master Progress Card saved to the school Result template cloud.');
      setEditing(false);
      setCardEditing(false);
    } catch (error: any) {
      console.warn('Master Progress Card cloud save unavailable; local compatibility copy retained.', error);
      setStatus('local');
      setMessage(`Local copy saved. Cloud save unavailable: ${String(error?.message || 'Result template table is not installed/configured.')}`);
    } finally { setSaving(false); }
  };

  const resetCurrent = () => {
    const base = cloneDefault();
    setConfig(prev => selectedType === 'type1' ? { ...prev, front: base.front, type1: base.type1 } : { ...prev, front: base.front, type2: base.type2 });
    setStatus('unsaved');
    setMessage('Current template reset to the approved base definition. Click Save Master Template to persist.');
  };

  if (loading) return <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-cyan-600"/><span className="ml-3 text-sm font-bold text-slate-600">Loading Master Progress Card…</span></div>;

  return (
    <div className={`space-y-5 ${isUrdu ? 'rtl text-right' : 'ltr text-left'}`}>
      <div className="edx-dark-contrast-surface rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,.18),transparent_32%),linear-gradient(135deg,#020617,#0f172a_58%,#083344)] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><TemplateBadge tone="cyan">Clerk Master</TemplateBadge><TemplateBadge tone="emerald">Classes 1–8</TemplateBadge><TemplateBadge tone="slate">A4 Landscape</TemplateBadge><TemplateBadge tone="cyan">{languageDisplayName(primaryLanguage)}</TemplateBadge>{config.languages.secondaryEnabled&&<TemplateBadge tone="slate">+ {languageDisplayName(secondaryLanguage)}</TemplateBadge>}</div><h2 className="mt-3 flex items-center gap-2 text-2xl font-black"><LayoutTemplate className="h-6 w-6 text-cyan-300"/>Master Progress Card Templates</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">One common Front Page with two official back structures. This is the master definition that the Class Teacher Progress Card workflow will consume later; marks are not entered here.</p></div>
          <div className="flex flex-wrap items-center gap-2"><div className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase ${status==='saved'?'border-emerald-400/30 bg-emerald-400/10 text-emerald-200':status==='unsaved'?'border-amber-400/30 bg-amber-400/10 text-amber-200':'border-slate-400/30 bg-white/5 text-slate-300'}`}>{status==='saved'?'Cloud Saved':status==='unsaved'?'Unsaved Changes':'Local / Preview Cache'}</div><button type="button" onClick={()=>{setEditing(v=>!v);setCardEditing(false);}} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-black"><Pencil className="h-4 w-4"/>{editing?'Close Master':'Edit Master'}</button><button type="button" onClick={()=>{setCardEditing(v=>!v);setEditing(false);setPreviewMode('live');}} className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-xs font-black text-amber-100"><Pencil className="h-4 w-4"/>{cardEditing?'Close Card Editor':'Edit Card'}</button><button type="button" onClick={()=>setDesignModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-2.5 text-xs font-black text-fuchsia-100"><Sparkles className="h-4 w-4"/>Design</button><button type="button" onClick={()=>setGalleryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-xs font-black text-emerald-100"><Sparkles className="h-4 w-4"/>Browse {DESIGNS.length} Designs</button><button type="button" onClick={()=>void saveTemplate()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save Master Template</button></div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {classSummary.map(card => <button key={card.id} type="button" onClick={()=>{setSelectedType(card.id);setSide('front');setPreviewMode('live');}} className={`rounded-2xl border p-4 text-left transition ${selectedType===card.id?'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/10':'border-slate-200 bg-white hover:border-slate-300'}`}><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-black text-slate-950">{card.title}</div><div className="mt-1 text-xs text-slate-500">{card.classes}</div></div><TemplateBadge tone={card.tone}>Official Format</TemplateBadge></div><div className="mt-3 text-[11px] leading-5 text-slate-600">Front side: <b>Common</b> · Back side: <b>school-approved format reference</b></div></button>)}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>setSide('front')} className={`rounded-xl px-4 py-2 text-xs font-black ${side==='front'?'bg-slate-950 text-white':'bg-slate-100 text-slate-600'}`}>Common Front</button><button type="button" onClick={()=>setSide('back')} className={`rounded-xl px-4 py-2 text-xs font-black ${side==='back'?'bg-slate-950 text-white':'bg-slate-100 text-slate-600'}`}>{selectedType==='type1'?'Type 1 Back':'Type 2 Back'}</button><div className="mx-1 h-6 w-px bg-slate-200"/><div className="flex items-center gap-1 rounded-xl bg-indigo-50 p-1"><button type="button" onClick={()=>{setConfig(prev=>({...prev,pageMode:'one_side'}));setStatus('unsaved');}} className={`rounded-lg px-3 py-1.5 text-xs font-black ${config.pageMode==='one_side'?'bg-indigo-600 text-white':'bg-white text-slate-600'}`}>One Side</button><button type="button" onClick={()=>{setConfig(prev=>({...prev,pageMode:'two_side'}));setStatus('unsaved');}} className={`rounded-lg px-3 py-1.5 text-xs font-black ${config.pageMode==='two_side'?'bg-indigo-600 text-white':'bg-white text-slate-600'}`}>Two Side</button></div><div className="mx-1 h-6 w-px bg-slate-200"/><button type="button" onClick={()=>setPreviewMode('live')} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black ${previewMode==='live'?'bg-cyan-600 text-white':'bg-slate-100 text-slate-600'}`}><Eye className="h-4 w-4"/>Live Template</button><button type="button" onClick={()=>setPreviewMode('reference')} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black ${previewMode==='reference'?'bg-cyan-600 text-white':'bg-slate-100 text-slate-600'}`}><FileImage className="h-4 w-4"/>Reference Image</button></div><div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600"/>Mapping locked to approved classes</div></div>
      </div>

      <DocumentLanguageStudio
        profile={config.documentLanguageProfile}
        sections={[...PROGRESS_CARD_LANGUAGE_SECTIONS]}
        fields={[...PROGRESS_CARD_LANGUAGE_FIELDS]}
        title="Progress Card Language Studio"
        description="Set English, Urdu, Marathi or any other Indian language separately for the header, student details, attendance, guidance, academic tables, observations and signatures. Individual student-detail fields can override their section."
        compact
        onChange={(documentLanguageProfile) => { setConfig(prev => ({ ...prev, documentLanguageProfile })); setStatus('unsaved'); }}
      />

      {editing && <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="text-sm font-black text-slate-950">Master Identity Settings</h3><p className="mt-1 text-[11px] text-slate-500">School-level identity shared by both card types.</p></div><label className="block text-[10px] font-black uppercase text-slate-500">Trust / Society<input className={`${fieldClass} mt-1`} value={config.front.trustName} onChange={e=>updateFront('trustName',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">School Name<input className={`${fieldClass} mt-1`} value={config.front.schoolName} onChange={e=>updateFront('schoolName',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Evaluation Heading<input className={`${fieldClass} mt-1`} value={config.front.evaluationTitle} onChange={e=>updateFront('evaluationTitle',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Academic Year<input className={`${fieldClass} mt-1`} value={config.front.academicYear} onChange={e=>updateFront('academicYear',e.target.value)}/></label><div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4"><div className="mb-3"><div className="text-[10px] font-black uppercase tracking-wide text-cyan-800">Progress Card Languages</div><p className="mt-1 text-[10px] leading-5 text-cyan-900/70">English + all 22 Scheduled Indian languages are available. Use Custom / Other for an additional school language. Card labels remain editable for the selected languages.</p></div><div className="grid gap-3 md:grid-cols-2"><label className="text-[10px] font-black uppercase text-slate-500">Primary Card Language<select className={`${fieldClass} mt-1`} value={config.languages.primaryCode} onChange={e=>updateCardLanguage('primaryCode',e.target.value)}>{CARD_LANGUAGE_OPTIONS.map(option=><option key={`p-${option.code}`} value={option.code}>{languageDisplayName(option)}</option>)}</select></label><label className="text-[10px] font-black uppercase text-slate-500">Secondary Card Language<select disabled={!config.languages.secondaryEnabled} className={`${fieldClass} mt-1 disabled:opacity-50`} value={config.languages.secondaryCode} onChange={e=>updateCardLanguage('secondaryCode',e.target.value)}>{CARD_LANGUAGE_OPTIONS.map(option=><option key={`s-${option.code}`} value={option.code}>{languageDisplayName(option)}</option>)}</select></label></div><label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={config.languages.secondaryEnabled} onChange={e=>updateCardLanguage('secondaryEnabled',e.target.checked)}/>Use bilingual / secondary language on Progress Card</label>{config.languages.primaryCode===CUSTOM_LANGUAGE_CODE&&<div className="mt-3 grid gap-2 md:grid-cols-2"><input className={fieldClass} placeholder="Custom primary language name" value={config.languages.customPrimaryName} onChange={e=>updateCardLanguage('customPrimaryName',e.target.value)}/><select className={fieldClass} value={config.languages.customPrimaryDirection} onChange={e=>updateCardLanguage('customPrimaryDirection',e.target.value)}><option value="ltr">Left to Right</option><option value="rtl">Right to Left</option></select></div>}{config.languages.secondaryEnabled&&config.languages.secondaryCode===CUSTOM_LANGUAGE_CODE&&<div className="mt-3 grid gap-2 md:grid-cols-2"><input className={fieldClass} placeholder="Custom secondary language name" value={config.languages.customSecondaryName} onChange={e=>updateCardLanguage('customSecondaryName',e.target.value)}/><select className={fieldClass} value={config.languages.customSecondaryDirection} onChange={e=>updateCardLanguage('customSecondaryDirection',e.target.value)}><option value="ltr">Left to Right</option><option value="rtl">Right to Left</option></select></div>}<div className="mt-3 flex flex-wrap gap-2"><TemplateBadge tone="cyan">Primary: {languageDisplayName(primaryLanguage)}</TemplateBadge>{config.languages.secondaryEnabled&&<TemplateBadge tone="slate">Secondary: {languageDisplayName(secondaryLanguage)}</TemplateBadge>}</div></div></div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="text-sm font-black text-slate-950">Locked Card Mapping</h3><p className="mt-1 text-[11px] leading-5 text-slate-500">Class mapping is intentionally protected; card design/content can be edited separately with <b>Edit Card</b>.</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">Type 1 → Classes 1, 2, 3, 4, 6, 7</div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">Type 2 → Classes 5 & 8</div><div className="flex justify-end"><button type="button" onClick={resetCurrent} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600"><RefreshCw className="h-4 w-4"/>Reset Current Base</button></div></div>
      </div>}

      {cardEditing && <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/50 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h3 className="text-base font-black text-slate-950">Card Content Editor · {side==='front'?'Front Side':selectedType==='type1'?'Type 1 Back':'Type 2 Back'}</h3><p className="mt-1 text-[11px] text-slate-600">Edit the selected card itself. Changes update the live preview immediately and are saved with the Master Template.</p></div><TemplateBadge tone="amber">Direct Card Editing</TemplateBadge></div>
        {side==='front' ? <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"><h4 className="text-xs font-black text-slate-950">Student Field Labels · Per-field Language</h4><p className="text-[10px] leading-5 text-slate-500">Languages come from the Progress Card Language Studio. Add an individual field override there, then enter the approved label text below for each selected language.</p>{(Object.keys(config.front.fieldLabels) as FrontFieldKey[]).map(key=>{const selection=fieldSelection(config.documentLanguageProfile,key,'studentDetails');return <div key={key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="mb-2 text-[10px] font-black uppercase text-slate-500">{key}</div><div className="grid gap-2">{selection.languages.map(code=>{const option=getLanguageOption(code,CARD_LANGUAGE_OPTIONS);const dir=documentLanguageDirection(code);return <label key={code} className="grid grid-cols-[120px_1fr] items-center gap-2"><span className="text-[9px] font-black text-slate-500">{languageDisplayName(option)}</span><input dir={dir} style={{fontFamily:documentLanguageFont(code),textAlign:dir==='rtl'?'right':'left'}} className={fieldClass} value={config.front.fieldLabels[key][code] || ''} placeholder={`Enter ${languageDisplayName(option)} label`} onChange={e=>updateFieldLabel(key,code,e.target.value)}/></label>;})}</div></div>;})}</div>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><label className="block text-[10px] font-black uppercase text-slate-500">Guidance Heading · {config.languages.secondaryEnabled?languageDisplayName(secondaryLanguage):languageDisplayName(primaryLanguage)}<input dir={config.languages.secondaryEnabled?resolvedDirection(secondaryLanguage):resolvedDirection(primaryLanguage)} className={`${fieldClass} mt-1 leading-[2] ${config.languages.secondaryEnabled?languageDirectionClass(secondaryLanguage):languageDirectionClass(primaryLanguage)}`} value={config.front.guidanceTitle} onChange={e=>updateFront('guidanceTitle',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Instructions / Guidance · {config.languages.secondaryEnabled?languageDisplayName(secondaryLanguage):languageDisplayName(primaryLanguage)}<textarea dir={config.languages.secondaryEnabled?resolvedDirection(secondaryLanguage):resolvedDirection(primaryLanguage)} className={`${fieldClass} mt-1 min-h-52 leading-[2.2] ${config.languages.secondaryEnabled?languageDirectionClass(secondaryLanguage):languageDirectionClass(primaryLanguage)}`} value={config.front.guidanceLines.join('\n')} onChange={e=>updateFront('guidanceLines',e.target.value.split('\n').filter(Boolean))}/></label><div><div className="mb-2 text-[10px] font-black uppercase text-slate-500">Signature Box Labels</div><div className="space-y-2"><input className={fieldClass} value={config.front.signatureLabels.headmaster} onChange={e=>updateSignatureLabel('headmaster',e.target.value)}/><input className={fieldClass} value={config.front.signatureLabels.classTeacher} onChange={e=>updateSignatureLabel('classTeacher',e.target.value)}/><input className={fieldClass} value={config.front.signatureLabels.parent} onChange={e=>updateSignatureLabel('parent',e.target.value)}/></div></div></div>
        </div> : <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><label className="block text-[10px] font-black uppercase text-slate-500">Back Card Heading<input className={`${fieldClass} mt-1`} value={activeType.backHeading} onChange={e=>updateType('backHeading',e.target.value)}/></label>{selectedType==='type1'?<><label className="block text-[10px] font-black uppercase text-slate-500">First Term Label<input className={`${fieldClass} mt-1`} value={config.type1.semester1Label} onChange={e=>updateType('semester1Label',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Second Term Label<input className={`${fieldClass} mt-1`} value={config.type1.semester2Label} onChange={e=>updateType('semester2Label',e.target.value)}/></label></>:<><label className="block text-[10px] font-black uppercase text-slate-500">First Term Label<input className={`${fieldClass} mt-1`} value={config.type2.firstTermLabel} onChange={e=>updateType('firstTermLabel',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Second Term Label<input className={`${fieldClass} mt-1`} value={config.type2.secondTermLabel} onChange={e=>updateType('secondTermLabel',e.target.value)}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Final Result Heading<input className={`${fieldClass} mt-1`} value={config.type2.resultTitle} onChange={e=>updateType('resultTitle',e.target.value)}/></label></>}<label className="block text-[10px] font-black uppercase text-slate-500">Main Subjects<textarea className={`${fieldClass} mt-1 min-h-40`} value={activeType.subjects.join('\n')} onChange={e=>updateType('subjects',e.target.value.split('\n').filter(Boolean))}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Optional Subjects<textarea className={`${fieldClass} mt-1 min-h-20`} value={activeType.optionalSubjects.join('\n')} onChange={e=>updateType('optionalSubjects',e.target.value.split('\n').filter(Boolean))}/></label></div>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"><div><div className="text-[10px] font-black uppercase text-slate-500">Teacher Observation</div><p className="mt-1 text-[10px] leading-5 text-slate-500">Type 2 First Term intentionally uses the same Teacher Observation master as Type 1.</p></div><label className="block text-[10px] font-black uppercase text-slate-500">Observation Heading<input className={`${fieldClass} mt-1`} value={config.type1.observationTitle} onChange={e=>{setConfig(prev=>({...prev,type1:{...prev.type1,observationTitle:e.target.value},type2:{...prev.type2,observationTitle:e.target.value}}));setStatus('unsaved');}}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Observation Sections<textarea className={`${fieldClass} mt-1 min-h-32`} value={config.type1.observationBlocks.join('\n')} onChange={e=>{const blocks=e.target.value.split('\n').filter(Boolean);setConfig(prev=>({...prev,type1:{...prev.type1,observationBlocks:blocks},type2:{...prev.type2,observationBlocks:blocks}}));setStatus('unsaved');}}/></label><label className="block text-[10px] font-black uppercase text-slate-500">Observation Narrative · {config.languages.secondaryEnabled?languageDisplayName(secondaryLanguage):languageDisplayName(primaryLanguage)}<textarea dir={config.languages.secondaryEnabled?resolvedDirection(secondaryLanguage):resolvedDirection(primaryLanguage)} className={`${fieldClass} mt-1 min-h-28 ${config.languages.secondaryEnabled?languageDirectionClass(secondaryLanguage):languageDirectionClass(primaryLanguage)}`} value={config.type1.observationNarrative} onChange={e=>{const value=e.target.value;setConfig(prev=>({...prev,type1:{...prev.type1,observationNarrative:value},type2:{...prev.type2,observationNarrative:value}}));setStatus('unsaved');}}/></label><div><div className="mb-2 text-[10px] font-black uppercase text-slate-500">Signature Box Labels</div><div className="space-y-2"><input className={fieldClass} value={config.front.signatureLabels.headmaster} onChange={e=>updateSignatureLabel('headmaster',e.target.value)}/><input className={fieldClass} value={config.front.signatureLabels.classTeacher} onChange={e=>updateSignatureLabel('classTeacher',e.target.value)}/><input className={fieldClass} value={config.front.signatureLabels.parent} onChange={e=>updateSignatureLabel('parent',e.target.value)}/></div></div></div>
        </div>}
      </div>}

      {message && <div className={`rounded-2xl border p-4 text-xs font-semibold ${status==='saved'?'border-emerald-200 bg-emerald-50 text-emerald-800':status==='local'?'border-amber-200 bg-amber-50 text-amber-800':'border-cyan-200 bg-cyan-50 text-cyan-800'}`}><div className="flex items-start gap-2">{status==='saved'?<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0"/>:<Info className="mt-0.5 h-4 w-4 shrink-0"/>}<span>{message}</span></div></div>}

      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-inner"><div className="mb-3 flex items-center justify-between gap-3 px-2"><div><h3 className="text-sm font-black text-slate-950">{selectedType==='type1'?'Card Type 1':'Card Type 2'} · {side==='front'?'Common Front':'Back Side'}</h3><p className="text-[10px] text-slate-500">{previewMode==='live'?'Structured data-bound master preview':'Original/reference visual supplied during design discussion'}</p></div><div className="flex items-center gap-2">{selectedType==='type2'&&side==='back'&&<TemplateBadge tone="emerald">Official Format</TemplateBadge>}</div></div><div className="overflow-x-auto rounded-2xl bg-white p-2">{previewMode==='reference'?<div className="flex min-h-[460px] items-center justify-center bg-slate-50"><img src={referenceSrc} alt="Progress card reference" className="max-h-[820px] max-w-full object-contain shadow-sm"/></div>:side==='front'?<FrontPreview config={config}/>:selectedType==='type1'?<Type1BackPreview config={config}/>:<Type2BackPreview config={config}/>}</div></div>

      <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-black text-slate-950"><Cloud className="h-4 w-4 text-cyan-600"/>Data Binding</div><p className="mt-2 text-[11px] leading-5 text-slate-500">Student identity from Student Master; marks/grades from accepted Result Book; attendance from Attendance Catalogue; document language comes from this school template.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-black text-slate-950"><BookOpenCheck className="h-4 w-4 text-emerald-600"/>Teacher Workflow</div><p className="mt-2 text-[11px] leading-5 text-slate-500">Class Teacher will review generated cards. Imported Result Book marks stay read-only; correction goes back to Subject Mark List.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-black text-slate-950"><Sparkles className="h-4 w-4 text-amber-500"/>Type 2 Rule</div><p className="mt-2 text-[11px] leading-5 text-slate-500">Classes 5 and 8 use Grade-based First Term and Marks-based Second Term, based on the supplied official format reference.</p></div></div>

      {/* ===== Design Modal ===== */}
      {designModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-slate-950/85 p-3 backdrop-blur-md"
          style={{ isolation: 'isolate' }}
          onClick={() => setDesignModalOpen(false)}
        >
          <div className="relative z-[10000] my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-4 ring-white/20" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <div className="text-sm font-black">Design Template</div>
                  <div className="text-[10px] opacity-80">Choose a color palette for this progress card</div>
                </div>
              </div>
              <button type="button" onClick={() => setDesignModalOpen(false)} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-black">
                Close
              </button>
            </div>

            <div className="p-5">
              <div className="mb-4">
                <label className="block text-[10px] font-black uppercase text-slate-500">Template Name</label>
                <input
                  type="text"
                  value={config.design.templateName}
                  onChange={(e) => { setConfig(prev => ({ ...prev, design: { ...prev.design, templateName: e.target.value } })); setStatus('unsaved'); }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold"
                  placeholder="e.g. Classic Navy"
                />
              </div>

              <div className="mb-3 text-[10px] font-black uppercase text-slate-500">Palette</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {DESIGN_PALETTES.map((palette) => {
                  const selected = config.design.primaryColor === palette.primaryColor && config.design.accentColor === palette.accentColor;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        setConfig(prev => ({
                          ...prev,
                          design: {
                            ...prev.design,
                            templateName: prev.design.templateName === 'Classic Navy' || !prev.design.templateName ? palette.name : prev.design.templateName,
                            primaryColor: palette.primaryColor,
                            accentColor: palette.accentColor,
                            secondaryColor: palette.secondaryColor,
                            backgroundColor: palette.backgroundColor,
                            borderStyle: palette.borderStyle,
                            headerStyle: palette.headerStyle,
                          }
                        }));
                        setStatus('unsaved');
                      }}
                      className={`rounded-xl border-2 p-3 text-left transition ${selected ? 'border-fuchsia-500 ring-2 ring-fuchsia-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="mb-2 flex h-12 overflow-hidden rounded-lg">
                        <div className="flex-1" style={{ backgroundColor: palette.primaryColor }} />
                        <div className="flex-1" style={{ backgroundColor: palette.secondaryColor }} />
                        <div className="w-8" style={{ backgroundColor: palette.accentColor }} />
                      </div>
                      <div className="text-xs font-black text-slate-900">{palette.name}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{palette.headerStyle} · {palette.borderStyle}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-500">Primary</span>
                  <input type="color" value={config.design.primaryColor} onChange={(e)=>{setConfig(prev=>({...prev,design:{...prev.design,primaryColor:e.target.value}}));setStatus('unsaved');}} className="mt-1 h-10 w-full rounded-lg border border-slate-300" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-500">Secondary</span>
                  <input type="color" value={config.design.secondaryColor} onChange={(e)=>{setConfig(prev=>({...prev,design:{...prev.design,secondaryColor:e.target.value}}));setStatus('unsaved');}} className="mt-1 h-10 w-full rounded-lg border border-slate-300" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-slate-500">Accent</span>
                  <input type="color" value={config.design.accentColor} onChange={(e)=>{setConfig(prev=>({...prev,design:{...prev.design,accentColor:e.target.value}}));setStatus('unsaved');}} className="mt-1 h-10 w-full rounded-lg border border-slate-300" />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setDesignModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* ===== Full Gallery Modal (50 designs) ===== */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-auto bg-slate-950/90 p-3 backdrop-blur-md"
          style={{ isolation: 'isolate' }}
          onClick={() => setGalleryOpen(false)}
        >
          <div
            className="relative z-[10000] my-4 w-full max-w-[1400px] rounded-2xl bg-white p-4 shadow-2xl ring-4 ring-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-slate-900">Choose Your Design</div>
                <div className="text-[11px] text-slate-500">Preview and apply · {DESIGNS.length} premium templates</div>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
              >
                Close
              </button>
            </div>
            <ProgressCardGallery
              pageMode={config.pageMode}
              appliedDesignId={appliedDesignId}
              onApply={(design) => {
                setAppliedDesignId(design.id);
                setConfig((prev: any) => ({
                  ...prev,
                  design: {
                    ...(prev.design || {}),
                    templateName: design.name,
                    primaryColor: design.primaryColor,
                    accentColor: design.accentColor,
                    secondaryColor: design.secondaryColor,
                    backgroundColor: design.backgroundColor,
                  },
                }));
                setStatus('unsaved');
              }}
              schoolName={config.front.schoolName}
              schoolTrust={config.front.trustName}
              academicYear={config.front.academicYear}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterProgressCardTemplateEditor;
