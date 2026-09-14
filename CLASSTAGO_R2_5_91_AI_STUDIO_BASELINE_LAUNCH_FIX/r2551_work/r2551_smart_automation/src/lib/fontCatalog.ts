import { Language } from '../types';
import { LanguageOption, getLanguageOption } from './languageCatalog';

export type FontUsage = 'interface' | 'academic' | 'document';

export interface FontOption {
  id?: string;
  code: string;
  family: string;
  displayName: string;
  category: 'sans' | 'serif' | 'nastaliq' | 'naskh';
  googleFamily?: string | null;
  scripts: string[];
  usages: FontUsage[];
  recommendedFor?: FontUsage[];
  sortOrder?: number;
}

const font = (
  code: string,
  family: string,
  displayName: string,
  category: FontOption['category'],
  scripts: string[],
  usages: FontUsage[],
  recommendedFor: FontUsage[] = [],
  googleFamily: string | null = family
): FontOption => ({ code, family, displayName, category, scripts, usages, recommendedFor, googleFamily });

/**
 * Safe bootstrap catalogue. The live database catalogue can extend this list
 * without changing the UI. No font files are bundled in the application.
 */
export const FALLBACK_FONT_CATALOGUE: FontOption[] = [
  font('noto-sans', 'Noto Sans', 'Noto Sans', 'sans', ['Latn'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif', 'Noto Serif', 'Noto Serif', 'serif', ['Latn'], ['academic', 'document'], ['document']),

  font('noto-sans-devanagari', 'Noto Sans Devanagari', 'Noto Sans Devanagari', 'sans', ['Deva'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-devanagari', 'Noto Serif Devanagari', 'Noto Serif Devanagari', 'serif', ['Deva'], ['academic', 'document'], ['document']),

  font('noto-sans-arabic', 'Noto Sans Arabic', 'Noto Sans Arabic', 'sans', ['Arab'], ['interface', 'academic', 'document'], ['interface']),
  font('noto-naskh-arabic', 'Noto Naskh Arabic', 'Noto Naskh Arabic', 'naskh', ['Arab'], ['interface', 'academic', 'document'], ['academic']),
  font('noto-nastaliq-urdu', 'Noto Nastaliq Urdu', 'Noto Nastaliq Urdu', 'nastaliq', ['Arab'], ['academic', 'document'], ['document']),

  font('noto-sans-bengali', 'Noto Sans Bengali', 'Noto Sans Bengali', 'sans', ['Beng'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-bengali', 'Noto Serif Bengali', 'Noto Serif Bengali', 'serif', ['Beng'], ['academic', 'document'], ['document']),

  font('noto-sans-gujarati', 'Noto Sans Gujarati', 'Noto Sans Gujarati', 'sans', ['Gujr'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-gujarati', 'Noto Serif Gujarati', 'Noto Serif Gujarati', 'serif', ['Gujr'], ['academic', 'document'], ['document']),

  font('noto-sans-gurmukhi', 'Noto Sans Gurmukhi', 'Noto Sans Gurmukhi', 'sans', ['Guru'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-gurmukhi', 'Noto Serif Gurmukhi', 'Noto Serif Gurmukhi', 'serif', ['Guru'], ['academic', 'document'], ['document']),

  font('noto-sans-kannada', 'Noto Sans Kannada', 'Noto Sans Kannada', 'sans', ['Knda'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-kannada', 'Noto Serif Kannada', 'Noto Serif Kannada', 'serif', ['Knda'], ['academic', 'document'], ['document']),

  font('noto-sans-malayalam', 'Noto Sans Malayalam', 'Noto Sans Malayalam', 'sans', ['Mlym'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-malayalam', 'Noto Serif Malayalam', 'Noto Serif Malayalam', 'serif', ['Mlym'], ['academic', 'document'], ['document']),

  font('noto-sans-oriya', 'Noto Sans Oriya', 'Noto Sans Odia', 'sans', ['Orya'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-oriya', 'Noto Serif Oriya', 'Noto Serif Odia', 'serif', ['Orya'], ['academic', 'document'], ['document']),

  font('noto-sans-tamil', 'Noto Sans Tamil', 'Noto Sans Tamil', 'sans', ['Taml'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-tamil', 'Noto Serif Tamil', 'Noto Serif Tamil', 'serif', ['Taml'], ['academic', 'document'], ['document']),

  font('noto-sans-telugu', 'Noto Sans Telugu', 'Noto Sans Telugu', 'sans', ['Telu'], ['interface', 'academic', 'document'], ['interface', 'academic']),
  font('noto-serif-telugu', 'Noto Serif Telugu', 'Noto Serif Telugu', 'serif', ['Telu'], ['academic', 'document'], ['document']),

  font('noto-sans-meetei-mayek', 'Noto Sans Meetei Mayek', 'Noto Sans Meetei Mayek', 'sans', ['Mtei'], ['interface', 'academic', 'document'], ['interface', 'academic', 'document']),
  font('noto-sans-ol-chiki', 'Noto Sans Ol Chiki', 'Noto Sans Ol Chiki', 'sans', ['Olck'], ['interface', 'academic', 'document'], ['interface', 'academic', 'document'])
].map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));

export function normalizeFontCode(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function getFontsForLanguage(
  language: Language,
  usage: FontUsage,
  languages: LanguageOption[],
  fonts: FontOption[] = FALLBACK_FONT_CATALOGUE
): FontOption[] {
  const script = getLanguageOption(language, languages).scriptCode;
  return fonts
    .filter(item => item.scripts.includes(script) && item.usages.includes(usage))
    .sort((a, b) => {
      const aRecommended = a.recommendedFor?.includes(usage) ? 0 : 1;
      const bRecommended = b.recommendedFor?.includes(usage) ? 0 : 1;
      return aRecommended - bRecommended || (a.sortOrder || 1000) - (b.sortOrder || 1000) || a.displayName.localeCompare(b.displayName);
    });
}

export function getRecommendedFont(
  language: Language,
  usage: FontUsage,
  languages: LanguageOption[],
  fonts: FontOption[] = FALLBACK_FONT_CATALOGUE
): FontOption {
  const compatible = getFontsForLanguage(language, usage, languages, fonts);
  return compatible.find(item => item.recommendedFor?.includes(usage))
    || compatible[0]
    || FALLBACK_FONT_CATALOGUE[0];
}

export function resolveFont(
  code: string | null | undefined,
  language: Language,
  usage: FontUsage,
  languages: LanguageOption[],
  fonts: FontOption[] = FALLBACK_FONT_CATALOGUE
): FontOption {
  const compatible = getFontsForLanguage(language, usage, languages, fonts);
  const normalized = normalizeFontCode(code);
  return compatible.find(item => item.code === normalized)
    || getRecommendedFont(language, usage, languages, fonts);
}

export function fontCssStack(fontOption: FontOption): string {
  const generic = fontOption.category === 'sans' ? 'sans-serif' : 'serif';
  return `"${fontOption.family}", "Noto Sans", system-ui, ${generic}`;
}

const loadedFontCodes = new Set<string>();

export function ensureWebFontLoaded(fontOption: FontOption): void {
  if (typeof document === 'undefined' || !fontOption.googleFamily || loadedFontCodes.has(fontOption.code)) return;
  const id = `edunixo-font-${fontOption.code}`;
  if (document.getElementById(id)) {
    loadedFontCodes.add(fontOption.code);
    return;
  }
  const family = encodeURIComponent(fontOption.googleFamily).replace(/%20/g, '+');
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
  loadedFontCodes.add(fontOption.code);
}

export function fontPreviewText(language: Language, languages: LanguageOption[]): string {
  const option = getLanguageOption(language, languages);
  const samples: Record<string, string> = {
    Latn: 'Education builds a better future.',
    Deva: 'शिक्षा बेहतर भविष्य का निर्माण करती है।',
    Arab: 'تعلیم ایک بہتر مستقبل بناتی ہے۔',
    Beng: 'শিক্ষা একটি উন্নত ভবিষ্যৎ গড়ে তোলে।',
    Gujr: 'શિક્ષણ વધુ સારું ભવિષ્ય બનાવે છે.',
    Guru: 'ਸਿੱਖਿਆ ਇੱਕ ਬਿਹਤਰ ਭਵਿੱਖ ਬਣਾਉਂਦੀ ਹੈ।',
    Knda: 'ಶಿಕ್ಷಣ ಉತ್ತಮ ಭವಿಷ್ಯವನ್ನು ನಿರ್ಮಿಸುತ್ತದೆ.',
    Mlym: 'വിദ്യാഭ്യാസം മികച്ച ഭാവി സൃഷ്ടിക്കുന്നു.',
    Orya: 'ଶିକ୍ଷା ଏକ ଉତ୍ତମ ଭବିଷ୍ୟତ ଗଢ଼େ।',
    Taml: 'கல்வி சிறந்த எதிர்காலத்தை உருவாக்குகிறது.',
    Telu: 'విద్య మెరుగైన భవిష్యత్తును నిర్మిస్తుంది.',
    Mtei: 'ꯃꯍꯩ ꯃꯇꯧꯁꯤꯡꯅ ꯐꯖꯕ ꯇꯨꯡꯂꯝ ꯁꯦꯝꯒꯠꯂꯤ།',
    Olck: 'ᱥᱮᱪᱮᱫ ᱵᱷᱟᱜᱮ ᱵᱷᱚᱵᱤᱥᱭᱚᱛ ᱵᱮᱱᱟᱣᱟ।'
  };
  return samples[option.scriptCode] || option.nativeName;
}
