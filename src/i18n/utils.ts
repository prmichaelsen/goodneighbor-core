// src/i18n/utils.ts
// I18n utility functions: translate, formatDate, helpers.

import type { Language, DateFormatOptions, Translations } from './types';
import { buildTranslations } from './translations/common';

let cachedTranslations: Translations | null = null;

function getTranslations(): Translations {
  if (!cachedTranslations) {
    cachedTranslations = buildTranslations();
  }
  return cachedTranslations;
}

/**
 * Translate a key to the given language with optional variable interpolation.
 * Variables use {{variableName}} syntax.
 * Returns the key itself if no translation is found.
 */
export function translate(
  key: string,
  language: Language,
  variables?: Record<string, string>,
): string {
  const translations = getTranslations();
  const map = translations[language];
  const template = map?.[key] ?? key;

  if (!variables) return template;

  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, varName) => variables[varName] ?? `{{${varName}}}`,
  );
}

/**
 * Format a date for the given language using Intl.DateTimeFormat.
 */
export function formatDate(
  date: Date | string,
  language: Language,
  options?: DateFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = language; // BCP 47 locale tags work directly
  const formatOptions: Intl.DateTimeFormatOptions = {};

  if (options?.dateStyle) formatOptions.dateStyle = options.dateStyle;
  if (options?.timeStyle) formatOptions.timeStyle = options.timeStyle;

  // Default to medium date style if no options provided
  if (!options?.dateStyle && !options?.timeStyle) {
    formatOptions.dateStyle = 'medium';
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
}

/**
 * Check if a translation key exists for the given language.
 */
export function hasKey(key: string, language: Language): boolean {
  const translations = getTranslations();
  return key in (translations[language] ?? {});
}

/**
 * Get all translation keys for a language.
 */
export function getKeys(language: Language): string[] {
  const translations = getTranslations();
  return Object.keys(translations[language] ?? {});
}

// ─── Convenience Helpers ────────────────────────────────────────────────

/**
 * Translate an email subject line.
 */
export function translateEmailSubject(
  key: string,
  language: Language,
  variables?: Record<string, string>,
): string {
  return translate(key, language, variables);
}

/**
 * Format a date for display (date only).
 */
export function formatDateForLanguage(
  date: Date | string,
  language: Language,
): string {
  return formatDate(date, language, { dateStyle: 'long' });
}

/**
 * Format a date and time for display.
 */
export function formatDateTimeForLanguage(
  date: Date | string,
  language: Language,
): string {
  return formatDate(date, language, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Reset the cached translations (for testing).
 */
export function resetTranslationsCache(): void {
  cachedTranslations = null;
}
