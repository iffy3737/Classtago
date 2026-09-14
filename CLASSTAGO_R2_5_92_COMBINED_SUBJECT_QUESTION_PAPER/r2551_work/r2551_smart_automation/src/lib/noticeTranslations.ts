import type { Language, Notice, NoticeTranslation } from '../types';
import { getLanguageOption, resolvedDirection } from './languageCatalog';

export function resolveNoticeTranslation(notice: Notice, language: Language): NoticeTranslation {
  const code = String(language || 'en').trim().toLowerCase() || 'en';
  const exact = (notice.translations || []).find(item => String(item.languageCode || '').toLowerCase() === code);
  if (exact) return exact;

  if (code === 'hi' && notice.titleHi && notice.contentHi) {
    return { languageCode: 'hi', languageName: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', title: notice.titleHi, content: notice.contentHi };
  }
  if (code === 'ur' && notice.titleUr && notice.contentUr) {
    return { languageCode: 'ur', languageName: 'Urdu', nativeName: 'اردو', direction: 'rtl', title: notice.titleUr, content: notice.contentUr };
  }

  const primaryCode = String(notice.primaryLanguageCode || notice.translations?.[0]?.languageCode || 'en').toLowerCase();
  const primary = (notice.translations || []).find(item => String(item.languageCode || '').toLowerCase() === primaryCode) || notice.translations?.[0];
  if (primary) return primary;

  const option = getLanguageOption(primaryCode);
  return {
    languageCode: primaryCode,
    languageName: notice.primaryLanguageName || option.englishName,
    nativeName: option.nativeName,
    direction: resolvedDirection(option),
    title: notice.title,
    content: notice.content,
  };
}
