import { Language } from '../types';

export type TextDirection = 'ltr' | 'rtl' | 'auto';

export interface LanguageOption {
  id?: string;
  code: Language;
  englishName: string;
  nativeName: string;
  scriptCode: string;
  direction: TextDirection;
  localeCode?: string | null;
  isPreferred?: boolean;
  purposes?: {
    interface: boolean;
    academic: boolean;
    document: boolean;
  };
}

/**
 * Offline/bootstrap catalogue only. The live selector is populated from the
 * database catalogue, so additional languages never require a schema change.
 */
export const FALLBACK_LANGUAGE_CATALOGUE: LanguageOption[] = [
  ['en', 'English', 'English', 'Latn', 'ltr', 'en-IN'],
  ['hi', 'Hindi', 'हिन्दी', 'Deva', 'ltr', 'hi-IN'],
  ['ur', 'Urdu', 'اردو', 'Arab', 'rtl', 'ur-IN'],
  ['as', 'Assamese', 'অসমীয়া', 'Beng', 'ltr', 'as-IN'],
  ['bn', 'Bengali', 'বাংলা', 'Beng', 'ltr', 'bn-IN'],
  ['brx', 'Bodo', 'बड़ो', 'Deva', 'ltr', 'brx-IN'],
  ['doi', 'Dogri', 'डोगरी', 'Deva', 'ltr', 'doi-IN'],
  ['gu', 'Gujarati', 'ગુજરાતી', 'Gujr', 'ltr', 'gu-IN'],
  ['kn', 'Kannada', 'ಕನ್ನಡ', 'Knda', 'ltr', 'kn-IN'],
  ['ks', 'Kashmiri', 'کٲشُر', 'Arab', 'rtl', 'ks-IN'],
  ['kok', 'Konkani', 'कोंकणी', 'Deva', 'ltr', 'kok-IN'],
  ['mai', 'Maithili', 'मैथिली', 'Deva', 'ltr', 'mai-IN'],
  ['ml', 'Malayalam', 'മലയാളം', 'Mlym', 'ltr', 'ml-IN'],
  ['mni', 'Manipuri', 'ꯃꯤꯇꯩ ꯂꯣꯟ', 'Mtei', 'ltr', 'mni-IN'],
  ['mr', 'Marathi', 'मराठी', 'Deva', 'ltr', 'mr-IN'],
  ['ne', 'Nepali', 'नेपाली', 'Deva', 'ltr', 'ne-IN'],
  ['or', 'Odia', 'ଓଡ଼ିଆ', 'Orya', 'ltr', 'or-IN'],
  ['pa', 'Punjabi', 'ਪੰਜਾਬੀ', 'Guru', 'ltr', 'pa-IN'],
  ['sa', 'Sanskrit', 'संस्कृतम्', 'Deva', 'ltr', 'sa-IN'],
  ['sat', 'Santali', 'ᱥᱟᱱᱛᱟᱲᱤ', 'Olck', 'ltr', 'sat-IN'],
  ['sd', 'Sindhi', 'سنڌي', 'Arab', 'rtl', 'sd-IN'],
  ['ta', 'Tamil', 'தமிழ்', 'Taml', 'ltr', 'ta-IN'],
  ['te', 'Telugu', 'తెలుగు', 'Telu', 'ltr', 'te-IN']
].map(([code, englishName, nativeName, scriptCode, direction, localeCode]) => ({
  code,
  englishName,
  nativeName,
  scriptCode,
  direction: direction as TextDirection,
  localeCode
}));

export function normalizeLanguageCode(value?: string | null): Language {
  return String(value || 'en').trim().toLowerCase() || 'en';
}

export function getLanguageOption(
  code: Language,
  options: LanguageOption[] = FALLBACK_LANGUAGE_CATALOGUE
): LanguageOption {
  const normalized = normalizeLanguageCode(code);
  return options.find(option => option.code === normalized)
    || FALLBACK_LANGUAGE_CATALOGUE.find(option => option.code === normalized)
    || { code: normalized, englishName: normalized.toUpperCase(), nativeName: normalized.toUpperCase(), scriptCode: 'Zyyy', direction: 'auto' };
}

export function languageDisplayName(option: LanguageOption): string {
  return option.nativeName === option.englishName
    ? option.englishName
    : `${option.nativeName} — ${option.englishName}`;
}

export function resolvedDirection(option: LanguageOption): 'ltr' | 'rtl' {
  return option.direction === 'rtl' ? 'rtl' : 'ltr';
}
