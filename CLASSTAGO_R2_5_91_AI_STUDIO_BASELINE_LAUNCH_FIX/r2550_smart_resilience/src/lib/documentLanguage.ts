import type { CSSProperties } from 'react';
import type { Language } from '../types';
import { FALLBACK_LANGUAGE_CATALOGUE, getLanguageOption, resolvedDirection } from './languageCatalog';

export type DocumentLanguageLayout = 'single' | 'inline' | 'stacked' | 'columns';

export interface DocumentLanguageSelection {
  languages: string[];
  layout: DocumentLanguageLayout;
}

export interface DocumentLanguageProfile {
  version: 1;
  featureKey: string;
  defaultSelection: DocumentLanguageSelection;
  sections: Record<string, DocumentLanguageSelection>;
  fields: Record<string, DocumentLanguageSelection>;
}

export interface DocumentLanguageSectionDefinition {
  key: string;
  label: string;
  description?: string;
}

export interface DocumentLanguageFieldDefinition {
  key: string;
  label: string;
  sectionKey: string;
}

const cleanLanguages = (languages: unknown, fallback: string): string[] => {
  const values = Array.isArray(languages) ? languages.map(String).map(v => v.trim()).filter(Boolean) : [];
  const unique = Array.from(new Set(values));
  return (unique.length ? unique : [fallback]).slice(0, 3);
};

export function createDocumentLanguageProfile(
  featureKey: string,
  sections: DocumentLanguageSectionDefinition[],
  defaultLanguage: string = 'en',
): DocumentLanguageProfile {
  const defaultSelection: DocumentLanguageSelection = { languages: [defaultLanguage], layout: 'single' };
  return {
    version: 1,
    featureKey,
    defaultSelection,
    sections: Object.fromEntries(sections.map(section => [section.key, { ...defaultSelection }])),
    fields: {},
  };
}

export function normalizeDocumentLanguageProfile(
  raw: any,
  featureKey: string,
  sections: DocumentLanguageSectionDefinition[],
  defaultLanguage: string = 'en',
): DocumentLanguageProfile {
  const base = createDocumentLanguageProfile(featureKey, sections, defaultLanguage);
  if (!raw || typeof raw !== 'object') return base;
  const rawDefault = raw.defaultSelection || {};
  const defaultSelection: DocumentLanguageSelection = {
    languages: cleanLanguages(rawDefault.languages, defaultLanguage),
    layout: ['single', 'inline', 'stacked', 'columns'].includes(rawDefault.layout) ? rawDefault.layout : 'single',
  };
  const normalizedSections: Record<string, DocumentLanguageSelection> = {};
  for (const section of sections) {
    const candidate = raw.sections?.[section.key] || defaultSelection;
    normalizedSections[section.key] = {
      languages: cleanLanguages(candidate.languages, defaultSelection.languages[0] || defaultLanguage),
      layout: ['single', 'inline', 'stacked', 'columns'].includes(candidate.layout) ? candidate.layout : defaultSelection.layout,
    };
  }
  const normalizedFields: Record<string, DocumentLanguageSelection> = {};
  if (raw.fields && typeof raw.fields === 'object') {
    for (const [fieldKey, candidate] of Object.entries(raw.fields)) {
      const value: any = candidate;
      normalizedFields[fieldKey] = {
        languages: cleanLanguages(value?.languages, defaultSelection.languages[0] || defaultLanguage),
        layout: ['single', 'inline', 'stacked', 'columns'].includes(value?.layout) ? value.layout : defaultSelection.layout,
      };
    }
  }
  return { version: 1, featureKey, defaultSelection, sections: normalizedSections, fields: normalizedFields };
}

export function sectionSelection(profile: DocumentLanguageProfile | null | undefined, sectionKey: string): DocumentLanguageSelection {
  const fallback = profile?.defaultSelection || { languages: ['en'], layout: 'single' as const };
  return profile?.sections?.[sectionKey] || fallback;
}

export function fieldSelection(
  profile: DocumentLanguageProfile | null | undefined,
  fieldKey: string,
  sectionKey: string,
): DocumentLanguageSelection {
  return profile?.fields?.[fieldKey] || sectionSelection(profile, sectionKey);
}

export function primaryDocumentLanguage(selection: DocumentLanguageSelection | null | undefined, fallback: string = 'en'): string {
  return String(selection?.languages?.[0] || fallback);
}

export function documentLanguageDirection(language: string): 'ltr' | 'rtl' {
  return resolvedDirection(getLanguageOption(language as Language, FALLBACK_LANGUAGE_CATALOGUE));
}

export function documentLanguageFont(language: string): string {
  const option = getLanguageOption(language as Language, FALLBACK_LANGUAGE_CATALOGUE);
  switch (option.scriptCode) {
    case 'Arab': return '"Noto Nastaliq Urdu", "Noto Naskh Arabic", Georgia, serif';
    case 'Deva': return '"Noto Sans Devanagari", "Noto Sans", Arial, sans-serif';
    case 'Beng': return '"Noto Sans Bengali", "Noto Sans", Arial, sans-serif';
    case 'Gujr': return '"Noto Sans Gujarati", "Noto Sans", Arial, sans-serif';
    case 'Guru': return '"Noto Sans Gurmukhi", "Noto Sans", Arial, sans-serif';
    case 'Taml': return '"Noto Sans Tamil", "Noto Sans", Arial, sans-serif';
    case 'Telu': return '"Noto Sans Telugu", "Noto Sans", Arial, sans-serif';
    case 'Knda': return '"Noto Sans Kannada", "Noto Sans", Arial, sans-serif';
    case 'Mlym': return '"Noto Sans Malayalam", "Noto Sans", Arial, sans-serif';
    case 'Orya': return '"Noto Sans Oriya", "Noto Sans", Arial, sans-serif';
    case 'Olck': return '"Noto Sans Ol Chiki", "Noto Sans", Arial, sans-serif';
    default: return '"Noto Sans", Arial, sans-serif';
  }
}

export function documentLanguageStyle(selection: DocumentLanguageSelection | null | undefined): CSSProperties {
  const language = primaryDocumentLanguage(selection);
  const direction = documentLanguageDirection(language);
  return {
    direction,
    textAlign: direction === 'rtl' ? 'right' : 'left',
    fontFamily: documentLanguageFont(language),
  };
}

export function languageValue(
  value: Record<string, string> | null | undefined,
  language: string,
  fallbackLanguage: string = 'en',
): string {
  if (!value) return '';
  return value[language] ?? value[fallbackLanguage] ?? Object.values(value).find(Boolean) ?? '';
}

export function selectionSummary(selection: DocumentLanguageSelection, languageName: (code: string) => string): string {
  return selection.languages.map(languageName).join(' + ');
}
