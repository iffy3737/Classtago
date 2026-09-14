/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowRight, Award, BookOpen, CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  Clock3, FileText, GraduationCap, Image as ImageIcon, Languages, Loader2, LockKeyhole,
  Mail, MapPin, Menu, Phone, Quote, ShieldCheck, Sparkles,
  Star, Users, X
} from 'lucide-react';
import { Language } from '../types';
import { FALLBACK_LANGUAGE_CATALOGUE, LanguageOption, getLanguageOption, languageDisplayName } from '../lib/languageCatalog';
import { getPublicPortalCopy, localizePublicText } from '../lib/publicPortalTranslations';
import type { PublicAdmissionCampaign } from './AdmissionApplicationWizard';

const AdmissionApplicationWizard = React.lazy(() => import('./AdmissionApplicationWizard'));


export type PublicSiteSection = {
  key: string;
  enabled?: boolean;
  sortOrder?: number;
  eyebrow?: string;
  title?: string;
  body?: string;
  items?: string[];
  imageUrl?: string | null;
  meta?: Record<string, unknown>;
};

export type PremiumResolvedSchool = {
  id: string;
  schoolCode: string;
  schoolName: string;
  slug: string;
  portalPath?: string;
  portalAvailable: boolean;
  shortName?: string | null;
  tagline?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: Record<string, any>;
  publicLanguages?: string[];
  sections?: PublicSiteSection[];
  admissionsEnabled?: boolean;
  admissionsOpen?: boolean;
  admissionSession?: string | null;
  admissionTitle?: string | null;
  admissionDescription?: string | null;
  prospectusUrl?: string | null;
  contactDetails?: Record<string, any>;
  socialLinks?: Record<string, any>;
  admissionCampaign?: PublicAdmissionCampaign | null;
};

interface PremiumSchoolPortalProps {
  school: PremiumResolvedSchool;
  onOpenERP: () => void;
  onBackToPlatform: () => void;
  lang?: Language;
  languages?: LanguageOption[];
  languagesLoading?: boolean;
  onLangChange?: (language: Language) => void;
}

const fallbackSections: PublicSiteSection[] = [
  {
    key: 'about', enabled: true, sortOrder: 10, eyebrow: 'A school with purpose',
    title: 'Learning that shapes knowledge, character and confidence.',
    body: 'A caring academic environment where every learner is encouraged to grow with discipline, curiosity and responsibility.'
  },
  {
    key: 'academics', enabled: true, sortOrder: 20, eyebrow: 'Academic journey',
    title: 'Strong foundations. Thoughtful teaching. Measurable progress.',
    items: ['Student-centred classroom learning', 'Continuous academic guidance', 'Language-inclusive learning support']
  },
  {
    key: 'principal', enabled: true, sortOrder: 30, eyebrow: 'From the Headmaster',
    title: 'Every child deserves to be seen, supported and inspired.',
    body: 'Our school community works together to develop capable learners, responsible citizens and confident young people.'
  },
  {
    key: 'facilities', enabled: true, sortOrder: 40, eyebrow: 'Campus experience',
    title: 'Spaces designed for learning and belonging.',
    items: ['Safe and disciplined campus', 'Digital academic workflows', 'Co-curricular development', 'Student support and guidance']
  },
  {
    key: 'achievements', enabled: true, sortOrder: 50, eyebrow: 'School highlights',
    title: 'Progress worth celebrating.',
    items: ['Academic achievement', 'Student participation', 'Community trust']
  },
  {
    key: 'notices', enabled: true, sortOrder: 60, eyebrow: 'Latest information',
    title: 'Notices and announcements',
    items: ['Welcome to the official school digital portal.']
  },
  {
    key: 'gallery', enabled: true, sortOrder: 65, eyebrow: 'School gallery',
    title: 'Life at our school', body: 'A window into learning, activities and campus life.', items: []
  },
  {
    key: 'rules', enabled: true, sortOrder: 70, eyebrow: 'Student responsibility',
    title: 'School rules and essential information',
    items: ['Attend school regularly and on time.', 'Respect every member of the school community.', 'Follow the prescribed uniform and conduct standards.']
  },
  {
    key: 'contact', enabled: true, sortOrder: 80, eyebrow: 'Connect with us',
    title: 'Visit, call or write to the school office.'
  }
];

function sectionByKey(sections: PublicSiteSection[], key: string) {
  return sections.find(section => section.key === key && section.enabled !== false);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'ED';
}

export default function PremiumSchoolPortal({
  school, onOpenERP, onBackToPlatform, lang, languages, languagesLoading = false, onLangChange
}: PremiumSchoolPortalProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<Language>('en');

  const availableLanguages = Array.isArray(languages) && languages.length ? languages : FALLBACK_LANGUAGE_CATALOGUE;
  const activeLanguage = lang || previewLanguage;
  const selectedLanguage = getLanguageOption(activeLanguage, availableLanguages);
  const ui = getPublicPortalCopy(activeLanguage);
  const lt = (value: unknown) => localizePublicText(value, activeLanguage);
  const changeLanguage = (nextLanguage: Language) => {
    if (onLangChange) onLangChange(nextLanguage);
    else setPreviewLanguage(nextLanguage);
  };

  const theme = school.theme || {};
  const accent = String(theme.accent || '#38bdf8');
  const accent2 = String(theme.accent2 || '#8b5cf6');
  const sections = useMemo(() => {
    const live = Array.isArray(school.sections) && school.sections.length ? school.sections : fallbackSections;
    return [...live]
      .filter(section => section.enabled !== false)
      .sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999))
      .map(section => ({
        ...section,
        eyebrow: localizePublicText(section.eyebrow, activeLanguage),
        title: localizePublicText(section.title, activeLanguage),
        body: localizePublicText(section.body, activeLanguage),
        items: Array.isArray(section.items) ? section.items.map(item => localizePublicText(item, activeLanguage)) : []
      }));
  }, [school.sections, activeLanguage]);

  const about = sectionByKey(sections, 'about');
  const academics = sectionByKey(sections, 'academics');
  const principal = sectionByKey(sections, 'principal');
  const facilities = sectionByKey(sections, 'facilities');
  const achievements = sectionByKey(sections, 'achievements');
  const notices = sectionByKey(sections, 'notices');
  const rules = sectionByKey(sections, 'rules');
  const gallery = sectionByKey(sections, 'gallery');
  const contact = school.contactDetails || {};
  const admissionsOpen = school.admissionsEnabled !== false && school.admissionsOpen === true;


  const navItems = [
    ['about', ui.about], ['academics', ui.academics], ['facilities', ui.facilities],
    ['notices', ui.notices], ['gallery', ui.gallery], ['contact', ui.contact]
  ].filter(([key]) => key === 'contact' || Boolean(sectionByKey(sections, key)));

  const languageControl = (compact = false) => (
    <label
      className={`relative flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] text-white shadow-lg backdrop-blur-xl transition hover:border-white/25 hover:bg-white/10 ${compact ? 'h-10 px-3' : 'px-3.5 py-2.5'}`}
      title={ui.websiteLanguage}
    >
      {languagesLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Languages className="h-4 w-4 text-[var(--school-accent)]" />}
      <span className={`${compact ? 'text-[10px]' : 'max-w-28 text-xs'} truncate font-black`}>
        {compact ? String(selectedLanguage.code).toUpperCase() : selectedLanguage.nativeName}
      </span>
      {!compact && <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
      <select
        value={activeLanguage}
        onChange={event => changeLanguage(event.target.value as Language)}
        disabled={languagesLoading || availableLanguages.length === 0}
        aria-label={ui.websiteLanguage}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
      >
        {availableLanguages.map(option => (
          <option key={option.code} value={option.code} dir={option.direction === 'rtl' ? 'rtl' : 'ltr'}>
            {languageDisplayName(option)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className="edunixo-public-portal relative min-h-screen overflow-hidden bg-[#050816] text-white"
      data-public-language={String(activeLanguage)}
      dir={selectedLanguage.direction === 'rtl' ? 'rtl' : 'ltr'}
      lang={String(selectedLanguage.localeCode || selectedLanguage.code)}
      style={{ '--school-accent': accent, '--school-accent-2': accent2 } as React.CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-36 top-0 h-[32rem] w-[32rem] rounded-full bg-[var(--school-accent)]/15 blur-[110px]" />
        <div className="absolute -right-28 top-72 h-[30rem] w-[30rem] rounded-full bg-[var(--school-accent-2)]/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="edx-public-dark-surface relative z-30 border-b border-white/10 bg-[#030611]/92 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-2.5 text-[10px] font-bold lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" onClick={onBackToPlatform} className="inline-flex items-center gap-1.5 uppercase tracking-[0.18em] text-[var(--school-accent)] transition hover:text-white">
              <GraduationCap className="h-3.5 w-3.5" /> EDUNIXO School Network
            </button>
            <span className="inline-flex items-center gap-1.5 text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Official verified school website</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-400">
            {(contact.city || contact.state) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {[contact.city, contact.state].filter(Boolean).join(', ')}</span>}
            {(contact.phone || contact.mobile) && <span className="hidden items-center gap-1.5 sm:inline-flex"><Phone className="h-3.5 w-3.5" /> {contact.phone || contact.mobile}</span>}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 uppercase tracking-[0.16em]">{school.schoolCode}</span>
          </div>
        </div>
      </div>

      {admissionsOpen && (
        <div className="relative z-30 border-b border-white/10 bg-white/[0.045] px-4 py-2.5 text-center text-[11px] font-bold tracking-wide text-slate-200 backdrop-blur-xl">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            {lt(school.admissionTitle) || lt('Admissions Open')}{school.admissionSession ? ` · ${school.admissionSession}` : ''}
            <button onClick={() => setAdmissionOpen(true)} className="ml-1 font-black text-[var(--school-accent)] hover:underline">{ui.applyNow}</button>
          </span>
        </div>
      )}

      <header className="edx-public-dark-surface sticky top-0 z-40 border-b border-white/10 bg-[#050816]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex min-w-0 items-center gap-3 text-left">
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="" className="h-11 w-11 rounded-2xl border border-white/15 bg-white object-contain p-1.5 shadow-xl" />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-[var(--school-accent)] to-[var(--school-accent-2)] text-sm font-black text-slate-950 shadow-xl">
                {initials(school.shortName || school.schoolName)}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-tight sm:text-base">{school.schoolName}</div>
              <div className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{ui.officialDigitalCampus}</div>
            </div>
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map(([key, label]) => (
              <a key={key} href={`#${key}`} className="text-xs font-bold text-slate-400 transition hover:text-white">{label}</a>
            ))}
            <button onClick={onBackToPlatform} className="text-xs font-bold text-slate-400 transition hover:text-white">EDUNIXO</button>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            {languageControl()}
            {admissionsOpen && (
              <button onClick={() => setAdmissionOpen(true)} className="rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-white transition hover:border-white/25 hover:bg-white/10">
                {ui.applyForAdmission}
              </button>
            )}
            <button onClick={onOpenERP} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 shadow-xl transition hover:-translate-y-0.5">
              <LockKeyhole className="h-3.5 w-3.5" /> {ui.schoolLogin}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            {languageControl(true)}
            <button onClick={() => setMobileMenuOpen(value => !value)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5" aria-label="Open school menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="edx-public-dark-surface border-t border-white/10 bg-[#070b1c] px-5 py-4 sm:hidden">
            <div className="grid gap-2">
              {navItems.map(([key, label]) => <a key={key} href={`#${key}`} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold text-slate-300 hover:bg-white/5">{label}</a>)}
              {admissionsOpen && <button onClick={() => { setAdmissionOpen(true); setMobileMenuOpen(false); }} className="rounded-xl bg-[var(--school-accent)] px-4 py-3 text-sm font-black text-slate-950">{ui.applyForAdmission}</button>}
              <button onClick={onOpenERP} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950">{ui.schoolLogin}</button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-[92rem] px-4 pb-16 pt-7 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
          <div className="edx-public-hero relative min-h-[720px] overflow-hidden rounded-[2.2rem] border border-white/15 bg-slate-950 shadow-[0_45px_140px_rgba(0,0,0,.58)] sm:rounded-[3rem]">
            {theme.heroImageUrl ? (
              <img src={String(theme.heroImageUrl)} alt={`${school.schoolName} campus banner`} fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,.28),transparent_32%),radial-gradient(circle_at_82%_70%,rgba(139,92,246,.34),transparent_36%),linear-gradient(135deg,#071629,#090b21_55%,#17113a)]">
                <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.28)_1px,transparent_1px)] [background-size:52px_52px]" />
                <div className="absolute right-[8%] top-[18%] grid h-44 w-44 place-items-center rounded-[3rem] border border-white/10 bg-white/[0.05] text-5xl font-black text-white/20 shadow-2xl backdrop-blur-xl sm:h-60 sm:w-60 sm:text-7xl">{school.logoUrl ? <img src={school.logoUrl} alt="" className="h-28 w-28 object-contain opacity-70 sm:h-40 sm:w-40" /> : initials(school.shortName || school.schoolName)}</div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/95 via-[#030712]/72 to-[#030712]/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-black/25" />

            <div className="relative flex min-h-[720px] flex-col justify-between p-6 sm:p-10 lg:p-14">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200 shadow-2xl backdrop-blur-xl">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" /> {ui.verifiedInstitution} · {school.schoolCode}
                </div>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300 backdrop-blur-xl sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,.9)]" />{ui.officialSchoolWebsite}</div>
              </div>

              <div className="grid items-end gap-8 lg:grid-cols-[1fr_340px]">
                <div className="max-w-4xl">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-[1.4rem] border border-white/15 bg-white/10 text-xl font-black shadow-2xl backdrop-blur-xl sm:h-20 sm:w-20">
                      {school.logoUrl ? <img src={school.logoUrl} alt="" className="h-full w-full bg-white object-contain p-2" /> : initials(school.shortName || school.schoolName)}
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/45 px-4 py-3 shadow-xl backdrop-blur-md"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">{ui.welcomeTo}</p><p className="mt-1 text-sm font-black text-white drop-shadow sm:text-base">{school.schoolName}</p></div>
                  </div>
                  <h1 className="max-w-5xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]">
                    {lt(school.heroTitle) || lt(school.schoolName)}
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
                    {lt(school.heroSubtitle) || lt(school.tagline) || 'A progressive school community committed to knowledge, character and meaningful student growth.'}
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {admissionsOpen && <button onClick={() => setAdmissionOpen(true)} className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--school-accent)] to-[var(--school-accent-2)] px-6 py-4 text-sm font-black text-slate-950 shadow-2xl transition hover:-translate-y-1">{ui.applyForAdmission} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button>}
                    <button onClick={onOpenERP} className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-6 py-4 text-sm font-black text-white backdrop-blur-xl transition hover:border-white/30 hover:bg-white/10">{ui.studentStaffLogin} <ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="rounded-[1.8rem] border border-white/15 bg-black/30 p-5 shadow-2xl backdrop-blur-2xl">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{ui.schoolDigitalReception}</div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[[Languages, ui.multilingual, ui.inclusiveAccess], [GraduationCap, ui.studentFirst, ui.connectedJourney], [ShieldCheck, ui.secure, ui.verifiedPortal], [Sparkles, ui.digital, ui.modernExperience]].map(([Icon, title, text]: any) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><Icon className="h-4 w-4 text-[var(--school-accent)]" /><div className="mt-3 text-xs font-black">{title}</div><div className="mt-1 text-[10px] leading-4 text-slate-400">{text}</div></div>)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><CalendarDays className="h-5 w-5 text-amber-300" /><div className="mt-3 text-xs font-black">{ui.admissions}</div><div className="mt-1 text-[10px] text-slate-400">{admissionsOpen ? school.admissionSession || ui.openNow : ui.schoolOffice}</div></div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><LockKeyhole className="h-5 w-5 text-emerald-300" /><div className="mt-3 text-xs font-black">{ui.erpAccess}</div><div className="mt-1 text-[10px] text-slate-400">{ui.roleBasedLogin}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 mx-auto -mt-8 max-w-7xl px-5 pb-12 lg:-mt-12 lg:px-8 lg:pb-16">
          <div className="edx-public-dark-surface grid overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0a0f22]/92 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-4">
            {academics ? (
              <a href="#academics" className="group flex min-h-32 items-center gap-4 border-b border-white/10 p-5 transition hover:bg-white/[0.055] sm:border-r lg:border-b-0">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--school-accent)]/12 text-[var(--school-accent)]"><BookOpen className="h-5 w-5" /></div>
                <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Explore</div><div className="mt-1 text-sm font-black text-white">{ui.academics}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Programs, learning and academic journey</div></div>
              </a>
            ) : <div className="hidden lg:block" />}
            {gallery ? (
              <a href="#gallery" className="group flex min-h-32 items-center gap-4 border-b border-white/10 p-5 transition hover:bg-white/[0.055] lg:border-b-0 lg:border-r">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-400/12 text-violet-300"><ImageIcon className="h-5 w-5" /></div>
                <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Discover</div><div className="mt-1 text-sm font-black text-white">{ui.gallery}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Campus life, activities and achievements</div></div>
              </a>
            ) : <div className="hidden lg:block" />}
            <button type="button" onClick={() => admissionsOpen ? setAdmissionOpen(true) : document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="group flex min-h-32 items-center gap-4 border-b border-white/10 p-5 text-left transition hover:bg-white/[0.055] sm:border-b-0 sm:border-r">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-300/12 text-amber-300"><FileText className="h-5 w-5" /></div>
              <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Admissions</div><div className="mt-1 text-sm font-black text-white">{admissionsOpen ? ui.applyForAdmission : ui.contact}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">{admissionsOpen ? (school.admissionSession || 'Online admission available') : 'Contact the school office'}</div></div>
            </button>
            <button type="button" onClick={onOpenERP} className="group flex min-h-32 items-center gap-4 p-5 text-left transition hover:bg-white/[0.055]">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/12 text-emerald-300"><LockKeyhole className="h-5 w-5" /></div>
              <div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Secure workspace</div><div className="mt-1 text-sm font-black text-white">{ui.schoolLogin}</div><div className="mt-1 text-[10px] leading-4 text-slate-500">Headmaster, staff, students and parents</div></div>
            </button>
          </div>
        </section>

        {about && (
          <section id="about" className="edx-public-lazy-section border-y border-white/10 bg-white/[0.025]">
            <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{about.eyebrow || ui.aboutOurSchool}</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{about.title}</h2>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl backdrop-blur-xl sm:p-10">
                <p className="text-base leading-8 text-slate-300">{about.body}</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[[ui.purpose, ui.learningDirection], [ui.care, ui.everyLearnerMatters], [ui.progress, ui.visibleGrowth]].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="text-sm font-black">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{text}</div></div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {academics && (
          <section id="academics" className="edx-public-lazy-section mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{academics.eyebrow || 'Academics'}</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{academics.title}</h2>
              {academics.body && <p className="mt-5 text-base leading-8 text-slate-400">{academics.body}</p>}
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {(academics.items || []).map((item, index) => {
                const icons = [BookOpen, GraduationCap, Users];
                const Icon = icons[index % icons.length];
                return <article key={`${item}-${index}`} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-7 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--school-accent)]/10 text-[var(--school-accent)]"><Icon className="h-6 w-6" /></div><div className="mt-7 text-lg font-black leading-7">{item}</div><div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{ui.studentGrowth} <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></div></article>;
              })}
            </div>
          </section>
        )}

        {principal && (
          <section className="edx-public-lazy-section mx-auto max-w-7xl px-5 pb-24 lg:px-8">
            <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-gradient-to-br from-[var(--school-accent)]/15 via-white/[0.045] to-[var(--school-accent-2)]/10 p-8 sm:p-12 lg:p-16">
              <Quote className="absolute right-8 top-8 h-28 w-28 text-white/[0.035]" />
              <div className="relative max-w-4xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{principal.eyebrow || ui.headmasterMessage}</p>
                <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">“{principal.title}”</h2>
                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">{principal.body}</p>
                <div className="mt-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-black text-slate-950">HM</div><div><div className="text-sm font-black">{ui.headmaster}</div><div className="text-xs text-slate-500">{school.schoolName}</div></div></div>
              </div>
            </div>
          </section>
        )}

        {facilities && (
          <section id="facilities" className="edx-public-lazy-section border-y border-white/10 bg-white/[0.025]">
            <div className="edx-public-lazy-section mx-auto max-w-7xl px-5 py-24 lg:px-8">
              <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
                <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{facilities.eyebrow || ui.facilities}</p><h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{facilities.title}</h2>{facilities.body && <p className="mt-5 text-base leading-8 text-slate-400">{facilities.body}</p>}</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(facilities.items || []).map((item, index) => <div key={`${item}-${index}`} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-300"><CheckCircle2 className="h-5 w-5" /></div><div className="pt-2 text-sm font-bold leading-6 text-slate-200">{item}</div></div>)}
                </div>
              </div>
            </div>
          </section>
        )}

        {(achievements || notices) && (
          <section id="notices" className="edx-public-lazy-section mx-auto grid max-w-7xl gap-6 px-5 py-24 lg:grid-cols-2 lg:px-8">
            {achievements && <div className="rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/10 to-white/[0.035] p-7 sm:p-9"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-300/10 text-amber-300"><Award className="h-6 w-6" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{achievements.eyebrow || ui.achievements}</p><h2 className="mt-1 text-2xl font-black">{achievements.title}</h2></div></div><div className="mt-7 space-y-3">{(achievements.items || []).map((item, index) => <div key={`${item}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-bold"><Star className="h-4 w-4 shrink-0 text-amber-300" />{item}</div>)}</div></div>}
            {notices && <div className="rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 to-white/[0.035] p-7 sm:p-9"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><FileText className="h-6 w-6" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{notices.eyebrow || ui.notices}</p><h2 className="mt-1 text-2xl font-black">{notices.title}</h2></div></div><div className="mt-7 space-y-3">{(notices.items || []).map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/10 px-4 py-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /><div className="text-sm font-bold leading-6">{item}</div></div>)}</div></div>}
          </section>
        )}

        {gallery && (
          <section id="gallery" className="edx-public-lazy-section border-y border-white/10 bg-white/[0.025]">
            <div className="edx-public-lazy-section mx-auto max-w-7xl px-5 py-24 lg:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{gallery.eyebrow || ui.gallery}</p><h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{gallery.title || lt('Life at our school')}</h2>{gallery.body && <p className="mt-5 text-base leading-8 text-slate-400">{gallery.body}</p>}</div><div className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{ui.officialSchoolMedia}</div></div>
              {(gallery.items || []).length > 0 ? <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(gallery.items || []).slice(0, 6).map((url, index) => <div key={`${url}-${index}`} className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04]">{/^https?:\/\//i.test(url) ? <img src={url} alt={`School gallery ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-[var(--school-accent)]/15 to-[var(--school-accent-2)]/15 text-center"><div><ImageIcon className="mx-auto h-8 w-8 text-white/30" /><div className="mt-3 px-5 text-sm font-bold text-slate-300">{url}</div></div></div>}<div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition group-hover:opacity-100" /></div>)}</div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[ui.campus, ui.classrooms, ui.studentActivities].map((label, index) => <div key={label} className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-dashed border-white/12 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.13),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,.13),transparent_36%),rgba(255,255,255,.025)]"><div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:36px_36px]" /><div className="relative grid h-full place-items-center text-center"><div><ImageIcon className="mx-auto h-9 w-9 text-white/20" /><div className="mt-4 text-sm font-black text-slate-300">{label}</div><div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{ui.schoolPhotosSoon}</div></div></div></div>)}</div>}
            </div>
          </section>
        )}

        {rules && (
          <section className="edx-public-lazy-section mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
              <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{rules.eyebrow || ui.rulesInformation}</p><h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{rules.title}</h2>{rules.body && <p className="mt-5 text-base leading-8 text-slate-400">{rules.body}</p>}</div>
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 sm:p-8"><div className="space-y-4">{(rules.items || []).map((item, index) => <div key={`${item}-${index}`} className="flex gap-4"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-xs font-black text-[var(--school-accent)]">{String(index + 1).padStart(2, '0')}</div><p className="pt-1 text-sm leading-7 text-slate-300">{item}</p></div>)}</div></div>
            </div>
          </section>
        )}

        <section id="contact" className="edx-public-lazy-section border-t border-white/10 bg-white/[0.025]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-[.85fr_1.15fr] lg:px-8">
            <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--school-accent)]">{ui.connectWithSchool}</p><h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{sectionByKey(sections, 'contact')?.title || ui.hereToHelp}</h2><p className="mt-5 max-w-xl text-base leading-8 text-slate-400">{ui.contactGuidance}</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [MapPin, ui.address, [contact.address, contact.city, contact.district, contact.state].filter(Boolean).join(', ') || ui.schoolOffice],
                [Phone, ui.phone, contact.phone || contact.mobile || ui.contactSchoolOffice],
                [Mail, ui.email, contact.email || ui.officialSchoolEmail],
                [Clock3, ui.officeHours, contact.officeHours || ui.regularSchoolHours]
              ].map(([Icon, title, value]: any) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"><Icon className="h-5 w-5 text-[var(--school-accent)]" /><div className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</div><div className="mt-2 text-sm font-bold leading-6 text-slate-200">{value}</div></div>)}
            </div>
          </div>
        </section>
      </main>

      <footer className="edx-public-dark-surface relative z-10 border-t border-white/10 bg-[#03050d]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[var(--school-accent)] to-[var(--school-accent-2)] text-xs font-black text-slate-950">{initials(school.shortName || school.schoolName)}</div><div><div className="text-sm font-black">{school.schoolName}</div><div className="text-[10px] text-slate-500">{ui.officialDigitalCampus}</div></div></div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"><button onClick={onBackToPlatform} className="hover:text-white">{ui.platform}</button><span>{ui.secureSchoolPortal}</span><span>{ui.poweredBy}</span></div>
        </div>
      </footer>

      {admissionOpen && (
        <React.Suspense fallback={null}>
          <AdmissionApplicationWizard
            open={admissionOpen}
            onClose={() => setAdmissionOpen(false)}
            schoolSlug={school.slug}
            schoolName={school.schoolName}
            admissionTitle={lt(school.admissionTitle)}
            admissionDescription={lt(school.admissionDescription)}
            campaign={school.admissionCampaign || null}
            language={activeLanguage}
          />
        </React.Suspense>
      )}
    </div>
  );
}
