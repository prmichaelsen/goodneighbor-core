// src/i18n/types.ts

export type Language = 'en-US' | 'es-ES';

export type TranslationMap = Record<string, string>;

export type Translations = Record<Language, TranslationMap>;

export interface DateFormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}
