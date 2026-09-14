import { FALLBACK_LANGUAGE_CATALOGUE, getLanguageOption } from '../../../lib/languageCatalog';

export type AcademicTextDirection = 'ltr' | 'rtl';
export type AcademicScriptClass =
  | 'latin'
  | 'nastaliq'
  | 'arabic'
  | 'devanagari'
  | 'bengali'
  | 'gujarati'
  | 'gurmukhi'
  | 'kannada'
  | 'malayalam'
  | 'odia'
  | 'tamil'
  | 'telugu'
  | 'meetei'
  | 'olchiki';

export type AcademicTextPresentation = {
  dir: AcademicTextDirection;
  scriptClass: AcademicScriptClass;
  languageCode: string;
  className: string;
};

const RTL_LANGUAGE_CODES = new Set(['ur', 'ks', 'sd', 'ar', 'fa', 'ps', 'he']);
const NASTALIQ_CODES = new Set(['ur', 'ks', 'sd']);

const languageByName = (hint: string) => {
  const normalized = hint.trim().toLowerCase();
  if (!normalized) return null;
  return FALLBACK_LANGUAGE_CATALOGUE.find((option) => {
    const names = [String(option.code), option.englishName, option.nativeName].map((value) => value.trim().toLowerCase());
    return names.some((value) => normalized === value || normalized.includes(value));
  }) || null;
};

const scriptFromCode = (scriptCode?: string | null): AcademicScriptClass => {
  switch (String(scriptCode || '')) {
    case 'Arab': return 'nastaliq';
    case 'Deva': return 'devanagari';
    case 'Beng': return 'bengali';
    case 'Gujr': return 'gujarati';
    case 'Guru': return 'gurmukhi';
    case 'Knda': return 'kannada';
    case 'Mlym': return 'malayalam';
    case 'Orya': return 'odia';
    case 'Taml': return 'tamil';
    case 'Telu': return 'telugu';
    case 'Mtei': return 'meetei';
    case 'Olck': return 'olchiki';
    default: return 'latin';
  }
};

const countMatches = (text: string, regex: RegExp) => (text.match(regex) || []).length;

function detectScriptFromText(text: string): AcademicScriptClass | null {
  const sample = String(text || '').slice(0, 12000);
  if (!sample) return null;
  const candidates: Array<[AcademicScriptClass, number]> = [
    ['nastaliq', countMatches(sample, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)],
    ['devanagari', countMatches(sample, /[\u0900-\u097F]/g)],
    ['bengali', countMatches(sample, /[\u0980-\u09FF]/g)],
    ['gurmukhi', countMatches(sample, /[\u0A00-\u0A7F]/g)],
    ['gujarati', countMatches(sample, /[\u0A80-\u0AFF]/g)],
    ['odia', countMatches(sample, /[\u0B00-\u0B7F]/g)],
    ['tamil', countMatches(sample, /[\u0B80-\u0BFF]/g)],
    ['telugu', countMatches(sample, /[\u0C00-\u0C7F]/g)],
    ['kannada', countMatches(sample, /[\u0C80-\u0CFF]/g)],
    ['malayalam', countMatches(sample, /[\u0D00-\u0D7F]/g)],
    ['meetei', countMatches(sample, /[\uABC0-\uABFF]/g)],
    ['olchiki', countMatches(sample, /[\u1C50-\u1C7F]/g)],
    ['latin', countMatches(sample, /[A-Za-z]/g)],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] >= 2 ? candidates[0][0] : null;
}

export function resolveAcademicTextPresentation(input: {
  languageCode?: string | null;
  languageHint?: string | null;
  text?: string | null;
}): AcademicTextPresentation {
  const requestedCode = String(input.languageCode || '').trim().toLowerCase();
  const hint = String(input.languageHint || '').trim();
  const explicitOption = requestedCode && !['auto', 'other'].includes(requestedCode)
    ? getLanguageOption(requestedCode)
    : null;
  const hintedOption = languageByName(hint);
  const option = explicitOption || hintedOption;
  const detectedScript = detectScriptFromText(String(input.text || ''));

  let languageCode = String(option?.code || requestedCode || 'auto').toLowerCase();
  let scriptClass = option ? scriptFromCode(option.scriptCode) : detectedScript || 'latin';

  // When Auto/School Medium is generic, trust the generated Unicode script.
  // This is what fixes Urdu content that was previously rendered LTR merely
  // because the selector value itself was "auto".
  if ((!option || /school medium|subject \/ school medium|automatic/i.test(hint)) && detectedScript) {
    scriptClass = detectedScript;
  }

  if (scriptClass === 'nastaliq' && languageCode && !NASTALIQ_CODES.has(languageCode) && RTL_LANGUAGE_CODES.has(languageCode)) {
    scriptClass = 'arabic';
  }

  const dir: AcademicTextDirection = RTL_LANGUAGE_CODES.has(languageCode) || scriptClass === 'nastaliq' || scriptClass === 'arabic'
    ? 'rtl'
    : 'ltr';

  return {
    dir,
    scriptClass,
    languageCode,
    className: `academic-output-text academic-script-${scriptClass}`,
  };
}
