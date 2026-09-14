import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Globe2, GraduationCap, Loader2, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { Language, User } from '../types';
import { supabase } from '../lib/supabase';
import { LanguageOption, normalizeLanguageCode } from '../lib/languageCatalog';
import { FALLBACK_FONT_CATALOGUE, FontOption, ensureWebFontLoaded, fontCssStack, fontPreviewText, getFontsForLanguage, normalizeFontCode, resolveFont } from '../lib/fontCatalog';
import { translations } from '../lib/translations';
import LanguageSelector from './LanguageSelector';
import FontSelector from './FontSelector';

interface Props {
  lang: Language;
  user: User;
}

type SaveScope = 'academic' | 'document';

export default function SchoolLanguageSettings({ lang, user }: Props) {
  const t = translations[lang];
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [fonts, setFonts] = useState<FontOption[]>(FALLBACK_FONT_CATALOGUE);
  const [defaultAcademic, setDefaultAcademic] = useState<Language>('en');
  const [defaultAcademicFont, setDefaultAcademicFont] = useState('noto-sans');
  const [defaultDocument, setDefaultDocument] = useState<Language>('en');
  const [defaultDocumentFont, setDefaultDocumentFont] = useState('noto-serif');
  const [loading, setLoading] = useState(true);
  const [savingScope, setSavingScope] = useState<SaveScope | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const academicFonts = useMemo(
    () => getFontsForLanguage(defaultAcademic, 'academic', languages, fonts),
    [defaultAcademic, languages, fonts]
  );
  const documentFonts = useMemo(
    () => getFontsForLanguage(defaultDocument, 'document', languages, fonts),
    [defaultDocument, languages, fonts]
  );

  const selectedAcademicFont = resolveFont(defaultAcademicFont, defaultAcademic, 'academic', languages, fonts);
  const selectedDocumentFont = resolveFont(defaultDocumentFont, defaultDocument, 'document', languages, fonts);

  const authorizedFetch = async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error(t.secureSessionUnavailable);
    const response = await fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || t.languageSettingsRequestFailed);
    return body;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await authorizedFetch('/api/admin/language-settings');
      const settings = body.settings || {};
      const loadedLanguages: LanguageOption[] = (body.languages || []).map((row: any) => ({
        id: row.id,
        code: normalizeLanguageCode(row.code || row.languageCode),
        englishName: String(row.englishName || row.english_name || row.code || 'Language'),
        nativeName: String(row.nativeName || row.native_name || row.englishName || row.code || 'Language'),
        scriptCode: String(row.scriptCode || row.script_code || 'Zyyy'),
        direction: row.direction === 'rtl' ? 'rtl' : row.direction === 'auto' ? 'auto' : 'ltr',
        localeCode: row.localeCode || row.locale_code || null,
        purposes: { interface: true, academic: true, document: true }
      }));
      const loadedFonts: FontOption[] = Array.isArray(body.fonts) && body.fonts.length
        ? body.fonts.map((row: any) => ({
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

      const academicLanguage = normalizeLanguageCode(settings.defaultAcademicLanguageCode || 'en');
      const documentLanguage = normalizeLanguageCode(settings.defaultDocumentLanguageCode || 'en');
      setLanguages(loadedLanguages);
      setFonts(loadedFonts);
      setDefaultAcademic(academicLanguage);
      setDefaultDocument(documentLanguage);
      setDefaultAcademicFont(resolveFont(settings.defaultAcademicFontCode, academicLanguage, 'academic', loadedLanguages, loadedFonts).code);
      setDefaultDocumentFont(resolveFont(settings.defaultDocumentFontCode, documentLanguage, 'document', loadedLanguages, loadedFonts).code);
    } catch (err: any) {
      setError(err?.message || t.languageSettingsLoadFailed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const changeAcademicLanguage = (language: Language) => {
    const normalized = normalizeLanguageCode(language);
    setDefaultAcademic(normalized);
    const compatible = resolveFont(defaultAcademicFont, normalized, 'academic', languages, fonts);
    setDefaultAcademicFont(compatible.code);
    ensureWebFontLoaded(compatible);
    setMessage(null);
  };

  const changeDocumentLanguage = (language: Language) => {
    const normalized = normalizeLanguageCode(language);
    setDefaultDocument(normalized);
    const compatible = resolveFont(defaultDocumentFont, normalized, 'document', languages, fonts);
    setDefaultDocumentFont(compatible.code);
    ensureWebFontLoaded(compatible);
    setMessage(null);
  };

  const save = async (scope: SaveScope) => {
    setSavingScope(scope);
    setMessage(null);
    setError(null);
    try {
      const languageCode = scope === 'academic' ? defaultAcademic : defaultDocument;
      const fontCode = scope === 'academic' ? selectedAcademicFont.code : selectedDocumentFont.code;
      await authorizedFetch(`/api/admin/language-settings/${scope}`, {
        method: 'PUT',
        body: JSON.stringify({ languageCode, fontCode })
      });
      setMessage(scope === 'academic' ? t.academicSettingsSaved : t.documentSettingsSaved);
      window.dispatchEvent(new Event('school_languages_updated'));
      await load();
    } catch (err: any) {
      setError(err?.message || t.languageSettingsSaveFailed);
    } finally {
      setSavingScope(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-extrabold text-slate-900">{t.languageLocalization}</h2></div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{t.languageSettingsDescription}</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" />{t.refresh}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SettingsCard
          icon={<GraduationCap className="h-5 w-5 text-blue-600" />}
          title={t.defaultAcademicEntry}
          description={t.academicSettingsNote}
          language={defaultAcademic}
          languages={languages}
          onLanguageChange={changeAcademicLanguage}
          fontCode={selectedAcademicFont.code}
          fonts={academicFonts}
          onFontChange={code => { setDefaultAcademicFont(code); ensureWebFontLoaded(resolveFont(code, defaultAcademic, 'academic', languages, fonts)); setMessage(null); }}
          preview={fontPreviewText(defaultAcademic, languages)}
          previewFont={selectedAcademicFont}
          saveLabel={t.saveAcademicSettings}
          saving={savingScope === 'academic'}
          disabled={user.role !== 'headmaster'}
          onSave={() => void save('academic')}
          languageLabel={t.language}
          fontLabel={t.font}
          previewLabel={t.preview}
          usage="academic"
        />

        <SettingsCard
          icon={<FileText className="h-5 w-5 text-indigo-600" />}
          title={t.defaultDocumentOutput}
          description={t.documentSettingsNote}
          language={defaultDocument}
          languages={languages}
          onLanguageChange={changeDocumentLanguage}
          fontCode={selectedDocumentFont.code}
          fonts={documentFonts}
          onFontChange={code => { setDefaultDocumentFont(code); ensureWebFontLoaded(resolveFont(code, defaultDocument, 'document', languages, fonts)); setMessage(null); }}
          preview={fontPreviewText(defaultDocument, languages)}
          previewFont={selectedDocumentFont}
          saveLabel={t.saveDocumentSettings}
          saving={savingScope === 'document'}
          disabled={user.role !== 'headmaster'}
          onSave={() => void save('document')}
          languageLabel={t.language}
          fontLabel={t.font}
          previewLabel={t.preview}
          usage="document"
        />
      </div>

      {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <div><p className="text-sm font-extrabold text-blue-900">{t.safeForExistingRecords}</p><p className="mt-1 text-xs leading-relaxed text-blue-700">{t.safeForExistingRecordsNote}</p></div>
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  language,
  languages,
  onLanguageChange,
  fontCode,
  fonts,
  onFontChange,
  preview,
  previewFont,
  saveLabel,
  saving,
  disabled,
  onSave,
  languageLabel,
  fontLabel,
  previewLabel,
  usage
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  language: Language;
  languages: LanguageOption[];
  onLanguageChange: (language: Language) => void;
  fontCode: string;
  fonts: FontOption[];
  onFontChange: (fontCode: string) => void;
  preview: string;
  previewFont: FontOption;
  saveLabel: string;
  saving: boolean;
  disabled: boolean;
  onSave: () => void;
  languageLabel: string;
  fontLabel: string;
  previewLabel: string;
  usage: 'academic' | 'document';
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-50 p-2.5">{icon}</div>
        <div><h3 className="text-base font-extrabold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p></div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{languageLabel}</span>
          <LanguageSelector value={language} options={languages} onChange={onLanguageChange} compact purpose={usage} id={`default-${usage}-language`} label={languageLabel} />
        </div>
        <FontSelector value={fontCode} options={fonts} onChange={onFontChange} usage={usage} id={`default-${usage}-font`} label={fontLabel} />
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{previewLabel}</p>
        <p className="mt-2 text-base text-slate-800" style={{ fontFamily: fontCssStack(previewFont), lineHeight: previewFont.category === 'nastaliq' ? 2.1 : 1.65 }}>{preview}</p>
      </div>

      <button
        type="button"
        disabled={saving || disabled}
        onClick={onSave}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saveLabel}
      </button>
    </section>
  );
}
