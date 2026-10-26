/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BadgeCheck, BarChart3, BookOpenCheck, Building2, CalendarClock, Check,
  ChevronRight, CircleDollarSign, Cloud, FileCheck2, Globe2, GraduationCap, Languages,
  LayoutDashboard, Loader2, LockKeyhole, Menu, MessageSquareText, MonitorSmartphone,
  Search, ShieldCheck, Sparkles, UsersRound, WandSparkles, X, Zap, KeyRound
} from 'lucide-react';
import { Language } from '../types';
import { LanguageOption } from '../lib/languageCatalog';
import { FontOption } from '../lib/fontCatalog';
import LanguageSelector from './LanguageSelector';
import FontSelector from './FontSelector';
import { getPlatformLandingCopy } from '../lib/platformLandingTranslations';
import { getPublicPortalCopy } from '../lib/publicPortalTranslations';
import { requestPublicOtp, verifyPublicOtp } from '../lib/otpClient';
import type { DemoRole } from '../lib/demoExperienceCatalog';

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

type PublicPlan = {
  id: string;
  planKey: string;
  planName: string;
  description?: string | null;
  billingCycle?: string | null;
  currency?: string | null;
  basePrice?: number | null;
  trialDays?: number | null;
  moduleCount?: number;
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
  onOpenLiveDemo: (launch?: { institutionName: string; role: DemoRole }) => void;
}


const RECENT_PUBLIC_SCHOOL_KEY = 'edunixo.public.recentSchool';

function readRecentPublicSchool(): PublicSchool | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RECENT_PUBLIC_SCHOOL_KEY);
    if (!raw) return null;
    const school = JSON.parse(raw);
    if (!school?.id || !school?.schoolCode || !school?.schoolName || !school?.portalPath) return null;
    return school as PublicSchool;
  } catch {
    return null;
  }
}

function writeRecentPublicSchool(school: PublicSchool): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_PUBLIC_SCHOOL_KEY, JSON.stringify({
      id: school.id,
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      slug: school.slug,
      portalPath: school.portalPath,
      city: school.city || null,
      state: school.state || null,
      logoUrl: school.logoUrl || null,
      admissionsOpen: Boolean(school.admissionsOpen),
      admissionSession: school.admissionSession || null,
      portalAvailable: school.portalAvailable !== false
    }));
  } catch {
    // Device-level recent-school convenience only; cloud school access remains authoritative.
  }
}

const MODULE_OPTIONS = [
  'Admissions', 'Student Management', 'Staff Management', 'Attendance', 'Smart Timetable',
  'Examination & Results', 'Fees', 'Payroll', 'Communication', 'School Website'
];


const DEMO_ROLE_OPTIONS: Array<{ value: DemoRole; label: string }> = [
  { value: 'headmaster', label: 'Headmaster' },
  { value: 'clerk', label: 'Clerk' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'super_admin', label: 'Super Admin' }
];

const planCycle = (plan: PublicPlan): 'annual' | 'monthly' | 'other' => {
  const cycle = String(plan.billingCycle || '');
  if (/year|annual/i.test(cycle)) return 'annual';
  if (/month/i.test(cycle)) return 'monthly';
  return 'other';
};

const money = (amount: number, currency?: string | null): string => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  }
};

export default function EdunixoPlatformLanding({
  lang, onLangChange, languages, languagesLoading = false, interfaceFontCode, interfaceFonts,
  fontsLoading = false, onInterfaceFontChange, onOpenPlatformLogin, onOpenSchool,
  platformSessionActive = false, onOpenPlatformConsole, onOpenLiveDemo
}: EdunixoPlatformLandingProps) {
  const selectedCopy = getPlatformLandingCopy(lang);
  const publicCopy = getPublicPortalCopy(lang);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [finderQuery, setFinderQuery] = useState('');
  const [recentSchool, setRecentSchool] = useState<PublicSchool | null>(null);
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const finderRequestId = useRef(0);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderAttempted, setFinderAttempted] = useState(false);
  const [finderError, setFinderError] = useState('');
  const [interestType, setInterestType] = useState<InterestType | null>(null);
  const [leadState, setLeadState] = useState({
    institutionName: '', institutionType: 'School', city: '', state: '', contactName: '', designation: '', demoRole: 'headmaster' as DemoRole,
    mobile: '', email: '', studentCount: '', staffCount: '', preferredLanguageCode: lang || 'en',
    requestedModules: ['Admissions', 'Smart Timetable', 'Examination & Results', 'School Website'] as string[],
    message: '', consent: false, website: ''
  });
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [leadReference, setLeadReference] = useState('');
  const [leadOtpToken, setLeadOtpToken] = useState('');
  const [leadOtp, setLeadOtp] = useState('');
  const [leadOtpVerified, setLeadOtpVerified] = useState(false);
  const [leadOtpMasked, setLeadOtpMasked] = useState('');
  const [leadOtpDelivery, setLeadOtpDelivery] = useState('');
  const [leadOtpBusy, setLeadOtpBusy] = useState(false);
  const featureIcons = [Languages, WandSparkles, FileCheck2, MonitorSmartphone, LayoutDashboard, ShieldCheck];
  const cards = selectedCopy.features.map((item, index) => ({ ...item, icon: featureIcons[index] }));

  useEffect(() => {
    setRecentSchool(readRecentPublicSchool());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPlans = async () => {
      setPlansLoading(true);
      try {
        const response = await fetch('/api/public/plans', { headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Plan catalogue unavailable');
        if (!cancelled) setPlans(Array.isArray(payload?.plans) ? payload.plans : []);
      } catch {
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    };
    void loadPlans();
    return () => { cancelled = true; };
  }, []);

  const planLabel = useMemo(() => {
    const code = String(lang || 'en').toLowerCase().split('-')[0];
    if (code === 'hi') return 'योजनाएँ';
    if (code === 'ur') return 'منصوبے';
    if (code === 'mr') return 'योजना';
    return 'Plans';
  }, [lang]);

  const planView = useMemo(() => {
    const launch = plans.find((plan) => /launch/i.test(plan.planName)) || null;
    const tiers: Array<{ name: string; monthly?: PublicPlan; annual?: PublicPlan; other?: PublicPlan }> = [];
    plans.filter((plan) => plan !== launch).forEach((plan) => {
      let tier = tiers.find((item) => item.name.toLowerCase() === plan.planName.toLowerCase());
      if (!tier) { tier = { name: plan.planName }; tiers.push(tier); }
      const cycle = planCycle(plan);
      if (cycle === 'annual') tier.annual = plan;
      else if (cycle === 'monthly') tier.monthly = plan;
      else tier.other = plan;
    });
    const sample = tiers.find((tier) => tier.monthly && tier.annual && tier.monthly.basePrice && tier.annual.basePrice);
    const freeMonths = sample ? Math.round(12 - (sample.annual!.basePrice as number) / (sample.monthly!.basePrice as number)) : 0;
    return { launch, tiers, freeMonths };
  }, [plans]);

  const formatPlanPrice = (plan: PublicPlan) => {
    if (plan.basePrice === null || plan.basePrice === undefined || !Number.isFinite(plan.basePrice)) return selectedCopy.register;
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency || 'INR', maximumFractionDigits: 0 }).format(plan.basePrice);
    } catch {
      return `${plan.currency || 'INR'} ${Math.round(plan.basePrice).toLocaleString('en-IN')}`;
    }
  };

  const resetLeadOtp = () => {
    setLeadOtpToken('');
    setLeadOtp('');
    setLeadOtpVerified(false);
    setLeadOtpMasked('');
    setLeadOtpDelivery('');
  };

  const openInterest = (type: InterestType) => {
    setInterestType(type);
    setLeadError('');
    setLeadReference('');
    resetLeadOtp();
  };

  const requestLeadOtp = async () => {
    const mobile = leadState.mobile.trim();
    if (!mobile) { setLeadError('Enter the mobile number first.'); return; }
    if (!interestType) return;
    setLeadOtpBusy(true); setLeadError('');
    try {
      const purpose = interestType === 'registration' ? 'institution_registration' : 'live_demo';
      const result = await requestPublicOtp(mobile, purpose, window.location.pathname, leadState.email.trim());
      setLeadOtpToken(result.challengeToken);
      setLeadOtp('');
      setLeadOtpVerified(false);
      setLeadOtpMasked(result.maskedMobile || 'registered mobile');
      setLeadOtpDelivery(result.deliveryLabel || 'available OTP channel');
    } catch (error:any) { setLeadError(error?.message || 'OTP could not be sent.'); }
    finally { setLeadOtpBusy(false); }
  };

  const verifyLeadOtp = async () => {
    if (!leadOtpToken) { setLeadError('Request OTP first.'); return; }
    if (leadOtp.replace(/\D/g,'').length !== 6) { setLeadError('Enter the 6-digit OTP.'); return; }
    setLeadOtpBusy(true); setLeadError('');
    try {
      await verifyPublicOtp(leadOtpToken, leadOtp);
      setLeadOtpVerified(true);
    } catch (error:any) { setLeadOtpVerified(false); setLeadError(error?.message || 'OTP verification failed.'); }
    finally { setLeadOtpBusy(false); }
  };

  const runSchoolSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      finderRequestId.current += 1;
      setSchools([]);
      setFinderLoading(false);
      setFinderAttempted(false);
      setFinderError('');
      return;
    }

    const requestId = ++finderRequestId.current;
    setFinderLoading(true);
    setFinderAttempted(true);
    setFinderError('');
    try {
      const response = await fetch(`/api/public/schools?query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || selectedCopy.directoryError);
      if (requestId !== finderRequestId.current) return;
      setSchools(Array.isArray(payload.schools) ? payload.schools : []);
    } catch (error: any) {
      if (requestId !== finderRequestId.current) return;
      setSchools([]);
      setFinderError(error?.message || selectedCopy.directoryError);
    } finally {
      if (requestId === finderRequestId.current) setFinderLoading(false);
    }
  }, [selectedCopy.directoryError]);

  useEffect(() => {
    const query = finderQuery.trim();
    if (!query) {
      void runSchoolSearch('');
      return;
    }
    const timer = window.setTimeout(() => { void runSchoolSearch(query); }, 180);
    return () => window.clearTimeout(timer);
  }, [finderQuery, runSchoolSearch]);

  const findSchools = (event: React.FormEvent) => {
    event.preventDefault();
    void runSchoolSearch(finderQuery);
  };

  const openSchool = (school: PublicSchool) => {
    setRecentSchool(school);
    writeRecentPublicSchool(school);
    onOpenSchool(school.portalPath);
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

    const isDemo = interestType === 'demo';
    if (isDemo) {
      if (!leadState.institutionName.trim() || !leadState.mobile.trim() || !leadState.demoRole) {
        setLeadError('School name, role and mobile number are required.');
        return;
      }
      if (leadState.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadState.email.trim())) {
        setLeadError('Enter a valid email address or leave Email blank.');
        return;
      }
    } else {
      if (!leadState.institutionName.trim() || !leadState.contactName.trim() || !leadState.mobile.trim() || !leadState.email.trim()) {
        setLeadError(selectedCopy.requiredError);
        return;
      }
      if (!leadState.consent) {
        setLeadError(selectedCopy.authorizedError);
        return;
      }
    }

    if (!leadOtpVerified || !leadOtpToken) {
      setLeadError('Verify the contact with OTP before continuing.');
      return;
    }

    setLeadLoading(true);
    try {
      const response = await fetch('/api/public/institution-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leadState,
          interestType,
          designation: isDemo ? leadState.demoRole : leadState.designation,
          contactName: isDemo ? DEMO_ROLE_OPTIONS.find(item => item.value === leadState.demoRole)?.label || 'Demo User' : leadState.contactName,
          consent: isDemo ? true : leadState.consent,
          otpChallengeToken: leadOtpToken,
          sourcePage: window.location.pathname
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || selectedCopy.requestError);
      const referenceCode = String(payload.referenceCode || 'CLASSTAGO-REQUEST');
      setLeadReference(referenceCode);
      if (isDemo) {
        // OTP verification is the access gate. The verified lead is recorded for
        // Platform Admin follow-up, then the chosen role opens immediately.
        onOpenLiveDemo({ institutionName: leadState.institutionName.trim(), role: leadState.demoRole });
      }
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
          <a href="#top" className="flex items-center gap-3" aria-label="Classtago">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-black tracking-[0.16em]">Classtago</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-300">{selectedCopy.brandSubtitle}</div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-xs font-bold text-slate-300 lg:flex">
            <a href="#about" className="transition hover:text-cyan-300">{publicCopy.about}</a>
            <a href="#plans" className="transition hover:text-cyan-300">{planLabel}</a>
            <a href="#gallery" className="transition hover:text-cyan-300">{publicCopy.gallery}</a>
            <a href="#school-finder" className="transition hover:text-cyan-300">{selectedCopy.navFinder}</a>
            <a href="#contact" className="transition hover:text-cyan-300">{publicCopy.contact}</a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label={selectedCopy.interfaceLanguage} purpose="interface" />
            <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
            <button onClick={() => openInterest('demo')} className="ml-2 flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200"><Zap className="h-3.5 w-3.5" />Try Live Demo</button>
            <button
              onClick={platformSessionActive && onOpenPlatformConsole ? onOpenPlatformConsole : onOpenPlatformLogin}
              className="ml-2 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10"
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
              <a href="#about" onClick={() => setMobileMenu(false)}>{publicCopy.about}</a>
              <a href="#plans" onClick={() => setMobileMenu(false)}>{planLabel}</a>
              <a href="#gallery" onClick={() => setMobileMenu(false)}>{publicCopy.gallery}</a>
              <a href="#school-finder" onClick={() => setMobileMenu(false)}>{selectedCopy.navFinder}</a>
              <a href="#contact" onClick={() => setMobileMenu(false)}>{publicCopy.contact}</a>
              <div className="flex items-center gap-2 pt-2">
                <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label={selectedCopy.interfaceLanguage} purpose="interface" />
                <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
              </div>
              <button onClick={() => { setMobileMenu(false); openInterest('demo'); }} className="rounded-xl bg-cyan-300 px-4 py-3 font-black text-slate-950">Try Live Demo</button>
              <button onClick={platformSessionActive && onOpenPlatformConsole ? onOpenPlatformConsole : onOpenPlatformLogin} className="rounded-xl bg-white px-4 py-3 text-slate-950">
                {platformSessionActive ? selectedCopy.openPlatformConsole : selectedCopy.admin}
              </button>
            </div>
          </div>
        )}
      </header>

      <main id="top" className="relative z-10">
        <section id="platform" className="cs-land mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-24">
          <div>
            <div className="cs-l-chip"><Sparkles className="h-4 w-4" /> {selectedCopy.heroBadge}</div>
            <h1 className="cs-l-h1">{selectedCopy.heroTitleA}{' '}<span className="cs-l-grad">{selectedCopy.heroTitleB}</span></h1>
            <p className="cs-l-lead">{selectedCopy.heroText}</p>
            <div className="cs-l-actions">
              <button type="button" onClick={() => openInterest('registration')} className="cs-l-btn">{selectedCopy.register}<ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => openInterest('demo')} className="cs-l-btn cs-l-btn-ghost"><Zap className="h-4 w-4" />Try Live Demo</button>
            </div>
            <div className="cs-l-note"><CircleDollarSign className="h-5 w-5 shrink-0" /><div><strong>{selectedCopy.studentPricing}:</strong> {selectedCopy.studentFree}</div></div>
          </div>
          <div className="cs-l-panel">
            <div className="cs-l-panel-head">
              <div className="flex items-center gap-3">
                <div className="cs-l-logo"><LayoutDashboard className="h-5 w-5" /></div>
                <div><p className="cs-l-strong">{selectedCopy.unifiedCommand}</p><p className="cs-l-small">{selectedCopy.workspacePreview}</p></div>
              </div>
              <div className="cs-l-live"><span className="cs-l-dot" />{selectedCopy.secureCloud}</div>
            </div>
            <div className="cs-l-tiles">
              {[
                [selectedCopy.students, '2,480', UsersRound], [selectedCopy.attendance, '94.8%', BadgeCheck], [selectedCopy.classes, '48', BookOpenCheck], [selectedCopy.notices, '12', MessageSquareText]
              ].map(([label, value, Icon]: any) => (
                <div key={label} className="cs-l-tile"><Icon className="h-4 w-4" /><div className="cs-l-tile-v">{value}</div><p className="cs-l-small">{label}</p></div>
              ))}
            </div>
            <div className="cs-l-split">
              <div className="cs-l-box">
                <p className="cs-l-strong">{selectedCopy.smartTimetable}</p>
                {[82, 68, 92].map((width) => <div key={width} className="cs-l-bar"><i style={{ width: width + '%' }} /></div>)}
                <div className="cs-l-live" style={{ marginTop: '.8rem' }}><Check className="h-3.5 w-3.5" />{selectedCopy.noClashes}</div>
              </div>
              <div className="cs-l-box">
                <p className="cs-l-eyebrow">{selectedCopy.languageLayer}</p>
                <div className="cs-l-lang">English · हिन्दी</div>
                <div className="cs-l-lang" style={{ textAlign: 'right' }}>اردو · मराठी</div>
                <div className="cs-l-lang">ગુજરાતી · தமிழ்</div>
                <p className="cs-l-small" style={{ marginTop: '.6rem' }}>{selectedCopy.languageLayerText}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cs-land cs-l-stats">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-5 py-4 md:grid-cols-4 lg:px-8">
            {selectedCopy.stats.map(([value, label]) => (
              <div key={label} className="cs-l-stat"><div className="cs-l-stat-v">{value}</div><div className="cs-l-stat-l">{label}</div></div>
            ))}
          </div>
        </section>

        <section id="about" className="cs-land mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="cs-l-eyebrow">{selectedCopy.whyChoose}</p>
            <h2 className="cs-l-h2">{selectedCopy.advantagesTitle}</h2>
            <p className="cs-l-lead">{selectedCopy.advantagesText}</p>
          </div>
          <div className="cs-l-cards">
            {cards.map(({ icon: Icon, eyebrow, title, text }, cardIndex) => (
              <article key={title} className="cs-l-card">
                <div className={'cs-l-ic cs-l-ic-' + (cardIndex % 4)}><Icon className="h-6 w-6" /></div>
                <p className="cs-l-eyebrow" style={{ marginTop: '1.1rem' }}>{eyebrow}</p>
                <h3 className="cs-l-ct">{title}</h3>
                <p className="cs-l-cp">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="student-promise" className="cs-land mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="cs-l-promise">
            <div className="cs-l-promise-ic"><GraduationCap className="h-11 w-11" /></div>
            <div style={{ flex: '1 1 16rem', minWidth: 0 }}>
              <p className="cs-l-promise-eyebrow">{selectedCopy.promiseEyebrow}</p>
              <h2 className="cs-l-promise-h">{selectedCopy.promiseTitle}</h2>
              <p className="cs-l-promise-p">{selectedCopy.promiseText}</p>
              <div className="cs-l-badges">
                {selectedCopy.promiseBadges.map((item) => <span key={item} className="cs-l-badge"><Check className="h-3.5 w-3.5" />{item}</span>)}
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="cs-land mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="cs-l-head">
            <div className="max-w-3xl">
              <p className="cs-l-eyebrow">{planLabel}</p>
              <h2 className="cs-l-h2">{selectedCopy.studentPricing}</h2>
              <p className="cs-l-lead">{selectedCopy.studentFree}</p>
            </div>
            <button type="button" onClick={() => openInterest('demo')} className="cs-l-btn cs-l-btn-ghost">{selectedCopy.demo}</button>
          </div>

          {planView.launch && (
            <div className="cs-l-launch">
              <div>
                <span className="cs-l-launch-tag">{planView.launch.planName}</span>
                <div className="cs-l-launch-price">{formatPlanPrice(planView.launch)}<span>{planCycle(planView.launch) === 'monthly' ? ' / month' : ' / year'}</span></div>
                <p>{planView.launch.description || selectedCopy.advantagesText}</p>
              </div>
              <button type="button" onClick={() => openInterest('registration')} className="cs-l-launch-btn">{selectedCopy.register}<ArrowRight className="h-4 w-4" /></button>
            </div>
          )}

          {planView.tiers.some((tier) => tier.monthly && tier.annual) && (
            <div className="cs-l-toggle-wrap">
              <div className="cs-l-toggle" role="group" aria-label="Billing cycle">
                <button type="button" className={billing === 'monthly' ? 'on' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
                <button type="button" className={billing === 'annual' ? 'on' : ''} onClick={() => setBilling('annual')}>Annual{planView.freeMonths > 0 && <em>{planView.freeMonths} months free</em>}</button>
              </div>
            </div>
          )}

          <div className="cs-l-plans">
            {plansLoading && [0, 1, 2].map((item) => <div key={item} className="cs-l-skel animate-pulse" />)}
            {!plansLoading && planView.tiers.map((tier, index) => {
              const monthly = tier.monthly || null;
              const annual = tier.annual || null;
              const active = billing === 'annual' ? (annual || monthly || tier.other) : (monthly || annual || tier.other);
              if (!active) return null;
              const cycle = planCycle(active);
              const popular = planView.tiers.length > 1 && index === Math.min(1, planView.tiers.length - 1);
              const saving = cycle === 'annual' && monthly && annual && typeof monthly.basePrice === 'number' && typeof annual.basePrice === 'number' ? monthly.basePrice * 12 - annual.basePrice : 0;
              const perMonth = cycle === 'annual' && typeof active.basePrice === 'number' ? money(active.basePrice / 12, active.currency) : '';
              const bullets: string[] = [];
              if (active.moduleCount) bullets.push(active.moduleCount + ' modules included');
              if (active.trialDays) bullets.push(active.trialDays + '-day free trial');
              return (
                <article key={tier.name} className={'cs-l-plan' + (popular ? ' pop' : '')}>
                  {popular && <span className="cs-l-pop">Most popular</span>}
                  <h3 className="cs-l-plan-name">{active.planName}</h3>
                  <p className="cs-l-plan-desc">{active.description || selectedCopy.advantagesText}</p>
                  <div className="cs-l-price">{formatPlanPrice(active)}{saving > 0 && <span className="cs-l-save">Save {money(saving, active.currency)}</span>}</div>
                  <p className="cs-l-per">{cycle === 'annual' ? 'per year' + (perMonth ? ', about ' + perMonth + ' per month' : '') : cycle === 'monthly' ? 'per month' : String(active.billingCycle || '')}</p>
                  <ul className="cs-l-feats">
                    {bullets.map((item) => <li key={item}><Check className="h-4 w-4" /><span>{item}</span></li>)}
                  </ul>
                  <button type="button" onClick={() => openInterest('registration')} className="cs-l-btn">{selectedCopy.register}</button>
                </article>
              );
            })}
            {!plansLoading && plans.length === 0 && (
              <div className="cs-l-card" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
                <CircleDollarSign className="mx-auto h-8 w-8" />
                <h3 className="cs-l-ct">{selectedCopy.studentPricing}</h3>
                <p className="cs-l-cp">{selectedCopy.studentFree}</p>
                <button type="button" onClick={() => openInterest('demo')} className="cs-l-btn" style={{ marginTop: '1rem' }}>{selectedCopy.demo}</button>
              </div>
            )}
          </div>
        </section>

        <section id="gallery" className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-300">{publicCopy.gallery} · {selectedCopy.identityEyebrow}</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{selectedCopy.identityTitle}</h2>
            <p className="mt-6 text-base leading-8 text-slate-400">{selectedCopy.identityText}</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {selectedCopy.identityBenefits.map((item) => <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{item}</div>)}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-4 shadow-2xl">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-100 text-slate-950">
              <div className="flex items-center justify-between bg-white px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Building2 className="h-5 w-5" /></div><div><div className="text-sm font-black">{selectedCopy.yourSchoolName}</div><div className="text-[9px] text-slate-500">{selectedCopy.officialDigitalCampus}</div></div></div><button className="rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-bold text-white">{selectedCopy.login}</button></div>
              <div className="edx-public-dark-surface bg-gradient-to-br from-blue-700 to-indigo-900 px-6 py-12 text-center text-white"><span className="rounded-full bg-amber-300 px-3 py-1 text-[9px] font-black uppercase text-slate-950">{selectedCopy.admissionsOpen}</span><h3 className="mt-4 text-3xl font-black">{selectedCopy.learnGrowLead}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-blue-100">{selectedCopy.schoolBannerText}</p><div className="mt-5 flex justify-center gap-2"><button className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-blue-800">{selectedCopy.applyOnline}</button><button className="rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold">{selectedCopy.viewProspectus}</button></div></div>
              <div className="grid grid-cols-3 gap-3 p-5">{[[selectedCopy.notices, CalendarClock], [selectedCopy.achievements, BadgeCheck], [selectedCopy.contact, MessageSquareText]].map(([label, Icon]: any) => <div key={label} className="rounded-xl bg-white p-3 text-center shadow-sm"><Icon className="mx-auto h-5 w-5 text-blue-600" /><div className="mt-2 text-[10px] font-bold">{label}</div></div>)}</div>
            </div>
          </div>
        </section>

        <section id="school-finder" className="border-y border-white/10 bg-gradient-to-br from-cyan-400/10 to-indigo-500/10 py-24">
          <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
            <Globe2 className="mx-auto h-10 w-10 text-cyan-300" />
            <h2 className="mt-5 text-4xl font-black tracking-[-0.04em]">{selectedCopy.finderTitle}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">{selectedCopy.finderText}</p>
            {recentSchool && (
              <button type="button" onClick={() => openSchool(recentSchool)} className="mx-auto mt-6 flex w-full max-w-2xl items-center gap-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-300/20">
                <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/70 text-cyan-700 shadow-sm">{recentSchool.logoUrl ? <img src={recentSchool.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}</div>
                <div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">Recently used school</div><div className="truncate text-base font-black text-slate-900">{recentSchool.schoolName}</div><div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">{recentSchool.schoolCode}{recentSchool.city ? ` · ${recentSchool.city}` : ''}</div></div>
                <ArrowRight className="h-5 w-5 shrink-0 text-cyan-700" />
              </button>
            )}
            <form onSubmit={findSchools} className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-2xl sm:flex-row">
              <div className="relative flex-1"><Search className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={finderQuery} onChange={(event) => setFinderQuery(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 py-3.5 ps-12 pe-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" placeholder={selectedCopy.finderPlaceholder} autoComplete="off" spellCheck={false} aria-label={selectedCopy.finderPlaceholder} /></div>
              <button disabled={finderLoading || !finderQuery.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 disabled:opacity-50">{finderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{selectedCopy.finderButton}</button>
            </form>
            <div className="mx-auto mt-2 max-w-2xl text-left text-[10px] font-semibold text-slate-500">Live search starts from the first character. Your last opened school stays on this device for quick access.</div>

            {finderError && <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-200">{finderError}</div>}
            {finderAttempted && !finderLoading && !finderError && schools.length === 0 && <div className="mt-5 text-sm text-slate-400">{selectedCopy.noSchool}</div>}
            {schools.length > 0 && (
              <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
                {schools.map((school) => (
                  <button key={school.id} onClick={() => openSchool(school)} className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.08]">
                    <div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800 text-cyan-300"><Building2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="truncate text-base font-black text-white">{school.schoolName}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{school.schoolCode}{school.city ? ` · ${school.city}` : ''}</div>{school.admissionsOpen && <div className="mt-2 inline-flex rounded-full bg-emerald-300/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">{selectedCopy.admissionsOpen}{school.admissionSession ? ` · ${school.admissionSession}` : ''}</div>}<div className="mt-3 flex items-center gap-1 text-xs font-bold text-cyan-300">{selectedCopy.openWebsite}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></div></div></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
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
          <div><span className="font-black tracking-[0.16em] text-white">Classtago</span><span className="ms-3">{selectedCopy.footerSubtitle}</span></div>
          <div className="flex flex-wrap gap-5"><a href="#about" className="hover:text-cyan-300">{publicCopy.about}</a><a href="#plans" className="hover:text-cyan-300">{planLabel}</a><a href="#gallery" className="hover:text-cyan-300">{publicCopy.gallery}</a><a href="#school-finder" className="hover:text-cyan-300">{selectedCopy.navFinder}</a><a href="#contact" className="hover:text-cyan-300">{publicCopy.contact}</a><button onClick={onOpenPlatformLogin} className="hover:text-cyan-300">{selectedCopy.administratorAccess}</button></div>
          <div>© 2026 Classtago ERP</div>
        </div>
      </footer>

      {interestType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-slate-900/95 px-6 py-5 backdrop-blur-xl sm:px-8">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">{selectedCopy.onboarding}</p><h2 className="mt-1 text-2xl font-black">{interestType === 'registration' ? selectedCopy.leadTitleRegistration : 'Start Live Demo'}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{interestType === 'demo' ? 'Verify the WhatsApp mobile number with OTP and enter the selected role immediately. No manual approval or waiting.' : selectedCopy.leadText}</p></div>
              <button onClick={() => setInterestType(null)} className="ml-4 rounded-xl border border-white/10 p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label={selectedCopy.close}><X className="h-5 w-5" /></button>
            </div>

            {leadReference ? (
              <div className="p-8 text-center sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-300/10 text-emerald-300"><Check className="h-8 w-8" /></div><h3 className="mt-5 text-2xl font-black">{selectedCopy.submitted}</h3><p className="mt-3 text-sm text-slate-400">{selectedCopy.keepReference}</p><div className="mx-auto mt-5 max-w-sm rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 font-mono text-base font-black tracking-wider text-cyan-200">{leadReference}</div><button onClick={() => setInterestType(null)} className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-black text-slate-950">{selectedCopy.close}</button></div>
            ) : (
              <form onSubmit={submitLead} className="space-y-6 p-6 sm:p-8">
                {interestType === 'demo' ? (<>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">School Name *</span><input type="text" value={leadState.institutionName} onChange={(event) => setLeadState((current) => ({ ...current, institutionName: event.target.value }))} placeholder="School Name" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.07]" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Role *</span><select value={leadState.demoRole} onChange={(event) => setLeadState((current) => ({ ...current, demoRole: event.target.value as DemoRole }))} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">{DEMO_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Mobile Number (WhatsApp) *</span><input type="tel" value={leadState.mobile} onChange={(event) => { setLeadState((current) => ({ ...current, mobile: event.target.value })); resetLeadOtp(); }} placeholder="+91…" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.07]" /></label>
                    <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">Email <span className="font-semibold text-slate-500">(Optional)</span></span><input type="email" value={leadState.email} onChange={(event) => { setLeadState((current) => ({ ...current, email: event.target.value })); resetLeadOtp(); }} placeholder="name@example.com" className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.07]" /></label>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                    <div className="flex items-start gap-3"><div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-300"><KeyRound className="h-4 w-4" /></div><div><div className="text-xs font-black text-white">OTP Verification *</div><p className="mt-1 text-[10px] leading-5 text-slate-400">OTP uses SMS and WhatsApp when available. Email is an optional backup, so an unavailable SMS plan does not have to stop demo access.</p></div></div>
                    {!leadOtpToken ? (
                      <button type="button" onClick={() => void requestLeadOtp()} disabled={leadOtpBusy || !leadState.mobile.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{leadOtpBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <KeyRound className="h-4 w-4"/>}Send OTP</button>
                    ) : leadOtpVerified ? (
                      <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-xs font-black text-emerald-200"><div className="flex items-center gap-2"><Check className="h-4 w-4"/>Contact verified {leadOtpMasked ? `(${leadOtpMasked})` : ''}</div>{leadOtpDelivery && <div className="mt-1 text-[9px] font-bold text-emerald-100/80">OTP delivery: {leadOtpDelivery}</div>}</div>
                    ) : (<>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input inputMode="numeric" maxLength={6} value={leadOtp} onChange={e=>setLeadOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-sm font-black tracking-[0.25em] text-white outline-none focus:border-cyan-300/50"/><button type="button" onClick={() => void verifyLeadOtp()} disabled={leadOtpBusy || leadOtp.length !== 6} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{leadOtpBusy?'Verifying…':'Verify OTP'}</button><button type="button" onClick={() => void requestLeadOtp()} disabled={leadOtpBusy} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-slate-300 disabled:opacity-40">Resend</button></div>
                      {leadOtpDelivery && <div className="mt-2 text-[9px] font-bold text-cyan-200/80">OTP sent/queued via: {leadOtpDelivery}. Email remains optional.</div>}
                    </>)}
                  </div>

                  <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={leadState.website} onChange={(event) => setLeadState((current) => ({ ...current, website: event.target.value }))} className="hidden" />
                  {leadError && <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-xs font-semibold leading-5 text-rose-200">{leadError}</div>}
                  <button type="submit" disabled={leadLoading || !leadOtpVerified} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">{leadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{leadLoading ? 'Starting…' : 'Start Live Demo'}</button>
                  <p className="text-center text-[10px] leading-5 text-slate-500">No manual approval or waiting. After OTP verification, the selected role opens directly in the isolated demo environment.</p>
                </>) : (<>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    [selectedCopy.institutionName, 'institutionName', 'text', selectedCopy.institutionName], [selectedCopy.institutionType, 'institutionType', 'text', selectedCopy.institutionType],
                    [selectedCopy.cityDistrict, 'city', 'text', selectedCopy.cityDistrict], [selectedCopy.state, 'state', 'text', selectedCopy.state],
                    [selectedCopy.authorizedContact, 'contactName', 'text', selectedCopy.authorizedContact], [selectedCopy.designation, 'designation', 'text', selectedCopy.designation],
                    [selectedCopy.mobile, 'mobile', 'tel', '+91…'], [selectedCopy.officialEmail, 'email', 'email', 'name@institution.org'],
                    [selectedCopy.approxStudents, 'studentCount', 'number', '1200'], [selectedCopy.approxStaff, 'staffCount', 'number', '75']
                  ].map(([label, key, type, placeholder]) => (
                    <label key={key} className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">{label}{['institutionName','contactName','mobile','email'].includes(key) ? ' *' : ''}</span><input type={type} min={type === 'number' ? 0 : undefined} value={(leadState as any)[key]} onChange={(event) => { setLeadState((current) => ({ ...current, [key]: event.target.value })); if (key === 'mobile' || key === 'email') resetLeadOtp(); }} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.07]" /></label>
                  ))}
                </div>

                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                  <div className="flex items-start gap-3"><div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-300"><KeyRound className="h-4 w-4" /></div><div><div className="text-xs font-black text-white">Contact OTP verification *</div><p className="mt-1 text-[10px] leading-5 text-slate-400">OTP uses Classtago multi-channel delivery: SMS + WhatsApp when available, with Email as an optional backup. An exhausted/offline SIM does not block OTP when another configured channel succeeds.</p></div></div>
                  {!leadOtpToken ? (
                    <button type="button" onClick={() => void requestLeadOtp()} disabled={leadOtpBusy || !leadState.mobile.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{leadOtpBusy ? <Loader2 className="h-4 w-4 animate-spin"/> : <KeyRound className="h-4 w-4"/>}Send OTP</button>
                  ) : leadOtpVerified ? (
                    <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2.5 text-xs font-black text-emerald-200"><div className="flex items-center gap-2"><Check className="h-4 w-4"/>Contact verified {leadOtpMasked ? `(${leadOtpMasked})` : ''}</div>{leadOtpDelivery && <div className="mt-1 text-[9px] font-bold text-emerald-100/80">OTP delivery: {leadOtpDelivery}</div>}</div>
                  ) : (<>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input inputMode="numeric" maxLength={6} value={leadOtp} onChange={e=>setLeadOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 font-mono text-sm font-black tracking-[0.25em] text-white outline-none focus:border-cyan-300/50"/><button type="button" onClick={() => void verifyLeadOtp()} disabled={leadOtpBusy || leadOtp.length !== 6} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40">{leadOtpBusy?'Verifying…':'Verify OTP'}</button><button type="button" onClick={() => void requestLeadOtp()} disabled={leadOtpBusy} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-slate-300 disabled:opacity-40">Resend</button></div>
                    {leadOtpDelivery && <div className="mt-2 text-[9px] font-bold text-cyan-200/80">OTP sent/queued via: {leadOtpDelivery}. Email remains optional.</div>}
                  </>)}
                </div>

                <div><div className="mb-3 text-xs font-bold text-slate-300">{selectedCopy.modulesInterest}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{MODULE_OPTIONS.map((moduleName) => { const selected = leadState.requestedModules.includes(moduleName); return <button key={moduleName} type="button" onClick={() => toggleModule(moduleName)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${selected ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20'}`}><span className={`grid h-4 w-4 place-items-center rounded border ${selected ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-600'}`}>{selected && <Check className="h-3 w-3" />}</span>{selectedCopy.moduleLabels[moduleName] || moduleName}</button>; })}</div></div>

                <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-300">{selectedCopy.additionalRequirements}</span><textarea rows={3} value={leadState.message} onChange={(event) => setLeadState((current) => ({ ...current, message: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50" placeholder={selectedCopy.additionalPlaceholder} /></label>

                <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={leadState.website} onChange={(event) => setLeadState((current) => ({ ...current, website: event.target.value }))} className="hidden" />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4"><input type="checkbox" checked={leadState.consent} onChange={(event) => setLeadState((current) => ({ ...current, consent: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-cyan-300" /><span className="text-xs leading-5 text-slate-400">{selectedCopy.consent}</span></label>

                {leadError && <div role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-xs font-semibold leading-5 text-rose-200">{leadError}</div>}
                <button disabled={leadLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">{leadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{leadLoading ? selectedCopy.submitting : interestType === 'registration' ? selectedCopy.submitRegistration : selectedCopy.requestDemo}</button>

                </>)}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
