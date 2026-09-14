/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Bot, Database, Sparkles, X, Shield, ShieldCheck,
  BookOpen, Calendar, Users, FileText, ClipboardList, Settings, Landmark, CheckCircle2, Loader2
} from 'lucide-react';
import { Language, User, Notice } from './types';
import { translations } from './lib/translations';
import { LocalERPDatabase, supabase } from './lib/supabase';
import { AuthService } from './lib/authService';
import TopBar from './components/TopBar';
import UrduWrapper from './components/UrduWrapper';
import SmartPrintCenter from './components/SmartPrintCenter';
import GlobalActionConfirm from './components/GlobalActionConfirm';
import AppearanceSwitcher from './components/AppearanceSwitcher';
import { FALLBACK_LANGUAGE_CATALOGUE, LanguageOption, getLanguageOption, normalizeLanguageCode, resolvedDirection } from './lib/languageCatalog';
import { FALLBACK_FONT_CATALOGUE, FontOption, ensureWebFontLoaded, fontCssStack, getFontsForLanguage, normalizeFontCode, resolveFont } from './lib/fontCatalog';
import { EdunixoAppearance, persistAppearance, readStoredAppearance } from './lib/appearance';
import { IS_EDUNIXO_APP_RUNTIME, IS_EDUNIXO_NATIVE_APP, EDUNIXO_MOBILE_SCHOOL_NAME } from './lib/mobileRuntime';


// R33.16 performance: large route/view surfaces are loaded only when the user
// actually opens them. Previously the public website downloaded and parsed the
// entire ERP dashboard/module graph before it could become interactive.
const SchoolPortalResolver = React.lazy(() => import('./components/SchoolPortalResolver'));
const LoginSection = React.lazy(() => import('./components/LoginSection'));
const DashboardOverview = React.lazy(() => import('./components/DashboardOverview'));
const DatabaseSettings = React.lazy(() => import('./components/DatabaseSettings'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
const PlatformAdminPortal = React.lazy(() => import('./components/PlatformAdminPortal'));
const EdunixoPlatformLanding = React.lazy(() => import('./components/EdunixoPlatformLanding'));
const PlatformAdminLogin = React.lazy(() => import('./components/PlatformAdminLogin'));
const MobilePlatformGateway = React.lazy(() => import('./components/MobilePlatformGateway'));

function ViewLoadingFallback({ label = 'Loading workspace…' }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] items-center justify-center p-8 text-center">
      <div>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
        <p className="mt-3 text-xs font-bold tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}

type PublicPortal = 'platform' | 'school';

function readAppSchoolBrand(): { schoolName: string; schoolCode: string; tagline?: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('edunixo.app.recentSchool') || window.localStorage.getItem('edunixo.mobile.recentSchool');
    if (!raw) return null;
    const school = JSON.parse(raw);
    if (!school?.schoolName || !school?.schoolCode) return null;
    return { schoolName: String(school.schoolName), schoolCode: String(school.schoolCode), tagline: school.tagline || null };
  } catch {
    return null;
  }
}

function detectPublicPortal(): PublicPortal {
  if (typeof window === 'undefined') return 'platform';
  return window.location.pathname.toLowerCase().startsWith('/school/') ? 'school' : 'platform';
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => normalizeLanguageCode(localStorage.getItem('edunixo.interface_language')));
  const [user, setUser] = useState<User | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'website' | 'erp' | 'database'>(() => 'website');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPlatformLogin, setShowPlatformLogin] = useState(false);
  const [publicPortal, setPublicPortal] = useState<PublicPortal>(() => detectPublicPortal());
  const [publicSchoolBrand, setPublicSchoolBrand] = useState<{ schoolName: string; schoolCode: string; tagline?: string | null } | null>(() => IS_EDUNIXO_APP_RUNTIME ? readAppSchoolBrand() : null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [showAssistant, setShowAssistant] = useState(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(() => localStorage.getItem('isDeveloperMode') === 'true');
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>(FALLBACK_LANGUAGE_CATALOGUE);
  const [languagesLoading, setLanguagesLoading] = useState(true);
  const [fontOptions, setFontOptions] = useState<FontOption[]>(FALLBACK_FONT_CATALOGUE);
  const [interfaceFontCode, setInterfaceFontCode] = useState<string>(() => normalizeFontCode(localStorage.getItem('edunixo.interface_font')) || 'noto-sans');
  const [fontsLoading, setFontsLoading] = useState(true);
  const [appearance, setAppearance] = useState<EdunixoAppearance>(() => IS_EDUNIXO_APP_RUNTIME ? 'light' : readStoredAppearance());

  // R33.12 global numeric-entry UX: when a number field receives focus,
  // select its current value so typing replaces the old/default value instead of
  // appending beside a stubborn trailing 0. This applies across the ERP without
  // changing the stored numeric types or validation rules of individual modules.
  useEffect(() => {
    const handleNumberFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'number' || target.disabled || target.readOnly) return;
      window.setTimeout(() => {
        try { target.select(); } catch {}
      }, 0);
    };
    document.addEventListener('focusin', handleNumberFocus);
    return () => document.removeEventListener('focusin', handleNumberFocus);
  }, []);

  useEffect(() => {
    const effectiveAppearance: EdunixoAppearance = IS_EDUNIXO_APP_RUNTIME ? 'light' : appearance;
    if (IS_EDUNIXO_APP_RUNTIME && appearance !== 'light') setAppearance('light');
    persistAppearance(effectiveAppearance);
    document.documentElement.dataset.edunixoTheme = effectiveAppearance;
    document.documentElement.style.colorScheme = 'light';
  }, [appearance]);

  // Load notices and restore session on initial mount
  const refreshNotices = () => {
    setNotices(LocalERPDatabase.getNotices());
    setDeveloperMode(localStorage.getItem('isDeveloperMode') === 'true');
  };

  useEffect(() => {
    refreshNotices();

    // Restore session from Supabase auth
    AuthService.restoreSession().then(res => {
      if (res?.user) {
        setUser(res.user);
        setSchoolId(res.schoolId);
        setCurrentView('erp');
      }
      setIsAuthInitializing(false);
    }).catch(err => {
      console.warn("Session restore failed:", err);
      setIsAuthInitializing(false);
    });

    // Subscribe to auth changes
    const { data: authListener } = AuthService.onAuthStateChange((authenticatedUser, authenticatedSchoolId) => {
      if (authenticatedUser) {
        setUser(authenticatedUser);
        setSchoolId(authenticatedSchoolId);
        setCurrentView('erp');
      } else {
        setUser(null);
        setSchoolId(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // R14 shared profile state: profile edits happen inside the role dashboard, but
  // TopBar and every other role surface receive the same authenticated User object.
  // Merge successful cloud profile updates immediately instead of waiting for logout/reload.
  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ user?: User }>).detail;
      const updated = detail?.user;
      if (!updated?.id) return;
      setUser(current => current && current.id === updated.id ? { ...current, ...updated } : current);
    };
    window.addEventListener('edunixo_profile_updated', handleProfileUpdated as EventListener);
    return () => window.removeEventListener('edunixo_profile_updated', handleProfileUpdated as EventListener);
  }, []);

  useEffect(() => {
    const handleHistoryChange = () => {
      setPublicPortal(detectPublicPortal());
      if (!user) setCurrentView('website');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', handleHistoryChange);
    return () => window.removeEventListener('popstate', handleHistoryChange);
  }, [user]);

  const openSchoolPortal = (portalPath: string) => {
    const safePath = portalPath.startsWith('/school/') ? portalPath : `/school/${encodeURIComponent(portalPath)}`;
    window.history.pushState({}, '', safePath);
    setPublicPortal('school');
    setPublicSchoolBrand(null);
    setCurrentView('website');
    setShowLoginModal(false);
    setShowPlatformLogin(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPlatformWebsite = () => {
    window.history.pushState({}, '', '/');
    setPublicPortal('platform');
    setPublicSchoolBrand(null);
    setCurrentView('website');
    setShowLoginModal(false);
    setShowPlatformLogin(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load the live database-driven language catalogue. A school can select any
  // active language unless it intentionally narrows its own language policy.
  useEffect(() => {
    let cancelled = false;

    const loadLanguageContext = async () => {
      setLanguagesLoading(true);
      setFontsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const useSchoolContext = Boolean(user && user.role !== 'super_admin' && schoolId && session?.access_token);
        const response = await fetch(useSchoolContext ? '/api/me/language-context' : '/api/public/languages', {
          headers: useSchoolContext ? { Authorization: `Bearer ${session!.access_token}` } : undefined
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Language catalogue could not be loaded.');
        if (cancelled) return;

        const options: LanguageOption[] = Array.isArray(payload.languages) && payload.languages.length
          ? payload.languages.map((row: any) => ({
              id: row.id,
              code: normalizeLanguageCode(row.code || row.languageCode),
              englishName: String(row.englishName || row.english_name || row.code || 'Language'),
              nativeName: String(row.nativeName || row.native_name || row.englishName || row.code || 'Language'),
              scriptCode: String(row.scriptCode || row.script_code || 'Zyyy'),
              direction: row.direction === 'rtl' ? 'rtl' : row.direction === 'auto' ? 'auto' : 'ltr',
              localeCode: row.localeCode || row.locale_code || null,
              isPreferred: row.isPreferred === true,
              purposes: row.purposes
            }))
          : FALLBACK_LANGUAGE_CATALOGUE;

        const liveFonts: FontOption[] = Array.isArray(payload.fonts) && payload.fonts.length
          ? payload.fonts.map((row: any) => ({
              id: row.id,
              code: normalizeFontCode(row.code || row.fontCode),
              family: String(row.family || row.familyName || row.cssFamily || 'Noto Sans'),
              displayName: String(row.displayName || row.name || row.family || 'Font'),
              category: ['serif', 'nastaliq', 'naskh'].includes(row.category) ? row.category : 'sans',
              googleFamily: row.googleFamily || row.google_family || row.family || null,
              scripts: Array.isArray(row.scripts) ? row.scripts : [],
              usages: Array.isArray(row.usages) ? row.usages : ['interface', 'academic', 'document'],
              recommendedFor: Array.isArray(row.recommendedFor) ? row.recommendedFor : [],
              sortOrder: Number(row.sortOrder || 1000)
            }))
          : FALLBACK_FONT_CATALOGUE;

        setLanguageOptions(options);
        setFontOptions(liveFonts);
        const localPreference = normalizeLanguageCode(localStorage.getItem('edunixo.interface_language'));
        const preferred = normalizeLanguageCode(payload.preferredLanguageCode || localPreference || payload.defaultInterfaceLanguageCode || 'en');
        const selected = options.some(option => option.code === preferred) ? preferred : (options[0]?.code || 'en');
        setLang(selected);
        localStorage.setItem('edunixo.interface_language', selected);

        const fontStorageKey = user?.id ? `edunixo.interface_font.${user.id}` : 'edunixo.interface_font';
        const localFont = normalizeFontCode(localStorage.getItem(fontStorageKey) || localStorage.getItem('edunixo.interface_font'));
        const selectedFont = resolveFont(payload.preferredInterfaceFontCode || localFont, selected, 'interface', options, liveFonts);
        setInterfaceFontCode(selectedFont.code);
        ensureWebFontLoaded(selectedFont);
        localStorage.setItem(fontStorageKey, selectedFont.code);
        localStorage.setItem('edunixo.interface_font', selectedFont.code);
      } catch (error) {
        console.warn('Live language catalogue unavailable; using safe multilingual bootstrap catalogue.', error);
        if (!cancelled) {
          setLanguageOptions(FALLBACK_LANGUAGE_CATALOGUE);
          setFontOptions(FALLBACK_FONT_CATALOGUE);
        }
      } finally {
        if (!cancelled) {
          setLanguagesLoading(false);
          setFontsLoading(false);
        }
      }
    };

    void loadLanguageContext();
    const reloadLanguageContext = () => { void loadLanguageContext(); };
    window.addEventListener('school_languages_updated', reloadLanguageContext);
    return () => {
      cancelled = true;
      window.removeEventListener('school_languages_updated', reloadLanguageContext);
    };
  }, [user?.id, user?.role, schoolId]);

  const saveInterfacePreference = async (languageCode: Language, fontCode: string) => {
    if (!user || user.role === 'super_admin' || !schoolId) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const [languageResponse, fontResponse] = await Promise.all([
      fetch('/api/me/language-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferenceType: 'interface', languageCode })
      }),
      fetch('/api/me/font-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferenceType: 'interface', languageCode, fontCode })
      })
    ]);
    if (!languageResponse.ok || !fontResponse.ok) console.warn('Interface preference was applied locally but could not be fully synchronized.');
  };

  const applyInterfaceFont = (fontCode: string, languageCode: Language = lang) => {
    const selectedFont = resolveFont(fontCode, languageCode, 'interface', languageOptions, fontOptions);
    setInterfaceFontCode(selectedFont.code);
    ensureWebFontLoaded(selectedFont);
    const fontStorageKey = user?.id ? `edunixo.interface_font.${user.id}` : 'edunixo.interface_font';
    localStorage.setItem(fontStorageKey, selectedFont.code);
    localStorage.setItem('edunixo.interface_font', selectedFont.code);
    return selectedFont;
  };

  const handleLanguageChange = (selected: Language) => {
    const normalized = normalizeLanguageCode(selected);
    setLang(normalized);
    localStorage.setItem('edunixo.interface_language', normalized);
    const selectedFont = applyInterfaceFont(interfaceFontCode, normalized);
    void saveInterfacePreference(normalized, selectedFont.code).catch(() => undefined);
  };

  const handleInterfaceFontChange = (fontCode: string) => {
    const selectedFont = applyInterfaceFont(fontCode, lang);
    void saveInterfacePreference(lang, selectedFont.code).catch(() => undefined);
  };

  const resetErpNavigationUrl = () => {
    // A logout/login cycle must never reopen the previously focused module.
    // Preserve the selected school portal path, but clear module/search/hash state.
    const pathname = window.location.pathname || '/';
    window.history.replaceState({}, '', pathname);
  };

  const handleLoginSuccess = (authenticatedUser: User) => {
    resetErpNavigationUrl();
    setUser(authenticatedUser);
    setShowLoginModal(false);
    setShowPlatformLogin(false);
    if (authenticatedUser.role === 'super_admin') {
      window.history.replaceState({}, '', '/');
      setPublicPortal('platform');
    }
    setCurrentView('erp');
    LocalERPDatabase.addAuditLog(
      authenticatedUser.id, 
      authenticatedUser.name, 
      authenticatedUser.role, 
      'USER_LOGIN', 
      'Authentication', 
      'Logged in successfully via secure credential flow'
    );
  };

  const handleLogout = async () => {
    const exitingRole = user?.role;
    if (user) {
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'USER_LOGOUT',
        'Authentication',
        'Logged out of secure academic session'
      );
    }
    await AuthService.logout();
    resetErpNavigationUrl();
    setUser(null);
    setSchoolId(null);
    setCurrentView('website');
    if (exitingRole === 'super_admin') {
      window.history.replaceState({}, '', '/');
      setPublicPortal('platform');
    } else {
      setPublicPortal(detectPublicPortal());
    }
  };

  const t = translations[lang];
  const selectedLanguage = getLanguageOption(lang, languageOptions);
  const isRtl = resolvedDirection(selectedLanguage) === 'rtl';
  const interfaceFonts = getFontsForLanguage(lang, 'interface', languageOptions, fontOptions);
  const activeInterfaceFont = resolveFont(interfaceFontCode, lang, 'interface', languageOptions, fontOptions);
  const schoolPortalIdentifier = (() => {
    const match = window.location.pathname.match(/^\/school\/([^/]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  })();


  if (isAuthInitializing) {
    return (
      <div className={IS_EDUNIXO_APP_RUNTIME ? 'edx-mobile-splash' : 'min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4'}>
        <div className={IS_EDUNIXO_APP_RUNTIME ? 'edx-mobile-splash-mark' : ''}>
          <GraduationCap className={IS_EDUNIXO_APP_RUNTIME ? 'h-9 w-9' : 'hidden'} />
        </div>
        <Loader2 className={IS_EDUNIXO_APP_RUNTIME ? 'mt-6 h-6 w-6 animate-spin text-violet-600' : 'w-10 h-10 animate-spin text-emerald-400 mb-4'} />
        <h2 className={IS_EDUNIXO_APP_RUNTIME ? 'mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950' : 'text-xl font-bold tracking-[0.16em]'}>EDUNIXO</h2>
        <p className={IS_EDUNIXO_APP_RUNTIME ? 'mt-1 text-xs font-bold tracking-[0.08em] text-slate-500' : 'text-sm text-slate-400 mt-1'}>Restoring secure school session…</p>
      </div>
    );
  }

  return (
    <div
      className={`edunixo-interface-root edunixo-theme-root min-h-screen flex flex-col transition-all selection:bg-cyan-200 ${IS_EDUNIXO_APP_RUNTIME ? 'edunixo-mobile-runtime edunixo-responsive-app' : ''} ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}
      style={{ fontFamily: fontCssStack(activeInterfaceFont), '--edunixo-interface-font': fontCssStack(activeInterfaceFont) } as React.CSSProperties}
      data-interface-language={lang}
      data-interface-font={activeInterfaceFont.code}
      data-edunixo-theme={IS_EDUNIXO_APP_RUNTIME ? 'light' : appearance}
    >
      
      {/* School / authenticated workspace header. The EDUNIXO public platform has its own distinct navigation. */}
      {currentView !== 'website' && (!IS_EDUNIXO_APP_RUNTIME || Boolean(user)) && (
      <TopBar 
        lang={lang}
        onLangChange={handleLanguageChange}
        languages={languageOptions}
        languagesLoading={languagesLoading}
        interfaceFontCode={activeInterfaceFont.code}
        interfaceFonts={interfaceFonts}
        fontsLoading={fontsLoading}
        onInterfaceFontChange={handleInterfaceFontChange}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenDatabase={() => setCurrentView('database')}
        schoolName={IS_EDUNIXO_APP_RUNTIME ? (publicSchoolBrand?.schoolName || EDUNIXO_MOBILE_SCHOOL_NAME) : (publicSchoolBrand?.schoolName || (publicPortal === 'school' ? 'EDUNIXO School Portal' : undefined))}
        schoolSubtitle={IS_EDUNIXO_APP_RUNTIME ? (publicSchoolBrand?.schoolCode || (IS_EDUNIXO_NATIVE_APP ? 'Secure mobile workspace' : 'Secure cloud workspace')) : (publicSchoolBrand?.tagline || publicSchoolBrand?.schoolCode || (publicPortal === 'school' ? 'Verifying school identity…' : undefined))}
        currentView={currentView}
        mobileApp={IS_EDUNIXO_APP_RUNTIME}
        onNavigate={(view) => {
          if (view === 'erp' && !user) {
            setShowLoginModal(true);
          } else {
            setCurrentView(view);
          }
        }}
      />
      )}

      {/* Main Container Layout */}
      <main className={IS_EDUNIXO_APP_RUNTIME
        ? `edx-mobile-main flex-1 w-full mx-auto ${currentView === 'erp' ? 'max-w-[100rem]' : 'max-w-7xl'}`
        : currentView === 'website'
          ? 'flex-1 w-full'
          : `flex-1 w-full mx-auto px-3 sm:px-5 py-5 sm:py-7 ${currentView === 'erp' && user?.role !== 'super_admin' ? 'max-w-[100rem]' : 'max-w-7xl'}`}>

        <React.Suspense fallback={<ViewLoadingFallback />}>
        {/* Responsive ERP app entry: same launcher on PC browser, mobile browser and native packaging. */}
        {IS_EDUNIXO_APP_RUNTIME && currentView === 'website' && !user && (
          <MobilePlatformGateway lang={lang} onLoginSuccess={handleLoginSuccess} onSchoolSelected={(school) => setPublicSchoolBrand({ schoolName: school.schoolName, schoolCode: school.schoolCode, tagline: school.tagline || null })} />
        )}

        {/* EDUNIXO Corporate Platform Frontend */}
        {!IS_EDUNIXO_APP_RUNTIME && currentView === 'website' && publicPortal === 'platform' && (
          <EdunixoPlatformLanding
            lang={lang}
            onLangChange={handleLanguageChange}
            languages={languageOptions}
            languagesLoading={languagesLoading}
            interfaceFontCode={activeInterfaceFont.code}
            interfaceFonts={interfaceFonts}
            fontsLoading={fontsLoading}
            onInterfaceFontChange={handleInterfaceFontChange}
            onOpenPlatformLogin={() => setShowPlatformLogin(true)}
            onOpenSchool={openSchoolPortal}
            platformSessionActive={user?.role === 'super_admin'}
            onOpenPlatformConsole={() => setCurrentView('erp')}
          />
        )}
        
        {/* VIEW 1: Official Front-Facing School Website */}
        {!IS_EDUNIXO_APP_RUNTIME && currentView === 'website' && publicPortal === 'school' && (
          <SchoolPortalResolver
            identifier={schoolPortalIdentifier}
            lang={lang}
            languages={languageOptions}
            languagesLoading={languagesLoading}
            onLangChange={handleLanguageChange}
            notices={notices}
            onBackToPlatform={openPlatformWebsite}
            onResolvedSchool={setPublicSchoolBrand}
            onOpenERP={() => {
              if (user) {
                setCurrentView('erp');
              } else {
                setShowLoginModal(true);
              }
            }}
          />
        )}

        {/* VIEW 2A: Global Super Admin Platform Control */}
        {currentView === 'erp' && user?.role === 'super_admin' && (
          <PlatformAdminPortal lang={lang} user={user} />
        )}

        {/* VIEW 2B: Secure School ERP Dashboard Shell */}
        {currentView === 'erp' && user && user.role !== 'super_admin' && (
          <div className="edunixo-premium-erp edunixo-erp-shell relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_8%_4%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_94%_8%,rgba(139,92,246,.15),transparent_34%),linear-gradient(145deg,#071021,#050815_48%,#0a0920)] p-3 shadow-[0_45px_140px_rgba(0,0,0,.45)] sm:rounded-[2.6rem] sm:p-5">
            <div className="edunixo-erp-grid pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.32)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.32)_1px,transparent_1px)] [background-size:46px_46px]" />
            <div className="edunixo-erp-command-banner relative mb-4 flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 text-white backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-400 text-slate-950 shadow-lg"><Shield className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">EDUNIXO School Command Center</p><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">Role verified</span></div><h2 className="mt-1 text-lg font-black tracking-tight sm:text-xl">Welcome back, {user.name}</h2><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{user.role.replaceAll('_', ' ')} workspace · school data isolated</p></div></div>
              <div className="flex flex-wrap items-center gap-2">{!IS_EDUNIXO_APP_RUNTIME && <AppearanceSwitcher value={appearance} onChange={setAppearance} compact />}<button onClick={() => setShowAssistant(!showAssistant)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-white transition hover:border-cyan-300/30 hover:bg-cyan-300/10"><Bot className="h-4 w-4 text-cyan-300" />{showAssistant ? 'Close AI Assistant' : 'Open AI Assistant'}</button>{developerMode && <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-mono text-slate-400">AUTH: SUPABASE · {schoolId ? 'SCHOOL LOCKED' : 'CHECKING'}</div>}</div>
            </div>

            <div className={`relative grid gap-5 ${showAssistant ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1'}`}>
              <div className="min-w-0"><DashboardOverview lang={lang} user={user} onRefreshData={refreshNotices} /></div>
              {showAssistant && <aside className="no-print animate-fade-in"><div className="sticky top-28 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white shadow-2xl"><AIAssistant lang={lang} /></div></aside>}
            </div>
          </div>
        )}

        {/* VIEW 3: Global Database Credentials Setup */}
        {currentView === 'database' && (
          <DatabaseSettings 
            lang={lang}
            onConfigChange={refreshNotices}
          />
        )}
        </React.Suspense>

      </main>

      {!IS_EDUNIXO_APP_RUNTIME && (currentView === 'website' || currentView === 'database' || user?.role === 'super_admin') && (
        <div className="edx-public-theme-control fixed bottom-4 left-4 z-[80] no-print sm:bottom-6 sm:left-6">
          <AppearanceSwitcher value={appearance} onChange={setAppearance} />
        </div>
      )}

      {/* Floating global assistant button (Website view only, No-Print) */}
      {!IS_EDUNIXO_APP_RUNTIME && currentView === 'website' && publicPortal === 'school' && Boolean(user) && (
        <div className="fixed bottom-6 right-6 z-50 no-print">
          {showAssistant ? (
            <div className="w-80 md:w-96 shadow-2xl rounded-2xl overflow-hidden animate-slide-up border border-slate-200">
              <div className="absolute top-3.5 right-3.5 z-50">
                <button
                  onClick={() => setShowAssistant(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <React.Suspense fallback={<ViewLoadingFallback label="Opening assistant…" />}>
                <AIAssistant lang={lang} />
              </React.Suspense>
            </div>
          ) : (
            <button
              onClick={() => setShowAssistant(true)}
              id="btn-floating-ai"
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer font-semibold text-xs border border-blue-500"
            >
              <Bot className="w-4 h-4 text-blue-200" />
              <span>NHS Assistant</span>
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            </button>
          )}
        </div>
      )}

      {/* Footer Block: platform landing owns its footer; school and authenticated workspaces use contextual identity. */}
      {!IS_EDUNIXO_APP_RUNTIME && currentView !== 'website' && (
        <footer className={`edunixo-context-footer mt-10 border-t py-6 no-print ${currentView === 'erp' && user?.role !== 'super_admin' ? 'border-white/10 bg-[#040714] text-slate-500' : 'border-slate-200 bg-white'}`}>
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-sans">
            <div>
              {user?.role === 'super_admin'
                ? '© 2026 EDUNIXO ERP. Platform Administration.'
                : '© 2026 National High School, Taloda. All Rights Reserved.'}
            </div>
            <div className="flex gap-4">
              {user?.role === 'super_admin' ? (
                <>
                  <button onClick={openPlatformWebsite} className="hover:text-cyan-700">Platform Website</button>
                  <span>Secure Multi-School Control</span>
                </>
              ) : (
                <>
                  <span>School Digital Campus</span>
                  <span>Powered by EDUNIXO ERP</span>
                </>
              )}
            </div>
          </div>
        </footer>
      )}

      <SmartPrintCenter />
      <GlobalActionConfirm />

      {/* EDUNIXO PLATFORM ADMIN LOGIN */}
      {showPlatformLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md no-print">
          <div className="relative w-full max-w-lg">
            <button
              onClick={() => setShowPlatformLogin(false)}
              className="absolute right-4 top-4 z-50 rounded-xl bg-slate-100 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900"
              aria-label="Close platform login"
            >
              <X className="h-4 w-4" />
            </button>
            <React.Suspense fallback={<ViewLoadingFallback label="Opening secure login…" />}><PlatformAdminLogin onLoginSuccess={handleLoginSuccess} /></React.Suspense>
          </div>
        </div>
      )}

      {/* SCHOOL ERP LOGIN OVERLAY MODAL */}
      {showLoginModal && publicPortal === 'school' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in no-print">
          <div className="relative w-full max-w-lg bg-slate-50/20 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 z-50 p-1.5 text-slate-400 hover:text-slate-700 bg-white/60 hover:bg-white rounded-md transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="p-4 overflow-y-auto max-h-[90vh]">
              <React.Suspense fallback={<ViewLoadingFallback label="Opening school login…" />}>
                <LoginSection 
                  lang={lang}
                  onLoginSuccess={handleLoginSuccess}
                  schoolCode={publicSchoolBrand?.schoolCode || undefined}
                  schoolName={publicSchoolBrand?.schoolName || undefined}
                />
              </React.Suspense>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
