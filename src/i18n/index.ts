// src/i18n/index.ts

export type { Language, TranslationMap, Translations, DateFormatOptions } from './types';
export {
  translate,
  formatDate,
  hasKey,
  getKeys,
  translateEmailSubject,
  formatDateForLanguage,
  formatDateTimeForLanguage,
  resetTranslationsCache,
} from './utils';
export { buildTranslations } from './translations/common';
export { EMAIL_TRANSLATIONS } from './translations/email';
