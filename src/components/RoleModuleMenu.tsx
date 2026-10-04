/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  BadgeHelp,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Fingerprint,
  LayoutGrid,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  Minus,
  Plus,
  Search,
  Scale,
  ShieldCheck,
  X
} from 'lucide-react';
import { AuthService } from '../lib/authService';
import {
  CanonicalDashboardTab,
  getRoleModuleCatalogue,
  RoleModuleCategory,
  RoleVisibleModule,
  RoleModuleFeature
} from '../lib/roleModuleBlueprint';

interface RoleModuleMenuProps {
  role: string;
  lang: string;
  isClassTeacher: boolean;
  activeTab: CanonicalDashboardTab;
  activeModuleId?: string | null;
  canAccess: (tab: CanonicalDashboardTab) => boolean;
  onOpenModule: (module: RoleVisibleModule) => void;
  onOpenFeature: (module: RoleVisibleModule, feature: RoleModuleFeature) => void;
  hiddenFeatureIds?: string[];
}

const uiCopy: Record<string, Record<string, string>> = {
  en: {
    openMenu: 'Open modules',
    menu: 'Modules',
    roleWorkspace: 'Role workspace',
    search: 'V10 · Search modules or features...',
    available: 'modules',
    permitted: 'Teacher roadmap modules stay visible. Locked items require plan and role access.',
    feature: 'features',
    shortcut: 'Shortcut',
    ownerRule: 'One feature, one owner module',
    ownerRuleBody: 'Dashboard and approval entries only link to the canonical module. They do not create duplicate forms or actions.',
    noMatches: 'No permitted module matches this search.',
    close: 'Close menu',
    current: 'Current module',
    edunixo: 'Classtago',
    brandTagline: 'Secure school operating platform',
    faq: 'FAQs',
    about: 'About Classtago',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
    grievance: 'Grievance Redressal',
    privacyCenter: 'Privacy Center',
    logout: 'Log Out',
    appVersion: 'App version'
  },
  hi: {
    openMenu: 'मॉड्यूल खोलें',
    menu: 'मॉड्यूल',
    roleWorkspace: 'भूमिका कार्यक्षेत्र',
    search: 'मॉड्यूल या फीचर खोजें...',
    available: 'मॉड्यूल',
    permitted: 'Teacher roadmap के मॉड्यूल दिखाई देंगे; locked items के लिए plan और role access आवश्यक है।',
    feature: 'फीचर',
    shortcut: 'शॉर्टकट',
    ownerRule: 'एक फीचर, एक मूल मॉड्यूल',
    ownerRuleBody: 'डैशबोर्ड और अनुमोदन प्रविष्टियाँ केवल मूल मॉड्यूल खोलती हैं। वे डुप्लिकेट फॉर्म या कार्य नहीं बनातीं।',
    noMatches: 'इस खोज से कोई अनुमत मॉड्यूल नहीं मिला।',
    close: 'मेनू बंद करें',
    current: 'वर्तमान मॉड्यूल',
    edunixo: 'Classtago',
    brandTagline: 'सुरक्षित स्कूल ऑपरेटिंग प्लेटफ़ॉर्म',
    faq: 'FAQs',
    about: 'Classtago के बारे में',
    terms: 'उपयोग की शर्तें',
    privacy: 'गोपनीयता नीति',
    grievance: 'शिकायत निवारण',
    privacyCenter: 'प्राइवेसी सेंटर',
    logout: 'लॉग आउट',
    appVersion: 'ऐप वर्ज़न'
  },
  ur: {
    openMenu: 'ماڈیول کھولیں',
    menu: 'ماڈیولز',
    roleWorkspace: 'کردار کا ورک اسپیس',
    search: 'ماڈیول یا فیچر تلاش کریں...',
    available: 'ماڈیولز',
    permitted: 'Teacher roadmap کے ماڈیول نظر آئیں گے؛ locked items کے لیے plan اور role access ضروری ہے۔',
    feature: 'فیچرز',
    shortcut: 'شارٹ کٹ',
    ownerRule: 'ایک فیچر، ایک اصل ماڈیول',
    ownerRuleBody: 'ڈیش بورڈ اور منظوری کی اندراجات صرف اصل ماڈیول کھولتی ہیں؛ الگ یا ڈپلیکیٹ فارم نہیں بناتیں۔',
    noMatches: 'اس تلاش کے مطابق کوئی اجازت یافتہ ماڈیول نہیں ملا۔',
    close: 'مینو بند کریں',
    current: 'موجودہ ماڈیول',
    edunixo: 'Classtago',
    brandTagline: 'محفوظ اسکول آپریٹنگ پلیٹ فارم',
    faq: 'FAQs',
    about: 'Classtago کے بارے میں',
    terms: 'استعمال کی شرائط',
    privacy: 'رازداری کی پالیسی',
    grievance: 'شکایات کا ازالہ',
    privacyCenter: 'پرائیویسی سینٹر',
    logout: 'لاگ آؤٹ',
    appVersion: 'ایپ ورژن'
  }
};

function routeForModule(
  item: RoleVisibleModule,
  canAccess: (tab: CanonicalDashboardTab) => boolean
): CanonicalDashboardTab | null {
  if (canAccess(item.tab)) return item.tab;
  const featureRoute = item.features
    .map(feature => feature.targetTab || item.tab)
    .find(tab => canAccess(tab));
  return featureRoute || null;
}

export default function RoleModuleMenu({
  role,
  lang,
  isClassTeacher,
  activeTab,
  activeModuleId,
  canAccess,
  onOpenModule,
  onOpenFeature,
  hiddenFeatureIds = []
}: RoleModuleMenuProps) {
  const rtl = ['ur', 'ks', 'sd'].includes(String(lang));
  const copy = uiCopy[lang] || uiCopy.en;
  const catalogue = useMemo(
    () => getRoleModuleCatalogue(role, isClassTeacher),
    [role, isClassTeacher]
  );
  const [open, setOpen] = useState(false);

  // R2.5.98: listen for the global hamburger menu event dispatched by TopBar.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setOpen(true);
    window.addEventListener('edunixo:open-menu', handler);
    return () => window.removeEventListener('edunixo:open-menu', handler);
  }, []);
  const [query, setQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(catalogue[0]?.id ? [catalogue[0].id] : [])
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [brandInfo, setBrandInfo] = useState<'faq' | 'about' | 'terms' | 'privacy' | 'grievance' | 'privacy-center' | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const appVersion = String(import.meta.env.VITE_APP_VERSION || '0.2.5');

  useEffect(() => {
    setExpandedCategories(new Set(catalogue[0]?.id ? [catalogue[0].id] : []));
    setExpandedModules(new Set());
  }, [role, isClassTeacher]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const teacherRoadmapRole = ['teacher', 'class_teacher'].includes(String(role || '').toLowerCase());
  const hiddenFeatureSet = useMemo(() => new Set(hiddenFeatureIds), [hiddenFeatureIds]);

  const permittedCatalogue = useMemo<RoleModuleCategory[]>(() => {
    return catalogue
      .map(category => {
        const headmasterAttendanceLeavePackage =
          category.id === 'attendance-leave'
          && String(role || '').toLowerCase() === 'headmaster'
          && canAccess('attendance');

        // Attendance & Leave is one paid/core operational package. If Attendance is
        // available to the Headmaster, both canonical owner modules must remain in
        // the drawer. Do not let a newly introduced leave route key silently reduce
        // the group to a misleading "1 module" state on older school plans.
        if (headmasterAttendanceLeavePackage) {
          return {
            ...category,
            modules: category.modules.map(module => ({
              ...module,
              features: module.features.filter(feature => !hiddenFeatureSet.has(feature.id))
            }))
          };
        }

        const modules = category.modules
          .map(module => {
            // Teacher roadmap items must never silently disappear just because an
            // older plan/permission matrix has not yet been updated for a newly
            // developed module. Keep the item visible and let the existing secure
            // route guard decide whether it can open. Other roles preserve the
            // historical hide-when-denied behaviour.
            if (teacherRoadmapRole) return { ...module, features: module.features.filter(feature => !hiddenFeatureSet.has(feature.id)) };

            const features = module.features.filter(feature =>
              !hiddenFeatureSet.has(feature.id) && canAccess(feature.targetTab || module.tab)
            );
            const moduleRoute = routeForModule(module, canAccess);
            if (!moduleRoute && features.length === 0) return null;
            return { ...module, features };
          })
          .filter(Boolean) as RoleVisibleModule[];
        return { ...category, modules };
      })
      .filter(category => category.modules.length > 0);
  }, [catalogue, canAccess, role, teacherRoadmapRole, hiddenFeatureSet]);

  const filteredCatalogue = useMemo<RoleModuleCategory[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return permittedCatalogue;
    return permittedCatalogue
      .map(category => {
        const categoryMatches = category.label.toLowerCase().includes(needle);
        const modules = category.modules
          .map(module => {
            const moduleMatches =
              module.label.toLowerCase().includes(needle) ||
              String(module.description || '').toLowerCase().includes(needle);
            const matchingFeatures = module.features.filter(feature =>
              feature.label.toLowerCase().includes(needle)
            );
            if (!categoryMatches && !moduleMatches && matchingFeatures.length === 0) return null;
            return {
              ...module,
              features: categoryMatches || moduleMatches ? module.features : matchingFeatures
            };
          })
          .filter(Boolean) as RoleVisibleModule[];
        return { ...category, modules };
      })
      .filter(category => category.modules.length > 0);
  }, [permittedCatalogue, query]);

  const allPermittedModules = useMemo(
    () => permittedCatalogue.flatMap(category => category.modules),
    [permittedCatalogue]
  );

  const currentModule = useMemo(() => {
    if (activeModuleId) {
      const selected = allPermittedModules.find(module => module.id === activeModuleId);
      if (selected) return selected;
    }
    return allPermittedModules.find(module => module.tab === activeTab)
      || allPermittedModules.find(module =>
        module.features.some(feature => (feature.targetTab || module.tab) === activeTab)
      )
      || allPermittedModules[0]
      || null;
  }, [activeTab, activeModuleId, allPermittedModules]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (id: string) => {
    setExpandedModules(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openModule = (module: RoleVisibleModule) => {
    // Parent workspace owns the final secure access decision and shows the
    // canonical denial message. Keeping this call allows a visible locked item
    // to explain why access is unavailable instead of silently doing nothing.
    onOpenModule(module);
    setOpen(false);
  };

  const openFeature = (module: RoleVisibleModule, feature: RoleModuleFeature) => {
    onOpenFeature(module, feature);
    setOpen(false);
  };

  const renderModuleCard = (module: RoleVisibleModule, standalone = false) => {
    const moduleOpen = expandedModules.has(module.id) || Boolean(query.trim());
    const active = currentModule?.id === module.id;
    const hasFeatures = module.features.length > 0;
    return (
      <div key={module.id} style={{
        background: active ? 'linear-gradient(135deg, rgba(6,182,212,0.1), #2b2f45)' : '#2b2f45',
        border: active ? '1px solid #06b6d4' : '1px solid #1a1f2e',
        boxShadow: active ? '0 0 24px rgba(6,182,212,0.2)' : 'none',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden'
      }}>
        <button type="button" onClick={() => hasFeatures ? toggleModule(module.id) : openModule(module)}
          style={{ display: 'flex', minHeight: 72, width: '100%', alignItems: 'center', gap: 12, padding: '14px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span style={{
            display: 'flex', height: 40, width: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 0 16px rgba(6,182,212,0.5)'
          }}>
            <LayoutGrid style={{ height: 20, width: 20, stroke: '#ffffff', strokeWidth: 2.5, fill: 'none' }} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#67e8f9' }}>
              {module.label}
            </span>
            {module.description ? (
              <span style={{ marginTop: 4, display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b' }}>{module.description}</span>
            ) : hasFeatures ? (
              <span style={{ marginTop: 4, display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b' }}>{module.features.length} {copy.feature}</span>
            ) : null}
          </span>
          <ChevronRight style={{ height: 20, width: 20, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5, transform: moduleOpen && hasFeatures ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {moduleOpen && hasFeatures && (
          <div style={{ padding: 8, borderTop: '1px solid rgba(6,182,212,0.15)', background: 'rgba(2,6,23,0.5)' }}>
            {module.features.map(feature => (
              <button type="button" key={feature.id} onClick={() => openFeature(module, feature)}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                <ChevronRight style={{ height: 14, width: 14, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5 }} />
                <span style={{ minWidth: 0, flex: 1, fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>{feature.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStandaloneMainModule = (category: RoleModuleCategory) => {
    const module = category.modules[0];
    const moduleOpen = expandedModules.has(module.id) || Boolean(query.trim());
    const active = currentModule?.id === module.id;
    const hasFeatures = module.features.length > 0;
    return (
      <div key={category.id} style={{
        background: active ? 'linear-gradient(135deg, rgba(6,182,212,0.1), #2b2f45)' : '#2b2f45',
        border: active ? '1px solid #06b6d4' : '1px solid #1a1f2e',
        boxShadow: active ? '0 0 24px rgba(6,182,212,0.2)' : 'none',
        borderRadius: 12, marginBottom: 10, overflow: 'hidden'
      }}>
        <button type="button" onClick={() => hasFeatures ? toggleModule(module.id) : openModule(module)}
          style={{ display: 'flex', minHeight: 72, width: '100%', alignItems: 'center', gap: 12, padding: '14px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <span style={{
            display: 'flex', height: 40, width: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center',
            borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 0 16px rgba(6,182,212,0.5)'
          }}>
            <LayoutGrid style={{ height: 20, width: 20, stroke: '#ffffff', strokeWidth: 2.5, fill: 'none' }} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#67e8f9' }}>{category.label}</span>
            <span style={{ marginTop: 4, display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b' }}>{module.features.length} {copy.feature}</span>
          </span>
          <ChevronRight style={{ height: 20, width: 20, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5, transform: moduleOpen && hasFeatures ? 'rotate(90deg)' : 'none' }} />
        </button>
        {moduleOpen && hasFeatures && (
          <div style={{ padding: 8, borderTop: '1px solid rgba(6,182,212,0.15)', background: 'rgba(2,6,23,0.5)' }}>
            {module.features.map(feature => (
              <button type="button" key={feature.id} onClick={() => openFeature(module, feature)}
                style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '10px 12px', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                <ChevronRight style={{ height: 14, width: 14, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5 }} />
                <span style={{ minWidth: 0, flex: 1, fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>{feature.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await AuthService.logout();
    } finally {
      setOpen(false);
      window.location.reload();
    }
  };

  const brandInfoContent: Record<NonNullable<typeof brandInfo>, { title: string; body: string }> = {
    faq: {
      title: copy.faq,
      body: 'Classtago keeps each school workspace isolated. Access, modules and data visibility follow the signed-in role, school membership and active platform permissions.'
    },
    about: {
      title: copy.about,
      body: 'Classtago is a multi-school education operations platform designed to bring academic, administrative, communication and school-management workflows into one secure mobile-first workspace.'
    },
    terms: {
      title: copy.terms,
      body: 'Use of this app is limited to authorised school and platform users. Account access, institutional records and operational actions must be used only for the role and school for which access has been granted.'
    },
    privacy: {
      title: copy.privacy,
      body: 'Classtago is designed around school-isolated access and role-based visibility. Personal and institutional information should only be processed for authorised school operations and approved platform services.'
    },
    grievance: {
      title: copy.grievance,
      body: 'For account, access, data or service concerns, use the authorised school or Classtago support channel configured for your institution. Do not share passwords or secret keys in support messages.'
    },
    'privacy-center': {
      title: copy.privacyCenter,
      body: 'The Privacy Center summarises how account access, school isolation, permissions and secure sessions protect information inside the app. Additional privacy controls can be expanded here as platform settings are enabled.'
    }
  };

  return (
    <>
      <section
        className="erp-module-dock no-print overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-800 p-3 shadow-[0_22px_70px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-4"
        dir={rtl ? 'rtl' : 'ltr'}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group flex min-h-12 items-center gap-3 rounded-2xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-left shadow-lg transition hover:border-cyan-300/45 hover:bg-slate-950"
            aria-label={copy.openMenu}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.2)]">
              <Menu className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                {copy.menu}
              </span>
              <span className="mt-0.5 block truncate text-sm font-black text-white">
                {currentModule?.label || copy.roleWorkspace}
              </span>
            </span>
            <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-cyan-200 ${rtl ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
            <span className="rounded-full border border-slate-800 bg-slate-800 px-3 py-1.5">
              {teacherRoadmapRole ? `${permittedCatalogue.length} main menus · ${allPermittedModules.length}` : allPermittedModules.length} {copy.available}
            </span>
            <span className="hidden max-w-xl sm:inline">{copy.permitted}</span>
          </div>
        </div>
      </section>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="edx-role-module-overlay fixed inset-0 no-print"
          style={{ zIndex: 2147483000 }}
          dir={rtl ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-label={copy.menu}
        >
          <button
            type="button"
            aria-label={copy.close}
            className="edx-role-module-overlay-backdrop absolute inset-0 cursor-default bg-slate-950 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside
            className={`edx-role-module-drawer absolute inset-y-0 flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border-slate-800 bg-[#05060a] shadow-[0_35px_100px_rgba(0,0,0,.65)] ${
              rtl ? 'right-0' : 'left-0'
            }`}
            style={{ background: '#05060a', color: '#ffffff', border: '1px solid #1a1f2e' }}
          >
            
            <header className="edx-role-module-drawer-header relative z-10 shrink-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]" style={{ backgroundColor: '#05060a' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400" style={{ textShadow: '0 0 12px rgba(6,182,212,0.5)' }}>
                    {copy.roleWorkspace}
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight" style={{ color: '#ffffff', textShadow: '0 0 20px rgba(6,182,212,0.3)' }}>{copy.menu}</h2>
                  <p className="mt-1 text-xs font-medium" style={{ color: '#475569' }}>
                    {teacherRoadmapRole ? `${permittedCatalogue.length} main menus · ${allPermittedModules.length}` : allPermittedModules.length} {copy.available}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-slate-950 text-white shadow-lg transition hover:bg-cyan-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30"
                  aria-label={copy.close}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="edx-role-module-search mt-4 flex min-h-12 items-center gap-3 rounded-xl px-4" style={{ border: '1px solid #06b6d4', backgroundColor: '#0a0e1a', boxShadow: '0 0 20px rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                <Search className="h-4 w-4 shrink-0" style={{ color: '#06b6d4', stroke: '#06b6d4' }} />
                <input
                  value={query}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  placeholder={copy.search}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  inputMode="search"
                  enterKeyHint="search"
                  className="w-full bg-transparent py-3 text-sm font-semibold outline-none" style={{ color: '#06b6d4', caretColor: '#06b6d4' }} placeholder="Search modules..."
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                />
              </label>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              {filteredCatalogue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center">
                  <Search className="mx-auto h-6 w-6 text-slate-500" />
                  <p className="mt-3 text-sm font-bold text-slate-300">{copy.noMatches}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCatalogue.map(category => {
                    if (category.standalone && category.modules.length === 1) {
                      return renderStandaloneMainModule(category);
                    }

                    const categoryOpen = query.trim()
                      ? true
                      : expandedCategories.has(category.id);
                    return (
                      <div key={category.id} style={{
                        background: '#2b2f45', border: '1px solid #1a1f2e', borderRadius: 12, marginBottom: 10, overflow: 'hidden'
                      }}>
                        <button type="button" onClick={() => toggleCategory(category.id)}
                          style={{ display: 'flex', minHeight: 72, width: '100%', alignItems: 'center', gap: 12, padding: '14px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                          <span style={{ display: 'flex', height: 40, width: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 0 16px rgba(6,182,212,0.5)' }}>
                            <LayoutGrid style={{ height: 20, width: 20, stroke: '#ffffff', strokeWidth: 2.5, fill: 'none' }} />
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: 'block', fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#67e8f9' }}>{category.label}</span>
                            <span style={{ marginTop: 4, display: 'block', fontSize: 11, fontWeight: 500, color: '#64748b' }}>{category.modules.length} {copy.available}</span>
                          </span>
                          <ChevronDown style={{ height: 20, width: 20, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5, display: categoryOpen ? 'block' : 'none' }} />
                          <ChevronRight style={{ height: 20, width: 20, flexShrink: 0, stroke: '#06b6d4', strokeWidth: 2.5, display: categoryOpen ? 'none' : 'block', transform: rtl ? 'rotate(180deg)' : 'none' }} />
                        </button>
                        {categoryOpen && (
                          <div style={{ padding: 8, borderTop: '1px solid rgba(6,182,212,0.15)', background: 'rgba(2,6,23,0.5)' }}>
                            {category.modules.map(module => renderModuleCard(module))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <section className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: 'rgba(26,31,46,1)', backgroundColor: '#0a0e1a' }}>
                <div className="border-b px-4 py-4" style={{ borderColor: 'rgba(6,182,212,0.15)', background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.05))' }}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', boxShadow: '0 10px 28px rgba(6,182,212,0.3)' }}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.28em]" style={{ color: '#67e8f9' }}>{copy.edunixo}</p>
                      <p className="mt-1 text-xs font-bold" style={{ color: '#94a3b8' }}>{copy.brandTagline}</p>
                    </div>
                  </div>
                </div>

                {[
                  { key: 'faq', label: copy.faq, icon: BadgeHelp },
                  { key: 'about', label: copy.about, icon: Building2 },
                  { key: 'terms', label: copy.terms, icon: FileText },
                  { key: 'privacy', label: copy.privacy, icon: ShieldCheck },
                  { key: 'grievance', label: copy.grievance, icon: Scale },
                  { key: 'privacy-center', label: copy.privacyCenter, icon: Fingerprint }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => setBrandInfo(item.key as NonNullable<typeof brandInfo>)}
                      className="flex min-h-14 w-full items-center gap-3 border-b px-4 text-left transition" style={{ borderColor: 'rgba(26,31,46,1)', background: 'transparent', backgroundImage: 'none' }}
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1 text-[12px] font-bold tracking-[0.04em]" style={{ color: '#e2e8f0' }}>{item.label}</span>
                      <ChevronRight className={`h-4 w-4 shrink-0 ${rtl ? 'rotate-180' : ''}`} style={{ color: '#06b6d4' }} />
                    </button>
                  );
                })}

                <div className="p-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.08em] transition disabled:opacity-50" style={{ borderColor: 'rgba(244,63,94,0.4)', backgroundColor: 'rgba(244,63,94,0.1)', color: '#fb7185' }}
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? 'Signing out…' : copy.logout}
                  </button>
                  <p className="pt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>
                    {copy.appVersion} {appVersion}
                  </p>
                </div>
              </section>
            </div>

            <footer className="edx-role-module-drawer-footer shrink-0 border-t border-slate-800 bg-[#0a1425] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-3 rounded-2xl border border-emerald-800 bg-emerald-300/[0.055] p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-200">
                    {copy.ownerRule}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400">
                    {copy.ownerRuleBody}
                  </p>
                </div>
              </div>
            </footer>
          </aside>
        </div>,
        document.body
      )}

      {brandInfo && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[2147483600] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center" onClick={() => setBrandInfo(null)}>
          <section className="w-full max-w-md overflow-hidden rounded-[1.8rem] border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,.3)]" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-600">Classtago</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{brandInfoContent[brandInfo].title}</h3>
              </div>
              <button type="button" onClick={() => setBrandInfo(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 text-sm font-medium leading-6 text-slate-600">{brandInfoContent[brandInfo].body}</div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
