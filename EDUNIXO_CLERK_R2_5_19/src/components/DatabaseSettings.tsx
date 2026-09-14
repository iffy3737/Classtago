/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, Save, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Language, SupabaseConfig } from '../types';
import { getSupabaseConfig, saveSupabaseConfig, LocalERPDatabase } from '../lib/supabase';
import UrduWrapper from './UrduWrapper';
import { translations } from '../lib/translations';
import { requestActionConfirm } from '../lib/actionConfirm';

interface DatabaseSettingsProps {
  lang: Language;
  onConfigChange: () => void;
}

export default function DatabaseSettings({ lang, onConfigChange }: DatabaseSettingsProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState<SupabaseConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [devModeChecked, setDevModeChecked] = useState(false);

  useEffect(() => {
    const config = getSupabaseConfig();
    setStatus(config);
    setUrl(config.url);
    setAnonKey(config.anonKey);
    setDevModeChecked(localStorage.getItem('isDeveloperMode') === 'true');
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Supabase connection is deployment-managed. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the deployment environment, then rebuild.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };


  const handleReset = async () => {
    if (await requestActionConfirm({ title: lang === 'ur' ? 'ڈیٹا ری سیٹ کریں؟' : lang === 'hi' ? 'डेटा रीसेट करें?' : 'Reset academic data?', message: lang === 'ur' ? 'کیا آپ تمام تعلیمی ڈیٹا دوبارہ شروع کرنا چاہتے ہیں؟' : lang === 'hi' ? 'क्या आप सभी शैक्षणिक डेटा रीसेट करना चाहते हैं?' : 'Are you sure you want to reset all academic data? This will restore original classes, notices and homework.', confirmLabel: lang === 'ur' ? 'ری سیٹ' : lang === 'hi' ? 'रीसेट' : 'Reset Data', tone: 'danger' })) {
      setIsResetting(true);
      setTimeout(() => {
        LocalERPDatabase.resetDatabase();
        setIsResetting(false);
        onConfigChange();
        alert(lang === 'ur' ? 'تعلیمی ریکارڈز کامیابی سے بحال ہو گئے!' : lang === 'hi' ? 'अकादमिक रिकॉर्ड सफलतापूर्वक रीसेट किए गए!' : 'Academic records restored successfully!');
      }, 1000);
    }
  };

  const t = translations[lang];

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/50 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-sans">{t.databaseSettings}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Configure cloud persistence and credentials</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Badge */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
          status?.isConnected 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
            : 'bg-amber-50/50 border-amber-100 text-amber-800'
        }`}>
          {status?.isConnected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">
              {t.databaseStatus}: {status?.isConnected ? t.connected : t.disconnected}
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-sans">
              {status?.isConnected 
                ? 'Your ERP is fully connected to Supabase PostgreSQL Cloud Instance. All live transactions sync in real-time.' 
                : t.databaseExplanation}
            </p>
          </div>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              {t.connectionString} (URL)
            </label>
            <input
              type="url"
              placeholder="https://your-project.supabase.co"
              value={url}
              readOnly
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              {t.apiKey} (Anon Key)
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              readOnly
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          {/* System Developer Mode Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Developer Mode</label>
                <p className="text-[10px] text-slate-500 font-sans">
                  Enable development status panel, test labels, internal IDs, and debug parameters.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={devModeChecked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDevModeChecked(checked);
                    localStorage.setItem('isDeveloperMode', checked ? 'true' : 'false');
                    onConfigChange(); // refresh context
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:scale-98 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Managed by Deployment</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 active:scale-98 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{t.resetMock}</span>
            </button>
          </div>
        </form>

        {/* Database Statistics */}
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-sm font-bold text-slate-900 mb-3 font-sans">Active Local Schema Information</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-bold text-slate-900">{LocalERPDatabase.getClasses().length}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Classes Structured</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-bold text-slate-900">{LocalERPDatabase.getUsers().length}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Users & Roles</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-bold text-slate-900">{LocalERPDatabase.getNotices().length}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Active Notices</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 text-center">
              <div className="text-2xl font-bold text-slate-900">{LocalERPDatabase.getAuditLogs().length}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Audit Entries</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
