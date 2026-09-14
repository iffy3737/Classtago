import React from 'react';
import { Globe2, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { LanguageOption, languageDisplayName } from '../lib/languageCatalog';

interface LanguageSelectorProps {
  value: Language;
  options: LanguageOption[];
  onChange: (language: Language) => void;
  loading?: boolean;
  compact?: boolean;
  id?: string;
  label?: string;
  purpose?: 'interface' | 'academic' | 'document';
}

export default function LanguageSelector({
  value,
  options,
  onChange,
  loading = false,
  compact = false,
  id = 'edunixo-language-selector',
  label = 'Language',
  purpose = 'interface'
}: LanguageSelectorProps) {
  const filtered = options.filter(option => option.purposes?.[purpose] !== false);

  return (
    <label className={`flex items-center gap-2 ${compact ? '' : 'min-w-[210px]'}`} htmlFor={id}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <Globe2 className="h-4 w-4 text-slate-400" />}
      {!compact && <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</span>}
      <select
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={loading || filtered.length === 0}
        className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
        aria-label={label}
      >
        {filtered.map(option => (
          <option key={option.code} value={option.code} dir={option.direction === 'rtl' ? 'rtl' : 'ltr'}>
            {languageDisplayName(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
