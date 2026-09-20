/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogOut, ShieldAlert, GraduationCap, Database, Globe2, Sparkles, UserCircle2, KeyRound, Menu } from 'lucide-react';
import { Language, User } from '../types';
import { translations } from '../lib/translations';
import { LanguageOption } from '../lib/languageCatalog';
import { FontOption } from '../lib/fontCatalog';
import LanguageSelector from './LanguageSelector';
import FontSelector from './FontSelector';

interface TopBarProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  languages: LanguageOption[];
  languagesLoading?: boolean;
  interfaceFontCode: string;
  interfaceFonts: FontOption[];
  fontsLoading?: boolean;
  onInterfaceFontChange: (fontCode: string) => void;
  user: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onChangePassword: () => void;
  onOpenDatabase: () => void;
  currentView: 'website' | 'erp' | 'database';
  onNavigate: (view: 'website' | 'erp' | 'database') => void;
  schoolName?: string | null;
  schoolSubtitle?: string | null;
  mobileApp?: boolean;
}

export default function TopBar({
  lang,
  onLangChange,
  languages,
  languagesLoading = false,
  interfaceFontCode,
  interfaceFonts,
  fontsLoading = false,
  onInterfaceFontChange,
  user,
  onLogout,
  onOpenLogin,
  onChangePassword,
  currentView,
  onNavigate,
  schoolName,
  schoolSubtitle,
  mobileApp = false
}: TopBarProps) {
  const t = translations[lang];

  if (mobileApp) {
    return (
      <header className="edx-mobile-topbar no-print">
        <div className="edx-mobile-topbar-inner">
          <button
            type="button"
            className="edx-mobile-hamburger"
            onClick={() => window.dispatchEvent(new CustomEvent('edunixo:open-menu'))}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="edx-mobile-brand-lockup">
            <div className="edx-mobile-brand-mark"><GraduationCap className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="edx-mobile-brand-eyebrow">Classtago</p>
              <h1>{schoolName || t.schoolName}</h1>
            </div>
          </div>
          <div className="edx-mobile-topbar-actions">
            <div className="flex items-center gap-1.5">
              <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label="Interface language" purpose="interface" />
              <div className="hidden sm:block"><FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly /></div>
            </div>
            {user && (
              <div className="edx-mobile-profile-chip">
                {user.photoUrl ? <img src={user.photoUrl} alt={user.name} /> : <UserCircle2 className="h-5 w-5 text-violet-600" />}
                <div className="hidden min-w-0 sm:block">
                  <strong>{user.name}</strong>
                  <span>{t[user.role] || user.role}</span>
                </div>
                <button onClick={onChangePassword} aria-label="Change password" title="Change Password"><KeyRound className="h-4 w-4" /></button>
                <button onClick={onLogout} aria-label="Logout" title={t.logout}><LogOut className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050816]/92 px-3 py-3 text-white shadow-[0_18px_60px_rgba(2,6,23,.28)] backdrop-blur-2xl no-print sm:px-5">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-4">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onNavigate(user?.role === 'super_admin' ? 'erp' : 'website')}>
            <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 shadow-[0_12px_35px_rgba(34,211,238,.22)]">
              {user?.role === 'super_admin' ? <ShieldAlert className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
              <div className="absolute inset-x-2 bottom-1 h-px bg-white/40" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h1 className="truncate text-sm font-black uppercase tracking-tight text-white sm:text-base">{user?.role === 'super_admin' ? 'Classtago ERP' : (schoolName || t.schoolName)}</h1><span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300 sm:inline">Secure cloud</span></div>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">{user?.role === 'super_admin' ? 'Multi-School Platform Control' : (schoolSubtitle || t.schoolSub)}</p>
            </div>
          </button>
          <div className="flex items-center gap-2 xl:hidden">
            <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label="Interface language" purpose="interface" />
            <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 xl:justify-end">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.045] p-1 text-xs shadow-inner">
            <button onClick={() => onNavigate('website')} id="tab-website-view" className={`flex items-center gap-2 rounded-lg px-3 py-2 font-black transition-all ${currentView === 'website' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Globe2 className="h-3.5 w-3.5" />{t.website}</button>
            <button onClick={user ? () => onNavigate('erp') : onOpenLogin} id="tab-erp-view" className={`flex items-center gap-2 rounded-lg px-3 py-2 font-black transition-all ${currentView === 'erp' ? 'bg-gradient-to-r from-cyan-300 to-violet-400 text-slate-950 shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Sparkles className="h-3.5 w-3.5" />{t.erpPortal}</button>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <LanguageSelector value={lang} options={languages} onChange={onLangChange} loading={languagesLoading} compact label="Interface language" purpose="interface" />
            <FontSelector value={interfaceFontCode} options={interfaceFonts} onChange={onInterfaceFontChange} usage="interface" loading={fontsLoading} compactIconOnly />
          </div>

          {user?.role !== 'super_admin' && <button onClick={() => onNavigate('database')} id="btn-db-setup" className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[10px] font-black uppercase tracking-wide transition ${currentView === 'database' ? 'border-cyan-300/30 bg-cyan-300/15 text-cyan-200' : 'border-white/10 bg-white/[0.045] text-slate-400 hover:border-white/20 hover:text-white'}`} title={t.databaseSettings}><Database className="h-3.5 w-3.5" />{t.dbSetupShort}</button>}

          {user ? <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-1.5 pl-2.5">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="h-8 w-8 rounded-lg border border-white/15 object-cover shadow" />
            ) : (
              <UserCircle2 className="h-5 w-5 text-cyan-300" />
            )}
            <div className="hidden min-w-0 text-left sm:block"><div className="max-w-36 truncate text-[10px] font-black text-white">{user.name}</div><div className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-violet-300">{t[user.role] || user.role}</div></div>
            <button onClick={onChangePassword} id="btn-change-password" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-cyan-500/10 hover:text-cyan-200" title="Change Password"><KeyRound className="h-4 w-4" /></button>
            <button onClick={onLogout} id="btn-logout" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300" title={t.logout}><LogOut className="h-4 w-4" /></button>
          </div> : <button onClick={onOpenLogin} id="btn-header-login" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5">{t.login}</button>}
        </div>
      </div>
    </header>
  );
}
