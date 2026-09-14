import React, { useState, useEffect } from 'react';
import { 
  Settings, School, Shield, Database, Users, RefreshCw, 
  Trash2, Play, AlertTriangle, CheckCircle, Download, 
  Upload, Search, Filter, ShieldAlert, Zap, FileSpreadsheet, 
  Lock, Calendar, FileText, Check, AlertCircle, Copy, HelpCircle,
  Clock, ArrowRight, UserPlus, Info, CheckSquare, Square
} from 'lucide-react';
import { LocalERPDatabase, supabase } from '../lib/supabase';
import { User, AuditLogEntry, SchoolProfile, MasterAcademicSetup } from '../types';

interface SmartAdminControlProps {
  lang: 'en' | 'hi' | 'ur';
  user: User;
  activeFeatureId?: string | null;
}

type SystemAdminTab = 'profile' | 'settings' | 'users' | 'backup' | 'import_export' | 'promotions' | 'duplicates' | 'health_check' | 'audit_logs';

const SYSTEM_ADMIN_FEATURE_TAB: Record<string, SystemAdminTab> = {
  'system-school-profile': 'profile',
  'system-settings': 'settings',
  'system-users-permissions': 'users',
  'system-backup-restore': 'backup',
  'system-bulk-import-export': 'import_export',
  'system-academic-promotions': 'promotions',
  'system-duplicate-detection': 'duplicates',
  'system-diagnostics': 'health_check',
  'system-audit-trail': 'audit_logs',
  'sensitive-action-audit': 'audit_logs',
  'permission-change-audit': 'audit_logs',
  'policy-exception-review': 'audit_logs',
  'compliance-evidence-pack': 'audit_logs',
  'audit-retention-review': 'audit_logs'
};

export default function SmartAdminControl({ lang, user, activeFeatureId }: SmartAdminControlProps) {
  const isHeadmaster = user.role === 'headmaster';
  const isClerk = user.role === 'clerk';
  
  // Tab control
  const [activeSubTab, setActiveSubTab] = useState<SystemAdminTab>('profile');

  useEffect(() => {
    const nextTab = activeFeatureId ? SYSTEM_ADMIN_FEATURE_TAB[activeFeatureId] : 'profile';
    if (!nextTab) return;
    setActiveSubTab(nextTab);
    window.setTimeout(() => {
      document.getElementById(`system-admin-workspace-${nextTab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [activeFeatureId]);

  // Success/Error notifications
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const logOperation = (action: string, module: string, details: string) => {
    LocalERPDatabase.addAuditLog(user.id, user.name, user.role as any, action, module, details);
  };

  return (
    <div id="smart_admin_panel" className="bg-slate-50 min-h-screen p-4 sm:p-6 rounded-2xl border border-slate-200">
      {/* Toast alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 animate-bounce" /> : <AlertTriangle className="w-5 h-5 animate-pulse" />}
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-blue-600/15 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-950/30 relative">
              <Settings className="w-8 h-8" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {lang === 'ur' ? 'ایڈمنسٹریشن اور سسٹم کنٹرول پینل' : lang === 'hi' ? 'प्रशासन एवं सिस्टम नियंत्रण पैनल' : 'ERP Administration & System Management'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 font-mono">
                {lang === 'ur' ? 'پورے اسکول کے ماسٹر ڈیٹا، سیکیورٹی اور کارکردگی کا انتظام کریں' : lang === 'hi' ? 'संपूर्ण विद्यालय के मास्टर डेटा, सुरक्षा और प्रदर्शन का प्रबंधन करें' : 'Central controller for global rules, school profiles, diagnostic testing & system health'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/90 px-4 py-2 rounded-xl border border-slate-700 self-start md:self-auto relative">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-200 font-mono">
              HEADMASTER CONTROLLED ACCESS
            </span>
          </div>
        </div>

        {/* Administration Tabs */}
        {!activeFeatureId && (
        <div className="flex flex-wrap gap-2 mt-6 border-t border-slate-700 pt-4 relative">
          {[
            { id: 'profile', label: 'School Profile', icon: School, color: 'text-indigo-400' },
            { id: 'settings', label: 'System Settings', icon: Settings, color: 'text-blue-400' },
            { id: 'users', label: 'Users & Permissions', icon: Users, color: 'text-emerald-400' },
            { id: 'backup', label: 'Backup & Restore', icon: Database, color: 'text-amber-400' },
            { id: 'import_export', label: 'Bulk Import/CSV', icon: FileSpreadsheet, color: 'text-sky-400' },
            { id: 'promotions', label: 'Academic Promotions', icon: Calendar, color: 'text-violet-400' },
            { id: 'duplicates', label: 'Duplicate Detection', icon: ShieldAlert, color: 'text-rose-400' },
            { id: 'health_check', label: 'System Diagnostics', icon: Zap, color: 'text-orange-400' },
            { id: 'audit_logs', label: 'Audit Trail Logs', icon: FileText, color: 'text-slate-300' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm border border-blue-500' 
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Tab Contents */}
      <div id={`system-admin-workspace-${activeSubTab}`} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px] scroll-mt-24">
        {activeSubTab === 'profile' && <SchoolProfilePanel lang={lang} user={user} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'settings' && <SystemSettingsPanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'users' && <UserPermissionsPanel user={user} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'backup' && <BackupRestorePanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'import_export' && <ImportExportPanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'promotions' && <PromotionsPanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'duplicates' && <DuplicateDetectionPanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'health_check' && <DiagnosticsPanel lang={lang} showToast={showToast} logOperation={logOperation} />}
        {activeSubTab === 'audit_logs' && <AuditLogsPanel lang={lang} activeFeatureId={activeFeatureId} />}
      </div>
    </div>
  );
}

// ==========================================
// 1. SCHOOL PROFILE PANEL
// ==========================================
function SchoolProfilePanel({ lang, user, showToast, logOperation }: { lang: string; user: User; showToast: any; logOperation: any }) {
  const [setup, setSetup] = useState<MasterAcademicSetup>(() => LocalERPDatabase.getAcademicSetup());
  const [profile, setProfile] = useState<SchoolProfile>(() => setup.schoolProfile);
  const [savingProfile, setSavingProfile] = useState(false);

  const [names, setNames] = useState({
    en: profile.schoolName || 'National High School, Taloda',
    mr: (profile as any).schoolNameMarathi || 'राष्ट्रीय हायस्कूल तळोदा',
    hi: (profile as any).schoolNameHindi || 'राष्ट्रीय हाई स्कूल तलोदा',
    ur: (profile as any).schoolNameUrdu || 'نیشنل ہائی اسکول تلوڈا',
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      const updatedProfile = {
        ...profile,
        schoolName: names.en.trim(),
        schoolNameMarathi: names.mr,
        schoolNameHindi: names.hi,
        schoolNameUrdu: names.ur,
      } as any;
      if (!updatedProfile.schoolName || !updatedProfile.schoolCode) {
        throw new Error('School name and school code are required.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Cloud session was not found. Please log in again.');
      const fullAddress = [updatedProfile.address, updatedProfile.villageCity, updatedProfile.taluka, updatedProfile.district, updatedProfile.state, updatedProfile.pinCode]
        .filter(Boolean)
        .join(', ');
      const response = await fetch('/api/admin/school-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          schoolName: updatedProfile.schoolName,
          schoolCode: updatedProfile.schoolCode.trim().toUpperCase(),
          address: fullAddress,
          phone: updatedProfile.phoneNumbers || '',
          email: updatedProfile.email || ''
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Live school profile could not be updated.');

      const updatedSetup = { ...setup, schoolProfile: updatedProfile };
      LocalERPDatabase.saveAcademicSetup(updatedSetup);
      setSetup(updatedSetup);
      setProfile(updatedProfile);
      logOperation('UPDATE_SCHOOL_PROFILE', 'School Profile', 'Updated live school identity and local print-branding configuration.');
      showToast('School profile saved. School name/contact details now feed live headers; logo, seal and signatures feed print layouts on this deployment.');
    } catch (error: any) {
      showToast(error?.message || 'School profile could not be saved.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">1. Master School Profile & Branding</h2>
        <p className="text-xs text-slate-500 mt-1">Configure parameters displayed on fee receipts, leaving certificates, mark sheets, and salary statements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Multilingual names */}
        <div className="col-span-1 md:col-span-2 space-y-3">
          <label className="text-xs font-bold text-slate-700">School Name (English)</label>
          <input
            type="text"
            value={names.en}
            onChange={e => setNames(prev => ({ ...prev, en: e.target.value }))}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-3">
          <label className="text-xs font-bold text-slate-700">School Name (Marathi)</label>
          <input
            type="text"
            value={names.mr}
            onChange={e => setNames(prev => ({ ...prev, mr: e.target.value }))}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-3">
          <label className="text-xs font-bold text-slate-700">School Name (Hindi)</label>
          <input
            type="text"
            value={names.hi}
            onChange={e => setNames(prev => ({ ...prev, hi: e.target.value }))}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-3">
          <label className="text-xs font-bold text-slate-700">School Name (Urdu - RTL Support)</label>
          <input
            type="text"
            dir="rtl"
            value={names.ur}
            onChange={e => setNames(prev => ({ ...prev, ur: e.target.value }))}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 text-right font-semibold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">UDISE Code</label>
          <input
            type="text"
            value={profile.udiseCode}
            onChange={e => setProfile({ ...profile, udiseCode: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">School Code</label>
          <input
            type="text"
            value={profile.schoolCode}
            onChange={e => setProfile({ ...profile, schoolCode: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Headmaster / Principal Name</label>
          <input
            type="text"
            value={profile.principalName}
            onChange={e => setProfile({ ...profile, principalName: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Email Address</label>
          <input
            type="email"
            value={profile.email}
            onChange={e => setProfile({ ...profile, email: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Official Website</label>
          <input
            type="text"
            value={profile.website}
            onChange={e => setProfile({ ...profile, website: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Phone Numbers</label>
          <input
            type="text"
            value={profile.phoneNumbers}
            onChange={e => setProfile({ ...profile, phoneNumbers: e.target.value })}
            className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700">Detailed Address</label>
        <textarea
          value={profile.address}
          onChange={e => setProfile({ ...profile, address: e.target.value })}
          className="w-full text-sm p-2.5 border border-slate-200 rounded-lg h-20"
        />
      </div>

      {/* Asset uploading */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Official Logo, Seal & Signature Uploads</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Logo */}
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col items-center justify-between text-center bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 mb-2">School Official Logo</span>
            <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center overflow-hidden mb-3">
              {profile.schoolLogo ? (
                <img referrerPolicy="no-referrer" src={profile.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <School className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'schoolLogo')} className="hidden" id="logo-file-up-admin" />
            <label htmlFor="logo-file-up-admin" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700">
              Upload Logo
            </label>
          </div>

          {/* Seal */}
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col items-center justify-between text-center bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 mb-2">School Round Seal</span>
            <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center overflow-hidden mb-3">
              {profile.schoolSeal ? (
                <img referrerPolicy="no-referrer" src={profile.schoolSeal} alt="Seal" className="w-full h-full object-contain" />
              ) : (
                <Shield className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'schoolSeal')} className="hidden" id="seal-file-up-admin" />
            <label htmlFor="seal-file-up-admin" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700">
              Upload Seal
            </label>
          </div>

          {/* HM Sig */}
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col items-center justify-between text-center bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 mb-2">Principal Signature</span>
            <div className="w-24 h-12 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden mb-3">
              {profile.principalSignature ? (
                <img referrerPolicy="no-referrer" src={profile.principalSignature} alt="HM Sig" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-400">No Signature</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'principalSignature')} className="hidden" id="hm-file-up-admin" />
            <label htmlFor="hm-file-up-admin" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700">
              Upload Signature
            </label>
          </div>

          {/* Clerk Sig */}
          <div className="p-4 border border-slate-200 rounded-xl flex flex-col items-center justify-between text-center bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700 mb-2">Clerk Signature</span>
            <div className="w-24 h-12 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden mb-3">
              {profile.clerkSignature ? (
                <img referrerPolicy="no-referrer" src={profile.clerkSignature} alt="Clerk Sig" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-slate-400">No Signature</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'clerkSignature')} className="hidden" id="clerk-file-up-admin" />
            <label htmlFor="clerk-file-up-admin" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700">
              Upload Signature
            </label>
          </div>

        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={savingProfile}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {savingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{savingProfile ? 'Saving Live Profile…' : 'Save Changes Globally'}</span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 2. SYSTEM SETTINGS PANEL
// ==========================================
function SystemSettingsPanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [setup, setSetup] = useState<MasterAcademicSetup>(() => LocalERPDatabase.getAcademicSetup());
  const [global, setGlobal] = useState(() => setup.globalSettings);
  const [timing, setTiming] = useState(() => setup.schoolTiming);

  const handleSave = () => {
    const updated = {
      ...setup,
      globalSettings: global,
      schoolTiming: timing
    };
    LocalERPDatabase.saveAcademicSetup(updated);
    setSetup(updated);
    logOperation('UPDATE_SYSTEM_SETTINGS', 'System Settings', `Updated timezone, language, and school office hours`);
    showToast('System configuration saved globally. Reloading options...');
  };

  const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">2. Global System Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">Manage system runtimes, working days, regional configurations, and default themes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Settings column 1 */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Localization & Languages</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Primary System Language</label>
            <select
              value={global.defaultLanguage}
              onChange={e => setGlobal({ ...global, defaultLanguage: e.target.value as any })}
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
            >
              <option value="en">English (Default)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="ur">Urdu (اردو - RTL)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Time Zone</label>
            <select
              value={global.defaultTimeZone || 'Asia/Kolkata'}
              onChange={e => setGlobal({ ...global, defaultTimeZone: e.target.value })}
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC / GMT</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Theme Preference</label>
            <select
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
              defaultValue="light"
            >
              <option value="light">Classic Light (High Contrast)</option>
              <option value="dark">Immersive Dark Mode</option>
            </select>
          </div>
        </div>

        {/* Settings column 2 */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Formats</h3>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Date Format</label>
            <select
              value={global.dateFormat || 'YYYY-MM-DD'}
              onChange={e => setGlobal({ ...global, dateFormat: e.target.value })}
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (2026-07-01)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (01/07/2026)</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY (01-07-2026)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Time Format</label>
            <select
              value={global.timeFormat || '12h'}
              onChange={e => setGlobal({ ...global, timeFormat: e.target.value as any })}
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
            >
              <option value="12h">12-Hour format (04:30 PM)</option>
              <option value="24h">24-Hour format (16:30)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Numbering & Currency</label>
            <select
              value={global.currency || 'INR'}
              onChange={e => setGlobal({ ...global, currency: e.target.value })}
              className="w-full text-sm p-2.5 border border-slate-200 rounded-lg"
            >
              <option value="INR">Indian Rupee (₹, Lakhs/Crores)</option>
              <option value="USD">US Dollar ($, Millions)</option>
            </select>
          </div>
        </div>

        {/* Settings column 3 */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Timings & Working Days</h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500">School Opens</label>
              <input 
                type="time" 
                value={timing.openingTime} 
                onChange={e => setTiming({ ...timing, openingTime: e.target.value })}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500">School Closes</label>
              <input 
                type="time" 
                value={timing.closingTime} 
                onChange={e => setTiming({ ...timing, closingTime: e.target.value })}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">School Working Days</label>
            <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-150">
              {workingDays.map(day => {
                const isChecked = timing.workingDays.includes(day);
                return (
                  <label key={day} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => {
                        const nextDays = isChecked 
                          ? timing.workingDays.filter(d => d !== day)
                          : [...timing.workingDays, day];
                        setTiming({ ...timing, workingDays: nextDays });
                      }}
                      className="rounded text-indigo-600 focus:ring-0" 
                    />
                    <span>{day.substring(0, 3)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Save System Settings</span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 3. USERS & ROLE PERMISSIONS PANEL
// Staff login management intentionally remains only in the Accounts tab.
// ==========================================
function UserPermissionsPanel({ user, showToast, logOperation }: { user: User; showToast: any; logOperation: any }) {
  const roles = [
    { key: 'headmaster', label: 'Headmaster' },
    { key: 'clerk', label: 'Clerk' },
    { key: 'teacher', label: 'Teacher' },
    { key: 'student', label: 'Student' }
  ];
  const modules = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'admissions', label: 'Admissions' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'fees', label: 'Fees' },
    { key: 'results', label: 'Results' },
    { key: 'exams', label: 'Exams' },
    { key: 'timetable', label: 'Timetable' },
    { key: 'library', label: 'Library' },
    { key: 'certificates', label: 'Certificates' },
    { key: 'communication', label: 'Communication' },
    { key: 'payroll', label: 'Payroll' },
    { key: 'master_data', label: 'Master Data' },
    { key: 'administration', label: 'Administration' }
  ];

  const defaultPermission = (role: string, moduleKey: string) => {
    if (role === 'headmaster') return true;
    const defaults: Record<string, string[]> = {
      clerk: ['dashboard', 'admissions', 'attendance', 'fees', 'certificates', 'communication', 'library'],
      teacher: ['dashboard', 'attendance', 'results', 'exams', 'timetable', 'communication'],
      student: ['dashboard', 'attendance', 'results', 'timetable', 'library', 'certificates', 'communication', 'fees']
    };
    return defaults[role]?.includes(moduleKey) ?? false;
  };

  const createDefaults = () => {
    const result: Record<string, Record<string, boolean>> = {};
    roles.forEach(role => {
      result[role.key] = {};
      modules.forEach(module => { result[role.key][module.key] = defaultPermission(role.key, module.key); });
    });
    return result;
  };

  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(createDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error('Headmaster cloud session was not found. Please log in again.');
        const response = await fetch('/api/admin/role-permissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'Unable to load permissions.');
        const next = createDefaults();
        (payload.permissions || []).forEach((entry: any) => {
          if (next[entry.role_name] && entry.module_key in next[entry.role_name]) {
            next[entry.role_name][entry.module_key] = entry.role_name === 'headmaster' ? true : entry.allowed === true;
          }
        });
        if (!cancelled) setPermissions(next);
      } catch (error: any) {
        if (!cancelled) setLoadError(error?.message || 'Unable to load permissions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const toggle = (role: string, moduleKey: string) => {
    if (role === 'headmaster') return;
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [moduleKey]: !prev[role][moduleKey] }
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Headmaster cloud session was not found. Please log in again.');
      const entries = roles.flatMap(role => modules.map(module => ({
        roleName: role.key,
        moduleKey: module.key,
        allowed: role.key === 'headmaster' ? true : Boolean(permissions[role.key]?.[module.key])
      })));
      const response = await fetch('/api/admin/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions: entries })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to save permissions.');
      localStorage.setItem('nhs_erp_role_permissions', JSON.stringify(permissions));
      window.dispatchEvent(new Event('role_permissions_updated'));
      logOperation('ROLE_PERMISSIONS_UPDATED', 'Security', 'Updated role-wise module access matrix in Supabase.');
      showToast('Role permissions saved to the live database.');
    } catch (error: any) {
      showToast(error?.message || 'Unable to save role permissions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" />Role Module Permissions</h2>
          <p className="text-xs text-slate-500 mt-1">Use one tick to allow or remove base-role module access. Class Teacher is not a separate role here; that access is granted only by the canonical Class Teacher academic assignment.</p>
        </div>
        <button onClick={save} disabled={saving || loading || Boolean(loadError)} className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />{saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>

      {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{loadError}</div>}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading live permissions…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[900px] w-full border-collapse text-xs">
            <thead><tr className="bg-slate-800 text-white"><th className="p-3 text-left sticky left-0 bg-slate-800">Role</th>{modules.map(module => <th key={module.key} className="p-2 text-center whitespace-nowrap">{module.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map(role => (
                <tr key={role.key} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800 sticky left-0 bg-white">{role.label}{role.key === 'headmaster' && <span className="block text-[9px] text-slate-400">Always allowed</span>}</td>
                  {modules.map(module => {
                    const checked = role.key === 'headmaster' || Boolean(permissions[role.key]?.[module.key]);
                    return <td key={module.key} className="p-2 text-center"><button type="button" disabled={role.key === 'headmaster'} onClick={() => toggle(role.key, module.key)} className={`inline-flex p-1.5 rounded-lg ${checked ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300 bg-slate-50'} disabled:cursor-not-allowed`} title={`${role.label}: ${module.label}`}>{checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}</button></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-[11px] leading-5 text-cyan-900"><strong>Access rule:</strong> this matrix controls base-role module visibility. Class Teacher and Subject Teacher scope is never granted here; it comes from the current cloud academic assignments.</div>
    </div>
  );
}

// ==========================================
// 4. BACKUP & RESTORE PANEL
// ==========================================
function BackupRestorePanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [exporting, setExporting] = useState(false);
  const [exports, setExports] = useState<{ id: string; timestamp: string; size: string; type: string }[]>(() => {
    try {
      const stored = localStorage.getItem('edunixo_school_export_registry');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const performManualBackup = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
      const response = await fetch('/api/headmaster/system-export', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'School cloud export could not be generated.');

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edunixo_school_cloud_export_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const sizeKb = `${Math.max(1, Math.round(new Blob([jsonStr]).size / 1024))} KB`;
      const event = {
        id: `export_${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        size: sizeKb,
        type: 'School cloud export'
      };
      const updated = [event, ...exports].slice(0, 20);
      localStorage.setItem('edunixo_school_export_registry', JSON.stringify(updated));
      setExports(updated);
      logOperation('SCHOOL_CLOUD_EXPORT', 'System Security', `Generated school-scoped cloud export (${sizeKb})`);
      showToast('School cloud data export generated successfully.');
    } catch (error: any) {
      showToast(error?.message || 'School cloud export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 font-mono">4. Backup, Export & Recovery Safety</h2>
        <p className="text-xs text-slate-500 mt-1">Export the current school-scoped cloud records without exposing authentication secrets. Production restore is intentionally controlled outside the browser.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
            <Database className="w-10 h-10 text-indigo-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">School Cloud Snapshot Export</h3>
              <p className="text-xs text-slate-600 mt-1">Downloads a school-scoped JSON snapshot of Student Master, Staff Master, academic masters and canonical Class/Subject Teacher assignments. Passwords, service-role keys and Auth secrets are never included.</p>
              <button
                type="button"
                disabled={exporting}
                onClick={performManualBackup}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer"
              >
                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{exporting ? 'Preparing secure export…' : 'Download School Cloud Export'}</span>
              </button>
            </div>
          </div>

          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-4">
            <ShieldAlert className="w-10 h-10 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Controlled Production Recovery</h3>
              <p className="text-xs text-slate-600 mt-1">Direct browser restore is disabled because it can overwrite or diverge from Supabase production records. Database recovery must be performed through controlled platform/database recovery tooling with an impact check and audit trail.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[11px] font-semibold text-amber-800">
                <Lock className="w-3.5 h-3.5" /> Browser restore disabled by safety policy
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-bold"><CheckCircle className="w-4 h-4" /> Production-safe behavior</div>
            <p className="mt-1 text-[11px] leading-5">This page no longer claims to schedule fake browser backups or restores localStorage as if it were the cloud database. The downloaded export is a controlled portability/audit snapshot; disaster recovery remains a privileged database operation.</p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50 p-3 font-bold text-slate-700 border-b border-slate-200">Recent exports on this device</div>
            <div className="divide-y divide-slate-100 bg-white max-h-[260px] overflow-y-auto">
              {exports.length ? exports.map(item => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Database className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 truncate">{item.timestamp}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.type}</div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.size}</span>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400">No cloud export has been generated on this device yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. BULK IMPORT & TEMPLATE EXPORT
// ==========================================
function ImportExportPanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [csvContent, setCsvContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationReport, setValidationReport] = useState<{ errors: string[]; rows: any[]; submitted?: number; failed?: string[] } | null>(null);

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) {
        values.push(current.trim()); current = '';
      } else current += ch;
    }
    values.push(current.trim());
    return values;
  };

  const downloadStudentTemplate = () => {
    const csv = 'StudentName,DateOfBirth,GuardianName,GuardianMobile,ClassApplying,Gender,Relation,Email,Address,ProposedGR,AdmissionNumber,AcademicYear\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edunixo_student_admission_intake_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Student Admission Intake CSV template downloaded.');
  };

  const validateRows = () => {
    const rawLines = csvContent.split(/\r?\n/).filter(line => line.trim());
    const errors: string[] = [];
    const parsedRows: any[] = [];
    if (rawLines.length < 2) return { errors: ['CSV must include a header row and at least one student row.'], rows: [] };
    const header = parseCsvLine(rawLines[0]).map(value => value.trim());
    const required = ['StudentName', 'DateOfBirth', 'GuardianName', 'GuardianMobile', 'ClassApplying'];
    required.forEach(field => { if (!header.includes(field)) errors.push(`Missing required column: ${field}`); });
    if (errors.length) return { errors, rows: [] };

    for (let i = 1; i < rawLines.length; i++) {
      const values = parseCsvLine(rawLines[i]);
      if (values.length !== header.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${header.length}, got ${values.length}).`);
        continue;
      }
      const row: Record<string, string> = {};
      header.forEach((key, index) => { row[key] = values[index]?.trim() || ''; });
      if (!row.StudentName) errors.push(`Row ${i + 1}: StudentName is required.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.DateOfBirth || '')) errors.push(`Row ${i + 1}: DateOfBirth must be YYYY-MM-DD.`);
      if (!row.GuardianName) errors.push(`Row ${i + 1}: GuardianName is required.`);
      if (!row.GuardianMobile || row.GuardianMobile.replace(/\D/g, '').length < 10) errors.push(`Row ${i + 1}: GuardianMobile is invalid.`);
      if (!row.ClassApplying) errors.push(`Row ${i + 1}: ClassApplying is required.`);
      parsedRows.push(row);
    }
    return { errors, rows: parsedRows };
  };

  const handleCsvImport = async () => {
    if (!csvContent.trim()) { showToast('Paste CSV data or drop a CSV file first.', 'error'); return; }
    const report = validateRows();
    setValidationReport(report);
    if (report.errors.length) { showToast('CSV validation failed. Fix the listed rows before intake.', 'error'); return; }

    setProcessing(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
      let submitted = 0;
      const failed: string[] = [];
      for (let index = 0; index < report.rows.length; index++) {
        const row = report.rows[index];
        const response = await fetch('/api/school-website/clerk-admission-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            student: { fullName: row.StudentName, dateOfBirth: row.DateOfBirth, gender: row.Gender || null },
            guardian: { fullName: row.GuardianName, mobile: row.GuardianMobile, relation: row.Relation || 'Guardian', email: row.Email || null },
            address: { line1: row.Address || null },
            academic: { classApplying: row.ClassApplying },
            office: { proposedGrNumber: row.ProposedGR || null, proposedAdmissionNumber: row.AdmissionNumber || null, academicYear: row.AcademicYear || null }
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) failed.push(`Row ${index + 2}: ${payload.error || 'Admission intake failed.'}`);
        else submitted++;
      }
      const finalReport = { ...report, submitted, failed };
      setValidationReport(finalReport);
      logOperation('BULK_ADMISSION_INTAKE', 'Admissions', `Prepared ${submitted} cloud admission intake application(s); ${failed.length} failed.`);
      if (failed.length) showToast(`${submitted} intake(s) prepared; ${failed.length} row(s) need attention.`, 'error');
      else showToast(`${submitted} student admission intake application(s) prepared for review.`);
    } catch (error: any) {
      showToast(error?.message || 'Bulk admission intake could not be completed.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => setCsvContent(String(evt.target?.result || ''));
    reader.readAsText(file);
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 font-mono">5. Bulk Student Admission Intake</h2>
        <p className="text-xs text-slate-500 mt-1">CSV rows are validated and sent to the cloud Admission Application queue. This tool never creates an active Student login, password, fee ledger or duplicate Student Master record.</p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 flex items-start gap-3">
        <Shield className="w-5 h-5 shrink-0 mt-0.5" />
        <div><strong>Controlled workflow:</strong> CSV Intake → Admission Application → review/recommendation → Headmaster final confirmation → Student Master. Student account registration remains GR-based after confirmed admission.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Paste or drop Student Admission CSV:</span>
            <button type="button" onClick={downloadStudentTemplate} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer">
              <Download className="w-3 h-3" /><span>Download Template</span>
            </button>
          </div>
          <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
            className={`p-1 border-2 border-dashed rounded-xl transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
            <textarea
              placeholder={'StudentName,DateOfBirth,GuardianName,GuardianMobile,ClassApplying,...\nStudent Name,2013-03-03,Guardian Name,+919876543210,VI,...'}
              value={csvContent} onChange={e => setCsvContent(e.target.value)}
              className="w-full text-xs p-3 font-mono bg-white h-52 focus:ring-0 border-0 rounded-lg resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={processing} onClick={handleCsvImport}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg shadow cursor-pointer">
              {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{processing ? 'Preparing cloud intake…' : 'Validate & Prepare Admission Intake'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-700">Validation & Cloud Intake Report</span>
          {!validationReport ? (
            <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center text-slate-400">
              <Info className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">No CSV has been processed yet. Validation checks required fields before any cloud intake is submitted.</p>
            </div>
          ) : validationReport.errors.length ? (
            <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs">
              <div className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Validation failed ({validationReport.errors.length})</div>
              <ul className="mt-2 space-y-1 text-[11px] list-disc list-inside max-h-52 overflow-y-auto">{validationReport.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs">
                <div className="font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" />CSV structure verified</div>
                <p className="mt-1 text-[11px]">Valid rows: {validationReport.rows.length}{validationReport.submitted !== undefined ? ` · Cloud intake prepared: ${validationReport.submitted}` : ''}</p>
              </div>
              {!!validationReport.failed?.length && (
                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
                  <div className="font-bold">Rows requiring attention</div>
                  <ul className="mt-2 space-y-1 text-[11px] list-disc list-inside max-h-44 overflow-y-auto">{validationReport.failed.map((err, i) => <li key={i}>{err}</li>)}</ul>
                </div>
              )}
              {validationReport.submitted !== undefined && validationReport.submitted > 0 && (
                <div className="p-3 rounded-xl border border-slate-200 bg-white text-[11px] text-slate-600">
                  Next: open <strong>Admission Campaigns → Admission Applications</strong> for review, then use <strong>Admission Confirmation</strong> for final Student Master creation.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. ACADEMIC PROMOTIONS & YEAR END CLOSING
// ==========================================
function PromotionsPanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [setup, setSetup] = useState<MasterAcademicSetup>(() => LocalERPDatabase.getAcademicSetup());
  const [students, setStudents] = useState<User[]>([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [targetClass, setTargetClass] = useState('c2'); // Class 6 (default map next)
  const [promotionQueue, setPromotionQueue] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nhs_erp_users');
      if (stored) {
        const parsed = JSON.parse(stored) as User[];
        setStudents(parsed.filter(u => u.role === 'student'));
      }
    } catch {}
  }, []);

  const handleSelectAll = (checked: boolean) => {
    const queue: Record<string, boolean> = {};
    students.forEach(st => {
      queue[st.id] = checked;
    });
    setPromotionQueue(queue);
  };

  const handleCommitPromotion = () => {
    const selectedIds = Object.keys(promotionQueue).filter(id => promotionQueue[id]);
    if (selectedIds.length === 0) {
      showToast('No students selected for promotion', 'error');
      return;
    }

    // Load entire user database
    try {
      const stored = localStorage.getItem('nhs_erp_users');
      if (stored) {
        let allUsers = JSON.parse(stored) as User[];
        const targetClassObj = setup.classes.find(c => c.id === targetClass);
        const targetClassName = targetClassObj ? targetClassObj.className : 'Class 6';

        allUsers = allUsers.map(u => {
          if (selectedIds.includes(u.id)) {
            return {
              ...u,
              // Update student academic year boundaries, class names
              classId: targetClass,
              classLabel: targetClassName
            };
          }
          return u;
        });

        localStorage.setItem('nhs_erp_users', JSON.stringify(allUsers));
        logOperation('STUDENT_PROMOTION', 'Academic Setup', `Promoted ${selectedIds.length} students into ${targetClassName}`);
        showToast(`Successfully promoted ${selectedIds.length} students to ${targetClassName}!`);
        
        // Refresh local view
        setStudents(allUsers.filter(u => u.role === 'student'));
        setPromotionQueue({});
      }
    } catch {
      showToast('Failed to write promotion allocations to registry.', 'error');
    }
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 font-mono">6. Year-End Student Promotion & Transition Wizard</h2>
        <p className="text-xs text-slate-500 mt-1">Select class groups, assess final report cards, and transfer cohort arrays into successive grades for the next academic cycle.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600">Current Class Filter</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold"
          >
            <option value="all">All Grades</option>
            {setup.classes.map(c => (
              <option key={c.id} value={c.id}>{c.className}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600">Destination Class</label>
          <select
            value={targetClass}
            onChange={e => setTargetClass(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-indigo-600 font-bold"
          >
            {setup.classes.map(c => (
              <option key={c.id} value={c.id}>{c.className} (Target)</option>
            ))}
          </select>
        </div>

        <div className="flex items-end justify-start gap-2">
          <button
            onClick={() => handleSelectAll(true)}
            className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
          >
            Select All
          </button>
          <button
            onClick={() => handleSelectAll(false)}
            className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
          >
            Deselect All
          </button>
        </div>

        <div className="flex items-end justify-end">
          <button
            onClick={handleCommitPromotion}
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Commit Bulk Promotions</span>
          </button>
        </div>
      </div>

      {/* Student rows list */}
      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <th className="p-3 w-12 text-center">Inclusion</th>
              <th className="p-3">Student Name</th>
              <th className="p-3">Current Grade / Division</th>
              <th className="p-3">GR / National SHALARTH ID</th>
            </tr>
          </thead>
          <tbody>
            {students
              .filter(st => selectedClass === 'all' || st.classId === selectedClass)
              .map(st => (
                <tr key={st.id} className="border-b border-slate-150 hover:bg-slate-50/50">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={!!promotionQueue[st.id]}
                      onChange={e => setPromotionQueue(prev => ({ ...prev, [st.id]: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-bold text-slate-800">{st.name}</td>
                  <td className="p-3 font-mono text-indigo-600 font-semibold">{st.classLabel || 'Class 5-A'}</td>
                  <td className="p-3 font-mono text-slate-500">{st.username} | {st.shalarthId || 'SHALARTH-PENDING'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 7. DUPLICATE DETECTION PANEL
// ==========================================
function DuplicateDetectionPanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is required.');
      const response = await fetch('/api/headmaster/duplicate-diagnostics', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Duplicate diagnostic could not be loaded.');
      const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
      setDuplicates(candidates);
      setScanCompleted(true);
      logOperation('DUPLICATE_DIAGNOSTIC', 'System Audit', `Reviewed ${candidates.length} school-scoped duplicate candidate sets.`);
      showToast(`Cloud diagnostic complete. ${candidates.length} candidate set${candidates.length === 1 ? '' : 's'} require review.`);
    } catch (error: any) {
      showToast(error?.message || 'Duplicate diagnostic failed.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const copyCandidateIds = async (candidate: any) => {
    const ids = (candidate.records || []).map((record: any) => record.id).filter(Boolean).join(', ');
    if (!ids) return;
    try {
      await navigator.clipboard.writeText(ids);
      showToast('Candidate record IDs copied for dependency audit.');
    } catch {
      showToast(`Record IDs: ${ids}`);
    }
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 font-mono">7. Cross-Entity Duplicate Detection & Controlled Repair Review</h2>
        <p className="text-xs text-slate-500 mt-1">Runs a school-scoped cloud diagnostic over canonical Student, Staff and Account identifiers. EDUNIXO never auto-merges operational records because linked attendance, result, assignment and account dependencies must be audited first.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-xs font-bold text-slate-700">Audit canonical cloud registries</span>
          <p className="text-[10px] text-slate-400 mt-0.5">Exact GR / admission / employee / SHALARTH / username / email collisions only. Name similarity alone is never treated as proof of duplication.</p>
        </div>
        <button
          type="button"
          onClick={scanForDuplicates}
          disabled={isScanning}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer font-mono"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning cloud registries…' : 'Run Duplicate Diagnostic'}</span>
        </button>
      </div>

      {!scanCompleted ? (
        <div className="p-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50/60 text-center">
          <ShieldAlert className="w-9 h-9 mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-600">No diagnostic has been run in this session.</p>
          <p className="text-[10px] text-slate-400 mt-1">The scan is read-only and cannot change Student, Staff, Result or Academic Assignment data.</p>
        </div>
      ) : duplicates.length === 0 ? (
        <div className="p-12 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center text-slate-400">
          <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="text-xs font-semibold text-slate-600">No exact identifier collisions were found.</p>
          <p className="text-[10px] text-slate-400 mt-1">This does not auto-certify data quality; it only confirms the tested canonical identifiers are unique in the current school scope.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
            <strong>Controlled repair rule:</strong> do not delete or merge either record from this screen. Copy the exact IDs, inspect dependencies in the canonical owner module, then use the appropriate audited Account Repair / Student Master / Staff Master action.
          </div>
          <span className="text-xs font-bold text-slate-700">Candidate Sets ({duplicates.length})</span>
          {duplicates.map((dup: any, idx: number) => (
            <div key={`${dup.entityType}-${dup.matchType}-${idx}`} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded font-mono bg-rose-100 text-rose-800">{dup.entityType}</span>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded font-mono bg-slate-100 text-slate-700">{dup.matchType}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">{dup.value}</div>
                </div>
                <button type="button" onClick={() => copyCandidateIds(dup)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer">Copy Exact IDs</button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {(dup.records || []).map((record: any) => (
                  <div key={record.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-800">{record.displayName || 'Unnamed record'}</p>
                    <p className="text-[10px] font-mono text-slate-500 break-all">ID: {record.id}</p>
                    {record.identifier && <p className="text-[10px] text-slate-500 mt-1">Identifier: {record.identifier}</p>}
                    {record.status && <p className="text-[10px] text-slate-500">Status: {record.status}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. ERP DIAGNOSTICS & HEALTH CHECK
// ==========================================
function DiagnosticsPanel({ lang, showToast, logOperation }: { lang: string; showToast: any; logOperation: any }) {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<any[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is required.');
      const response = await fetch('/api/headmaster/health-check', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'System health check could not be loaded.');
      const checks = Array.isArray(payload?.checks) ? payload.checks : [];
      setReport(checks);
      setGeneratedAt(payload?.generatedAt || new Date().toISOString());
      logOperation('HEALTH_DIAGNOSTIC', 'System Diagnostics', `Reviewed ${checks.length} school-scoped cloud health checks.`);
      showToast('Cloud system health check complete.');
    } catch (error: any) {
      showToast(error?.message || 'System health check failed.', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="text-left space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 font-mono">8. ERP Health Check & System Diagnostics</h2>
        <p className="text-xs text-slate-500 mt-1">Read-only school-scoped checks against the production cloud masters and canonical Academic Assignment foundation. This page does not seed fake records or run automatic repair scripts.</p>
      </div>

      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
        <Zap className="w-12 h-12 text-indigo-600 mx-auto" />
        <div>
          <h3 className="text-sm font-bold text-slate-800">Run Cloud Integrity Diagnostic</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">Checks school identity, active academic year, Student/Staff masters, canonical Class Teacher and Subject Teacher assignment stores, and audit availability without changing any record.</p>
        </div>
        <button type="button" onClick={runDiagnostics} disabled={isRunning} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running diagnostic…' : 'Run Health Check'}
        </button>
      </div>

      {report && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-slate-700">Diagnostic Results</h3>
            {generatedAt && <span className="text-[10px] font-mono text-slate-400">{new Date(generatedAt).toLocaleString()}</span>}
          </div>
          {report.map((check: any) => {
            const isOk = check.status === 'ok';
            const isFail = check.status === 'fail';
            return (
              <div key={check.id} className={`rounded-xl border p-4 flex items-start gap-3 ${isOk ? 'border-emerald-200 bg-emerald-50/50' : isFail ? 'border-rose-200 bg-rose-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
                {isOk ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className={`w-5 h-5 shrink-0 ${isFail ? 'text-rose-600' : 'text-amber-600'}`} />}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">{check.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">{check.message}</p>
                  {check.sourceTable && <p className="text-[9px] font-mono text-slate-400 mt-1">Source: {check.sourceTable}</p>}
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] text-slate-500">
            Repairs remain explicit and owner-module controlled. A warning here never authorizes EDUNIXO to create placeholder fees, timetable rows, Students, Teachers or credentials.
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogsPanel({ lang, activeFeatureId }: { lang: string; activeFeatureId?: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retentionView, setRetentionView] = useState('');

  const loadCloudAudit = async () => {
    setLoading(true); setError('');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) throw new Error('Secure Headmaster session is unavailable.');
      const response = await fetch('/api/headmaster/audit-logs', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Cloud audit trail could not be loaded.');
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      setRetentionView(payload.retentionView || 'School-scoped cloud audit events');
    } catch (e: any) {
      setError(e?.message || 'Cloud audit trail could not be loaded.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCloudAudit(); }, []);

  const isSensitive = (action: string) => /delete|archive|final|publish|approve|reject|password|permission|role|access|restore|confirm|close/i.test(action);
  const isPermission = (action: string) => /permission|role|access|membership|entitlement/i.test(action);
  const isException = (action: string, summary: string) => /denied|blocked|exception|forbidden|failed|conflict|restricted/i.test(`${action} ${summary}`);

  const featureFiltered = logs.filter(row => {
    const action = String(row.action || '');
    const summary = String(row.summary || row.details || '');
    if (activeFeatureId === 'sensitive-action-audit') return isSensitive(action);
    if (activeFeatureId === 'permission-change-audit') return isPermission(action);
    if (activeFeatureId === 'policy-exception-review') return isException(action, summary);
    return true;
  });

  const filteredLogs = featureFiltered.filter(row => {
    const action = String(row.action || '');
    const details = String(row.summary || row.details || '');
    const actor = String(row.actor_name || row.actor_user_id || '');
    const module = String(row.entity_type || row.module || 'System');
    const needle = search.toLowerCase();
    const matchesSearch = !needle || `${actor} ${action} ${details} ${module}`.toLowerCase().includes(needle);
    const matchesModule = moduleFilter === 'all' || module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const uniqueModules = Array.from(new Set(featureFiltered.map(row => String(row.entity_type || row.module || 'System')))).sort();
  const title = activeFeatureId === 'sensitive-action-audit' ? 'Sensitive-action Audit'
    : activeFeatureId === 'permission-change-audit' ? 'Permission-change Audit'
      : activeFeatureId === 'policy-exception-review' ? 'Policy Exception Review'
        : activeFeatureId === 'compliance-evidence-pack' ? 'Compliance Evidence Pack'
          : activeFeatureId === 'audit-retention-review' ? 'Audit Retention Review'
            : 'Non-Editable Security Audit Trail';

  const downloadEvidence = () => {
    const payload = { generatedAt: new Date().toISOString(), scope: title, retentionView, logs: filteredLogs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `edunixo_audit_evidence_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="text-left space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-mono">{title}</h2>
          <p className="text-xs text-slate-500 mt-1">School-scoped Supabase audit events. This view is read-only and does not manufacture browser-local audit history.</p>
          {!!retentionView && <p className="mt-1 text-[10px] font-semibold text-slate-400">{retentionView}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadCloudAudit()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          {(activeFeatureId === 'compliance-evidence-pack' || !activeFeatureId) && <button type="button" onClick={downloadEvidence} disabled={!filteredLogs.length} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><Download className="h-3.5 w-3.5" />Export Evidence</button>}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}
      {activeFeatureId === 'audit-retention-review' && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800"><strong>Retention view:</strong> EDUNIXO displays the latest school-scoped cloud events here. Deletion/retention policy is not editable from the school browser; platform/database policy remains authoritative.</div>}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input type="text" placeholder="Search actor, action, entity or summary…" value={search} onChange={e => setSearch(e.target.value)} className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl" /></div>
        <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} className="text-xs p-2.5 border border-slate-200 rounded-xl bg-white"><option value="all">All Entities</option>{uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          <thead><tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200"><th className="p-3">Timestamp</th><th className="p-3">Actor</th><th className="p-3">Action & Summary</th><th className="p-3">Entity</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="p-10 text-center text-slate-400"><RefreshCw className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              : filteredLogs.length ? filteredLogs.map(row => <tr key={String(row.id)} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{row.created_at || row.timestamp || '—'}</td>
                <td className="p-3"><span className="font-bold text-slate-800">{row.actor_name || 'System / service'}</span><div className="mt-0.5 text-[9px] font-mono text-slate-400">{row.actor_kind || row.actor_user_id || ''}</div></td>
                <td className="p-3"><div className="font-bold text-indigo-600 font-mono text-[10px] uppercase tracking-wider">{row.action || 'event'}</div><div className="mt-1 text-[11px] text-slate-600">{row.summary || row.details || 'No summary'}</div></td>
                <td className="p-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px] font-mono">{row.entity_type || row.module || 'System'}</span></td>
              </tr>)
              : <tr><td colSpan={4} className="p-10 text-center text-slate-400">No matching cloud audit events.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

