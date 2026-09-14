import React from 'react';
import { Plus, X } from 'lucide-react';
import { Language } from '../types';
import { LanguageOption, getLanguageOption, resolvedDirection } from '../lib/languageCatalog';
import LanguageSelector from './LanguageSelector';

export type MultilingualValue = Record<string, string>;

interface MultilingualTextFieldProps {
  label: string;
  value: MultilingualValue;
  onChange: (value: MultilingualValue) => void;
  languages: LanguageOption[];
  defaultLanguage: Language;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}

export default function MultilingualTextField({
  label,
  value,
  onChange,
  languages,
  defaultLanguage,
  multiline = false,
  placeholder,
  required = false
}: MultilingualTextFieldProps) {
  const activeCodes = Object.keys(value).length ? Object.keys(value) : [defaultLanguage];
  const unused = languages.filter(language => !activeCodes.includes(language.code));

  const addLanguage = (code: Language) => {
    if (!code || value[code] !== undefined) return;
    onChange({ ...value, [code]: '' });
  };

  const removeLanguage = (code: Language) => {
    if (activeCodes.length <= 1) return;
    const next = { ...value };
    delete next[code];
    onChange(next);
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-slate-700">{label}</legend>
      {activeCodes.map(code => {
        const option = getLanguageOption(code, languages);
        const commonProps = {
          value: value[code] || '',
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [code]: event.target.value }),
          placeholder,
          required: required && code === defaultLanguage,
          dir: resolvedDirection(option),
          lang: option.code,
          className: 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
        };
        return (
          <div key={code} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-600">{option.nativeName} <span className="font-normal text-slate-400">({option.englishName})</span></span>
              {activeCodes.length > 1 && (
                <button type="button" onClick={() => removeLanguage(code)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${option.englishName}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {multiline ? <textarea {...commonProps} rows={3} /> : <input {...commonProps} />}
          </div>
        );
      })}
      {unused.length > 0 && (
        <div className="flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-slate-400" />
          <LanguageSelector
            id={`add-language-${label.replace(/\s+/g, '-').toLowerCase()}`}
            value=""
            options={[{ code: '', englishName: 'Add language', nativeName: 'Add language', scriptCode: 'Zyyy', direction: 'ltr' }, ...unused]}
            onChange={addLanguage}
            compact
            label="Add language"
          />
        </div>
      )}
    </fieldset>
  );
}
