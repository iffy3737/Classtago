import React, { useMemo, useState } from 'react';
import { ChevronDown, Languages, Plus, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import type { Language } from '../types';
import { FALLBACK_LANGUAGE_CATALOGUE, languageDisplayName } from '../lib/languageCatalog';
import {
  DocumentLanguageFieldDefinition,
  DocumentLanguageProfile,
  DocumentLanguageSectionDefinition,
  DocumentLanguageSelection,
} from '../lib/documentLanguage';

interface Props {
  profile: DocumentLanguageProfile;
  onChange: (profile: DocumentLanguageProfile) => void;
  sections: DocumentLanguageSectionDefinition[];
  fields?: DocumentLanguageFieldDefinition[];
  title?: string;
  description?: string;
  compact?: boolean;
}

const layoutOptions: Array<{ value: DocumentLanguageSelection['layout']; label: string }> = [
  { value: 'single', label: 'Single' },
  { value: 'inline', label: 'Inline' },
  { value: 'stacked', label: 'Stacked' },
  { value: 'columns', label: 'Columns' },
];

function LanguageChips({
  selection,
  onChange,
}: {
  selection: DocumentLanguageSelection;
  onChange: (selection: DocumentLanguageSelection) => void;
}) {
  const addLanguage = (code: string) => {
    if (!code || selection.languages.includes(code) || selection.languages.length >= 3) return;
    onChange({ ...selection, languages: [...selection.languages, code] });
  };
  const removeLanguage = (code: string) => {
    if (selection.languages.length <= 1) return;
    onChange({ ...selection, languages: selection.languages.filter(item => item !== code) });
  };
  const unused = FALLBACK_LANGUAGE_CATALOGUE.filter(item => !selection.languages.includes(item.code));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selection.languages.map(code => {
          const option = FALLBACK_LANGUAGE_CATALOGUE.find(item => item.code === code) || FALLBACK_LANGUAGE_CATALOGUE[0];
          return (
            <span key={code} className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
              {languageDisplayName(option)}
              {selection.languages.length > 1 && (
                <button type="button" onClick={() => removeLanguage(code)} className="rounded-full p-0.5 hover:bg-indigo-100" aria-label={`Remove ${languageDisplayName(option)}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      {selection.languages.length < 3 && (
        <div className="flex items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-slate-400" />
          <select value="" onChange={event => addLanguage(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400">
            <option value="">Add another language</option>
            {unused.map(option => <option key={option.code} value={option.code}>{option.nativeName} — {option.englishName}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

export default function DocumentLanguageStudio({
  profile,
  onChange,
  sections,
  fields = [],
  title = 'Document Language Studio',
  description = 'Choose the language independently for each part of this document. One document may mix English, Urdu, Marathi or any other enabled Indian language.',
  compact = false,
}: Props) {
  const [expanded, setExpanded] = useState(!compact);
  const [showFields, setShowFields] = useState(false);
  const fieldsBySection = useMemo(() => new Map(sections.map(section => [section.key, fields.filter(field => field.sectionKey === section.key)])), [sections, fields]);

  const updateDefault = (selection: DocumentLanguageSelection) => onChange({ ...profile, defaultSelection: selection });
  const updateSection = (key: string, selection: DocumentLanguageSelection) => onChange({ ...profile, sections: { ...profile.sections, [key]: selection } });
  const updateField = (key: string, selection: DocumentLanguageSelection) => onChange({ ...profile, fields: { ...profile.fields, [key]: selection } });
  const resetField = (key: string) => {
    const next = { ...profile.fields };
    delete next[key];
    onChange({ ...profile, fields: next });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-indigo-50/40 to-cyan-50/50 shadow-sm">
      <button type="button" onClick={() => setExpanded(value => !value)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-100"><Languages className="h-5 w-5" /></div>
          <div className="min-w-0"><h3 className="text-sm font-black text-slate-950">{title}</h3><p className="mt-1 max-w-3xl text-[10px] leading-5 text-slate-500">{description}</p></div>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-indigo-100 p-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2"><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Feature default</div><p className="mt-0.5 text-[9px] text-slate-400">Used only where a section does not override it.</p></div><select value={profile.defaultSelection.layout} onChange={event => updateDefault({ ...profile.defaultSelection, layout: event.target.value as any })} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[9px] font-black text-slate-600">{layoutOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <LanguageChips selection={profile.defaultSelection} onChange={updateDefault} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sections.map(section => {
              const selection = profile.sections[section.key] || profile.defaultSelection;
              return (
                <div key={section.key} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-2"><div><div className="text-[11px] font-black text-slate-900">{section.label}</div>{section.description && <p className="mt-0.5 text-[9px] leading-4 text-slate-400">{section.description}</p>}</div><select value={selection.layout} onChange={event => updateSection(section.key, { ...selection, layout: event.target.value as any })} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-600">{layoutOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  <LanguageChips selection={selection} onChange={next => updateSection(section.key, next)} />
                </div>
              );
            })}
          </div>

          {fields.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <button type="button" onClick={() => setShowFields(value => !value)} className="flex w-full items-center justify-between gap-3 text-left"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-indigo-600"/><div><div className="text-[11px] font-black text-slate-900">Individual field language overrides</div><p className="mt-0.5 text-[9px] text-slate-400">Use this only when one field must differ from the rest of its section.</p></div></div><ChevronDown className={`h-4 w-4 text-slate-400 transition ${showFields ? 'rotate-180' : ''}`}/></button>
              {showFields && <div className="mt-3 space-y-3">{sections.map(section => {
                const sectionFields = fieldsBySection.get(section.key) || [];
                if (!sectionFields.length) return null;
                return <div key={section.key}><div className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">{section.label}</div><div className="grid gap-2 md:grid-cols-2">{sectionFields.map(field => {
                  const inherited = profile.sections[field.sectionKey] || profile.defaultSelection;
                  const selection = profile.fields[field.key] || inherited;
                  const overridden = Boolean(profile.fields[field.key]);
                  return <div key={field.key} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-black text-slate-700">{field.label}</span>{overridden ? <button type="button" onClick={() => resetField(field.key)} className="inline-flex items-center gap-1 text-[8px] font-black text-slate-400 hover:text-indigo-600"><RotateCcw className="h-3 w-3"/>Use section</button> : <button type="button" onClick={() => updateField(field.key, { ...selection })} className="text-[8px] font-black text-indigo-600">Override</button>}</div>{overridden ? <LanguageChips selection={selection} onChange={next => updateField(field.key, next)} /> : <div className="text-[9px] text-slate-400">Inherits {selection.languages.map(code => FALLBACK_LANGUAGE_CATALOGUE.find(item => item.code === code)?.englishName || code).join(' + ')}</div>}</div>;
                })}</div></div>;
              })}</div>}
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] leading-4 text-amber-800">
            Language selection does not alter student names, GR numbers, marks or other official source data. It controls document wording/script/layout; translated statutory wording should remain school-approved and editable.
          </div>
        </div>
      )}
    </section>
  );
}
