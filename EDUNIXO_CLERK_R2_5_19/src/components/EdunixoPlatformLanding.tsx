/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, BarChart3, BookOpenCheck, Building2, CalendarClock, Check,
  ChevronRight, CircleDollarSign, Cloud, FileCheck2, Globe2, GraduationCap, Languages,
  LayoutDashboard, Loader2, LockKeyhole, Menu, MessageSquareText, MonitorSmartphone,
  Search, ShieldCheck, Sparkles, UsersRound, WandSparkles, X, Zap
} from 'lucide-react';
import { Language } from '../types';
import { LanguageOption } from '../lib/languageCatalog';
import { FontOption } from '../lib/fontCatalog';
import LanguageSelector from './LanguageSelector';
import FontSelector from './FontSelector';
import { getPlatformLandingCopy } from '../lib/platformLandingTranslations';

type InterestType = 'registration' | 'demo';

type PublicSchool = {
  id: string;
  schoolCode: string;
  schoolName: string;
  slug: string;
  portalPath: string;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  admissionsOpen?: boolean;
  admissionSession?: string | null;
  portalAvailable?: boolean;
};

interface EdunixoPlatformLandingProps {
  lang: Language;
  onLangChange: (language: Language) => void;
  languages: LanguageOption[];
  languagesLoading?: boolean;
  interfaceFontCode: string;
  interfaceFonts: FontOption[];
  fontsLoading?: boolean;
  onInterfaceFontChange: (fontCode: string) => void;
  onOpenPlatformLogin: () => void;
  onOpenSchool: (portalPath: string) => void;
  platformSessionActive?: boolean;
  onOpenPlatformConsole?: () => void;
}

const MODULE_OPTIONS = [
  'Admissions', 'Student Management', 'Staff Management', 'Attendance', 'Smart Timetable',
  'Examination & Results', 'Fees', 'Payroll', 'Communication', 'School Website'
];


export default function EdunixoPlatformLanding({
  lang, onLangChange, languages, languagesLoading = false, interfaceFontCode, interfaceFonts,
  fontsLoading = false, onInterfaceFontChange, onOpenPlatformLogin, onOpenSchool,
  platformSessionActive = false, onOpenPlatformConsole
}: EdunixoPlatformLandingProps) {
  const selectedCopy = getPlatformLandingCopy(lang);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [finderQuery, setFinderQuery] = useState('');
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderAttempted, setFinderAttempted] = useState(false);
  const [finderError, setFinderError] = useState('');
  const [interestType, setInterestType] = useState<InterestType | null>(null);
  const [leadState, setLeadState] = useState({
    institutionName: '', institutionType: 'School', city: '', state: '', contactName: '', designation: '',
    mobile: '', email: '', studentCount: '', staffCount: '', preferredLanguageCode: lang || 'en',
    requestedModules: ['Admissions', 'Smart Timetable', 'Examination & Results', 'School Website'] as string[],
    message: '', consent: false, website: ''
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [leadReference, setLeadReference] = useState('');
  const featureIcons = [Languages, WandSparkles, FileCheck2, MonitorSmartphone, LayoutDashboard, ShieldCheck];
  const cards = selectedCopy.features.map((item, index) => ({ ...item, icon: featureIcons[index] }));

  const openInterest = (type: InterestType) => {
    setInterestType(type);
    setLeadError('');
    setLeadReference('');
  };

  const findSchools = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = finderQuery.trim();
    if (!query) return;
    setFinderLoading(true);
    setFinderAttempted(true);
    setFinderError('');
    try {
      const response = await fetch(`/api/public/schools?query=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || selectedCopy.directoryError);
      setSchools(Array.isArray(payload.schools) ? payload.schools : []);
    } catch (error: any) {
      setSchools([]);
      setFinderError(error?.message || selectedCopy.directoryError);
    } finally {
      setFinderLoading(false);
    }
  };

  const toggleModule = (moduleName: string) => {
    setLeadState((current) => ({
      ...current,
      requestedModules: current.requestedModules.includes(moduleName)
        ? current.requestedModules.filter((item) => item !== moduleName)
        : [...current.requestedModules, moduleName]
    }));
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!interestType) return;
    setLeadError('');
    setLeadReference('');
    if (!leadState.institutionName.trim() || !leadState.contactName.trim() || !leadState.mobile.trim() || !leadState.email.trim()) {
      setLeadError(selectedCopy.requiredError);
      return;
    }
    if (!leadState.consent) {
      setLeadError(selectedCopy.authorizedError);
      return;
    }

    setLeadLoading(true);
    try {
      const response = await fetch('/api/public/institution-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leadState, interestType, sourcePage: window.location.pathname })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || selectedCopy.requestError);
      setLeadReference(String(payload.referenceCode || 'EDUNIXO-REQUEST'));
    } catch (error: any) {
      setLeadError(error?.message || selectedCopy.requestError);
    } finally {
      setLeadLoading(false);
    }
  };

  return (
    <div className="edunixo-platform-landing min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-cyan-300 selection:text-slate-950" data-public-language={String(lang)} dir={String(lang).toLowerCase().startsWith('ur') || String(lang).toLowerCase().startsWith('ks') || String(lang).toLowerCase().startsWith('sd') ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none fixed inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[30rem] w-[30rem] rounded-full bg-indigo-500/15 blur-3xl" />
      </div>

      <header className="relative z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="EDUNIXO">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[0.16em]">EDUNIXO</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-300">{selectedCopy.brandSubtitle}</div>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-xs font-bold text-slate-300 lg:flex">
            <a href="#platform" className="transition hover:text-cyan-300">{selectedCopy.navPlatform}</a>
            <a href="#advantages" className="transition hover:text-cyan-300">{selectedCopy.navAdvantages}</a>
            <a href="#student-promise" className="transition hover:text-cyan-300">{selectedCopy.navStudents}</a>
            <a href="#school-finder" className="transition hover:text-cyan-300">{selectedCopy.navFinder}</a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label={selectedCopy.interfaceLanguage} purpose="interface" />
            <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
            <button
              onClick={platformSessionActive && onOpenPlatformConsole ? onOpenPlatformConsole : onOpenPlatformLogin}
              className="ml-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              {platformSessionActive ? selectedCopy.openConsole : selectedCopy.admin}
            </button>
          </div>

          <button onClick={() => setMobileMenu((value) => !value)} className="rounded-xl border border-white/15 p-2.5 lg:hidden" aria-label={selectedCopy.toggleNavigation}>
            {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="border-t border-white/10 px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4 text-sm font-bold text-slate-200">
              <a href="#advantages" onClick={() => setMobileMenu(false)}>{selectedCopy.navAdvantages}</a>
              <a href="#student-promise" onClick={() => setMobileMenu(false)}>{selectedCopy.navStudents}</a>
              <a href="#school-finder" onClick={() => setMobileMenu(false)}>{selectedCopy.navFinder}</a>
              <div className="flex items-center gap-2 pt-2">
                <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label={selectedCopy.interfaceLanguage} purpose="interface" />
                <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
              </div>
              <button onClick={platformSessionActive && onOpenPlatformConsole ? onOpenPlatformConsole : onOpenPlatformLogin} className="rounded-xl bg-white px-4 py-3 text-slate-950">
                {platformSessionActive ? selectedCopy.openPlatformConsole : selectedCopy.admin}
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="relative z-10">
        <section id="platform" className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> {selectedCopy.heroBadge}
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              {selectedCopy.heroTitleA}{' '}
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-transparent">{selectedCopy.heroTitleB}</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">{selectedCopy.heroText}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => openInterest('registration')} className="group flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-cyan-200">
                {selectedCopy.register}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <button onClick={() => openInterest('demo')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-extrabold text-white transition hover:border-white/30 hover:bg-white/10">
                <Zap className="h-4 w-4 text-amber-300" />{selectedCopy.demo}
              </button>
            </div>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">
              <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div><strong className="text-white">{selectedCopy.studentPricing}:</strong> {selectedCopy.studentFree}</div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-10 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.07] p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300 text-slate-950"><LayoutDashboard className="h-5 w-5" /></div>
                    <div><div className="text-sm font-extrabold">{selectedCopy.unifiedCommand}</div><div className="text-[10px] text-slate-400">{selectedCopy.workspacePreview}</div></div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />{selectedCopy.secureCloud}</div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    [selectedCopy.students, '2,480', UsersRound], [selectedCopy.attendance, '94.8%', BadgeCheck], [selectedCopy.classes, '48', BookOpenCheck], [selectedCopy.notices, '12', MessageSquareText]
                  ].map(([label, value, Icon]: any) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <Icon className="h-4 w-4 text-cyan-300" /><div className="mt-3 text-lg font-black">{value}</div><div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_.8fr]">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 p-4">
                    <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{selectedCopy.smartTimetable}</p><h3 className="mt-1 text-base font-black">{selectedCopy.wholeSchoolGenerated}</h3></div><CalendarClock className="h-6 w-6 text-sky-300" /></div>
                    <div className="mt-4 space-y-2">
                      {[82, 68, 92].map((width, index) => <div key={width} className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-blue-400" style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }} /></div>)}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-300"><Check className="h-3.5 w-3.5" />{selectedCopy.noClashes}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{selectedCopy.languageLayer}</p>
                    <div className="mt-3 space-y-2 text-xs font-bold">
                      <div className="rounded-lg bg-white/5 px-3 py-2">English · हिन्दी</div>
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-right">اردو · मराठी</div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">ગુજરાતી · தமிழ்</div>
                    </div>
                    <div className="mt-3 text-[10px] leading-5 text-slate-400">{selectedCopy.languageLayerText}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 md:grid-cols-4 lg:px-8">
            {selectedCopy.stats.map(([value, label]) => (
              <div key={label} className="px-4 py-8 text-center"><div className="text-3xl font-black text-cyan-300">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div></div>
            ))}
          </div>
        </section>

        <section id="advantages" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{selectedCopy.whyChoose}</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{selectedCopy.advantagesTitle}</h2>
            <p className="mt-5 text-base leading-8 text-slate-400">{selectedCopy.advantagesText}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ icon: Icon, eyebrow, title, text }) => (
              <article key={title} className="group rounded-3xl border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between"><div className="rounded-2xl bg-cyan-300/10 p-3 text-cyan-300"><Icon className="h-6 w-6" /></div><ChevronRight className="h-5 w-5 text-slate-700 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div>
                <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
                <h3 className="mt-2 text-xl font-black tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="student-promise" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-400/15 via-slate-900 to-cyan-400/10 p-8 sm:p-12 lg:p-16">
            <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div className="grid h-28 w-28 place-items-center rounded-[2rem] border border-emerald-200/20 bg-emerald-300/10 text-emerald-300"><GraduationCap className="h-14 w-14" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{selectedCopy.promiseEyebrow}</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{selectedCopy.promiseTitle}</h2>
                <p className="mt-6 max-w-3xl text-base leading-8 text-emerald-50/75">{selectedCopy.promiseText}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {selectedCopy.promiseBadges.map((item) => <span key={item} className="rounded-full border border-emerald-200/20 bg-emerald-100/10 px-3 py-2 text-xs font-bold text-emerald-100"><Check className="mr-1 inline h-3.5 w-3.5" />{item}</span>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">{selectedCopy.identityEyebrow}</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{selectedCopy.identityTitle}</h2>
            <p className="mt-6 text-base leading-8 text-slate-400">{selectedCopy.identityText}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {selectedCopy.identityBenefits.map((item) => <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{item}</div>)}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-2xl">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-100 text-slate-950">
              <div className="flex items-center justify-between bg-white px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Building2 className="h-5 w-5" /></div><div><div className="text-sm font-black">{selectedCopy.yourSchoolName}</div><div className="text-[9px] text-slate-500">{selectedCopy.officialDigitalCampus}</div></div></div><button className="rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-bold text-white">{selectedCopy.login}</button></div>
              <div className="bg-gradient-to-br from-blue-700 to-indigo-900 px-6 py-12 text-center text-white"><span className="rounded-full bg-amber-300 px-3 py-1 text-[9px] font-black uppercase text-slate-950">{selectedCopy.admissionsOpen}</span><h3 className="mt-4 text-3xl font-black">{selectedCopy.learnGrowLead}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-blue-100">{selectedCopy.schoolBannerText}</p><div className="mt-5 flex justify-center gap-2"><button className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-blue-800">{selectedCopy.applyOnline}</button><button className="rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold">{selectedCopy.viewProspectus}</button></div></div>
              <div className="grid grid-cols-3 gap-3 p-5">{[[selectedCopy.notices, CalendarClock], [selectedCopy.achievements, BadgeCheck], [selectedCopy.contact, MessageSquareText]].map(([label, Icon]: any) => <div key={label} className="rounded-xl bg-white p-3 text-center shadow-sm"><Icon className="mx-auto h-5 w-5 text-blue-600" /><div className="mt-2 text-[10px] font-bold">{label}</div></div>)}</div>
            </div>
          </div>
        </section>

        <section id="school-finder" className="border-y border-white/10 bg-gradient-to-br from-cyan-400/10 to-indigo-500/10 py-24">
          <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
            <Globe2 className="mx-auto h-10 w-10 text-cyan-300" />
            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em]">{selectedCopy.finderTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">{selectedCopy.finderText}</p>
            <form onSubmit={findSchools} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-2xl sm:flex-row">
              <div className="relative flex-1"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={finderQuery} onChange={(event) => setFinderQuery(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 ps-12 pe-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" placeholder={selectedCopy.finderPlaceholder} /></div>
              <button disabled={finderLoading || !finderQuery.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50">{finderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{selectedCopy.finderButton}</button>
            </form>

            {finderError && <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-200">{finderError}</div>}
            {finderAttempted && !finderLoading && !finderError && schools.length === 0 && <div className="mt-5 text-sm text-slate-400">{selectedCopy.noSchool}</div>}
            {schools.length > 0 && (
              <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                {schools.map((school) => (
                  <button key={school.id} onClick={() => onOpenSchool(school.portalPath)} className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.08]">
                    <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-cyan-300"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate text-base font-black text-white">{school.schoolName}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{school.schoolCode}{school.city ? ` · ${school.city}` : ''}</div>{school.admissionsOpen && <div className="mt-2 inline-flex rounded-full bg-emerald-300/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">{selectedCopy.admissionsOpen}{school.admissionSession ? ` · ${school.admissionSession}` : ''}</div>}<div className="mt-3 flex items-center gap-1 text-xs font-bold text-cyan-300">{selectedCopy.openWebsite}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></div></div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.045] px-7 py-12 text-center sm:px-12">
            <Cloud className="mx-auto h-10 w-10 text-cyan-300" />
            <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em]">{selectedCopy.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">{selectedCopy.ctaText}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => openInterest('registration')} className="rounded-2xl bg-cyan-300 px-7 py-4 text-sm font-black text-slate-950">{selectedCopy.register}</button><button onClick={() => openInterest('demo')} className="rounded-2xl border border-white/15 px-7 py-4 text-sm font-black text-white">{selectedCopy.demo}</button></div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div><span className="font-black tracking-[0.16em] text-white">EDUNIXO</span><span className="ms-3">{selectedCopy.footerSubtitle}</span></div>
          <div className="flex flex-wrap gap-5"><a href="#advantages" className="hover:text-cyan-300">{selectedCopy.navPlatform}</a><a href="#student-promise" className="hover:text-cyan-300">{selectedCopy.navStudents}</a><a href="#school-finder" className="hover:text-cyan-300">{selectedCopy.navFinder}</a><button onClick={onOpenPlatformLogin} className="hover:text-cyan-300">{selectedCopy.administratorAccess}</button></div>
          <div>© 2026 EDUNIXO ERP</div>
        </div>
      </footer>

      {interestType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-slate-900/95 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{selectedCopy.onboarding}</p><h2 className="mt-1 text-2xl font-black">{interestType === 'registration' ? selectedCopy.leadTitleRegistration : selectedCopy.leadTitleDemo}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{selectedCopy.leadText}</p></div>
              <button onClick={() => setInterestType(null)} className="ml-4 rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label={selectedCopy.close}><X className="h-5 w-5" /></button>
            </div>

            {leadReference ? (
              <div className="p-8 text-center sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-300/10 text-emerald-300"><Check className="h-8 w-8" /></div><h3 className="mt-5 text-2xl font-black">{selectedCopy.submitted}</h3><p className="mt-3 text-sm text-slate-400">{selectedCopy.keepReference}</p><div className="mx-auto mt-5 max-w-sm rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 font-mono text-base font-black tracking-wider text-cyan-200">{leadReference}</div><button onClick={() => setInterestType(null)} className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-950">{selectedCopy.close}</button></div>
            ) : (
              <form onSubmit={submitLead} className="space-y-7 p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    [selectedCopy.institutionName, 'institutionName', 'text', selectedCopy.institutionName], [selectedCopy.institutionType, 'institutionType', 'text', selectedCopy.institutionType],
                    [selectedCopy.cityDistrict, 'city', 'text', selectedCopy.cityDistrict], [selectedCopy.state, 'state', 'text', selectedCopy.state],
                    [selectedCopy.authorizedContact, 'contactName', 'text', selectedCopy.authorizedContact], [selectedCopy.designation, 'designation', 'text', selectedCopy.designation],
                    [selectedCopy.mobile, 'mobile', 'tel', '+91…'], [selectedCopy.officialEmail, 'email', 'email', 'name@institution.org'],
                    [selectedCopy.approxStudents, 'studentCount', 'number', '1200'], [selectedCopy.approxStaff, 'staffCount', 'number', '75']
                  ].map(([label, key, type, placeholder]) => (
                    <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">{label}{['institutionName','contactName','mobile','email'].includes(key) ? ' *' : ''}</span><input type={type} min={type === 'number' ? 0 : undefined} value={(leadState as any)[key]} onChange={(event) => setLeadState((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.07]" /></label>
                  ))}
                </div>

                <div><div className="mb-3 text-xs font-bold text-slate-300">{selectedCopy.modulesInterest}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MODULE_OPTIONS.map((moduleName) => { const selected = leadState.requestedModules.includes(moduleName); return <button key={moduleName} type="button" onClick={() => toggleModule(moduleName)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${selected ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20'}`}><span className={`grid h-4 w-4 place-items-center rounded border ${selected ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-600'}`}>{selected && <Check className="h-3 w-3" />}</span>{selectedCopy.moduleLabels[moduleName] || moduleName}</button>; })}</div></div>

                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">{selectedCopy.additionalRequirements}</span><textarea rows={3} value={leadState.message} onChange={(event) => setLeadState((current) => ({ ...current, message: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" placeholder={selectedCopy.additionalPlaceholder} /></label>

                <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={leadState.website} onChange={(event) => setLeadState((current) => ({ ...current, website: event.target.value }))} className="hidden" />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4"><input type="checkbox" checked={leadState.consent} onChange={(event) => setLeadState((current) => ({ ...current, consent: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-cyan-300" /><span className="text-xs leading-5 text-slate-400">{selectedCopy.consent}</span></label>

                {leadError && <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-xs font-semibold leading-5 text-rose-200">{leadError}</div>}
                <button disabled={leadLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">{leadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{leadLoading ? selectedCopy.submitting : interestType === 'registration' ? selectedCopy.submitRegistration : selectedCopy.requestDemo}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
