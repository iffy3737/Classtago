/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../lib/translations';
import { LocalERPDatabase } from '../lib/supabase';
import {
  FALLBACK_LANGUAGE_CATALOGUE,
  LanguageOption,
  getLanguageOption,
  normalizeLanguageCode,
  resolvedDirection
} from '../lib/languageCatalog';
import LanguageSelector from './LanguageSelector';
import { openSmartPrint } from '../lib/smartPrint';
import { exportElementToExcel } from '../utils/actionExports';

interface PrintPDFButtonProps {
  title: string;
  lang: Language;
  orientation?: 'portrait' | 'landscape';
  elementId?: string;
  languageOptions?: LanguageOption[];
  allowLanguageSelection?: boolean;
  onDocumentLanguageChange?: (language: Language) => void;
}

export default function PrintPDFButton({
  title,
  lang,
  orientation = 'portrait',
  elementId,
  languageOptions = FALLBACK_LANGUAGE_CATALOGUE,
  allowLanguageSelection = true,
  onDocumentLanguageChange
}: PrintPDFButtonProps) {
  const [documentLanguage, setDocumentLanguage] = useState<Language>(() =>
    normalizeLanguageCode(localStorage.getItem('edunixo.document_language') || lang)
  );
  const t = translations[documentLanguage];

  const changeDocumentLanguage = (selected: Language) => {
    const normalized = normalizeLanguageCode(selected);
    setDocumentLanguage(normalized);
    localStorage.setItem('edunixo.document_language', normalized);
    window.dispatchEvent(new CustomEvent('edunixo_document_language_changed', { detail: { language: normalized } }));
    onDocumentLanguageChange?.(normalized);
  };

  const handlePrint = () => {
    const selected = getLanguageOption(documentLanguage, languageOptions);
    const previousLang = document.documentElement.lang;
    const previousDir = document.documentElement.dir;
    document.documentElement.lang = selected.code;
    document.documentElement.dir = resolvedDirection(selected);
    openSmartPrint({ title, elementId, orientation });
    window.setTimeout(() => {
      document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDir;
    }, 300);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {allowLanguageSelection && (
        <LanguageSelector
          id={`document-language-${title.replace(/\s+/g, '-').toLowerCase()}`}
          value={documentLanguage}
          options={languageOptions}
          onChange={changeDocumentLanguage}
          compact
          label="Document language"
          purpose="document"
        />
      )}
      <button
        type="button"
        onClick={handlePrint}
        id="btn-print-a4"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
      >
        <Printer className="h-4 w-4 text-slate-500" />
        <span>{t.print || 'Print'} / PDF</span>
      </button>
      <button
        type="button"
        onClick={() => exportElementToExcel({ elementId, title, filename: title })}
        id="btn-export-excel"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        <span>{t.exportExcel || 'Excel'}</span>
      </button>
    </div>
  );
}

export function PrintLetterhead({ lang, subtitle }: { lang: Language; subtitle: string }) {
  const profile = useMemo(() => LocalERPDatabase.getAcademicSetup().schoolProfile, []);
  const language = getLanguageOption(lang);
  return (
    <div className="mb-8 hidden border-b-2 border-slate-800 pb-4 print:block" dir={resolvedDirection(language)} lang={language.code}>
      <div className="flex items-center justify-between">
        <div className="text-left text-xs text-slate-500">
          <div>{profile.state || 'State'} Education Department</div>
          <div>School Code: {profile.schoolCode || profile.udiseCode || '—'}</div>
        </div>
        <div className="mx-4 flex-1 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">{profile.schoolName}</h1>
          <p className="mt-1 text-[10px] italic text-slate-500">
            {[profile.address, profile.villageCity, profile.district, profile.state, profile.pinCode].filter(Boolean).join(', ')}
          </p>
          {profile.email && <p className="mt-0.5 text-[10px] text-slate-500">{profile.email}</p>}
        </div>
        <div className="rounded border border-slate-300 p-1 text-right font-mono text-[9px] text-slate-400">
          <div>VERIFIED</div>
          <div className="font-bold text-slate-600">{profile.schoolCode || 'SCHOOL'}</div>
        </div>
      </div>
      <div className="mt-4 text-center">
        <span className="rounded bg-slate-100 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-slate-800">{subtitle}</span>
      </div>
    </div>
  );
}

export function PrintSignatureArea({ lang }: { lang: Language }) {
  const profile = useMemo(() => LocalERPDatabase.getAcademicSetup().schoolProfile, []);
  const language = getLanguageOption(lang);
  return (
    <div className="mt-16 hidden border-t border-dashed border-slate-300 pt-12 print:block" dir={resolvedDirection(language)} lang={language.code}>
      <div className="flex items-end justify-between text-sm text-slate-700">
        <div className="w-48 text-center">
          <div className="mb-2 h-12 border-b border-slate-300" />
          <p className="font-medium">Class Teacher / Clerk</p>
          <p className="text-xs text-slate-500">Sign & Date</p>
        </div>
        <div className="w-48 rounded border border-slate-200 p-2 text-center font-mono text-xs italic text-slate-400">School Round Seal</div>
        <div className="w-48 text-center">
          <div className="mb-2 h-12 border-b border-slate-300" />
          <p className="font-semibold text-slate-900">{profile.principalName || 'Headmaster / Principal'}</p>
          <p className="text-xs text-slate-500">Headmaster / Principal</p>
        </div>
      </div>
      <div className="mt-12 text-center font-mono text-[10px] text-slate-400">
        Generated by Classtago ERP on {new Date().toLocaleDateString(language.localeCode || 'en-IN')}
      </div>
    </div>
  );
}
