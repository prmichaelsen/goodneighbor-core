# Task 24: I18nService

**Milestone**: [M6 - Notification & I18n](../../milestones/milestone-6-notification-i18n.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 1 (common types)
**Status**: Not Started

---

## Objective

Implement I18nService with `translate(key, language, variables?)` supporting `{{variableName}}` interpolation and `formatDate(date, language)` with locale-aware formatting. The service supports two languages: `"en-US"` and `"es-ES"`. Missing keys fall back to returning the key name itself. Additionally, create the i18n module structure with types, keys, and utility functions.

---

## Context

The goodneighbor app has an i18n system with 250+ translation keys covering UI labels, buttons, messages, email subjects/bodies, content type names, profile field labels, and error messages. The I18nService extracts this into the core library so that translation logic is available to any consumer (Next.js frontend, MCP server, email templates, CLI tools).

The translation system is intentionally simple:
- Flat key-value maps per language (no nested namespaces)
- `{{variableName}}` interpolation syntax (double curly braces)
- Missing key returns the key name itself (never throws)
- Two languages for now: en-US and es-ES (cleanbook-specific keys excluded)

The `formatDate` method uses `Intl.DateTimeFormat` which is built into Node.js 18+ and provides proper locale-aware date formatting without external libraries.

---

## Steps

### 1. Create i18n/types.ts

Define the Language type and translation map types.

```typescript
// src/i18n/types.ts

export type Language = "en-US" | "es-ES";

export type TranslationMap = Record<string, string>;

export type Translations = Record<Language, TranslationMap>;

export interface TranslateOptions {
  variables?: Record<string, string | number>;
}

export const SUPPORTED_LANGUAGES: Language[] = ["en-US", "es-ES"];

export const DEFAULT_LANGUAGE: Language = "en-US";
```

### 2. Create i18n/keys.ts

Define translation keys as a const object (or enum) for type-safe key references. Organize keys by category using dot-separated naming convention.

```typescript
// src/i18n/keys.ts

export const TranslationKeys = {
  // Common UI
  COMMON_SAVE: "common.save",
  COMMON_CANCEL: "common.cancel",
  COMMON_DELETE: "common.delete",
  COMMON_EDIT: "common.edit",
  COMMON_SUBMIT: "common.submit",
  COMMON_LOADING: "common.loading",
  COMMON_ERROR: "common.error",
  COMMON_SUCCESS: "common.success",
  // ... (250+ keys will be defined in Task 25)

  // Email
  EMAIL_WELCOME_SUBJECT: "email.welcome.subject",
  EMAIL_WELCOME_BODY: "email.welcome.body",
  EMAIL_PASSWORD_RESET_SUBJECT: "email.password_reset.subject",
  // ...

  // Content
  CONTENT_POST: "content.post",
  CONTENT_FEED: "content.feed",
  // ...

  // Errors
  ERROR_NOT_FOUND: "error.not_found",
  ERROR_UNAUTHORIZED: "error.unauthorized",
  // ...
} as const;

export type TranslationKey = typeof TranslationKeys[keyof typeof TranslationKeys];
```

### 3. Create I18nService

Create `src/services/i18n.service.ts`. The service is stateless and does not require Firestore or other dependencies -- it operates purely on the in-memory translation maps.

```typescript
// src/services/i18n.service.ts

import { Language, Translations, DEFAULT_LANGUAGE } from "../i18n/types";

export class I18nService {
  private translations: Translations;

  constructor(translations: Translations) {
    this.translations = translations;
  }

  /**
   * Translate a key to the specified language with optional variable interpolation.
   * Variables use {{variableName}} syntax.
   * Returns the key name if no translation is found.
   */
  translate(key: string, language: Language, variables?: Record<string, string | number>): string {
    const languageMap = this.translations[language];
    let result = languageMap?.[key];

    if (result === undefined) {
      // Fallback to default language
      result = this.translations[DEFAULT_LANGUAGE]?.[key];
    }

    if (result === undefined) {
      // Return key name as final fallback
      return key;
    }

    // Interpolate variables
    if (variables) {
      for (const [varName, varValue] of Object.entries(variables)) {
        result = result.replace(
          new RegExp(`\\{\\{${varName}\\}\\}`, "g"),
          String(varValue)
        );
      }
    }

    return result;
  }

  /**
   * Format a date according to the specified language's locale conventions.
   * Uses Intl.DateTimeFormat for locale-aware formatting.
   */
  formatDate(
    date: Date | string,
    language: Language,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...options,
    };
    return new Intl.DateTimeFormat(language, defaultOptions).format(dateObj);
  }

  /**
   * Check if a translation key exists for the given language.
   */
  hasKey(key: string, language: Language): boolean {
    return key in (this.translations[language] ?? {});
  }

  /**
   * Get all keys for a given language.
   */
  getKeys(language: Language): string[] {
    return Object.keys(this.translations[language] ?? {});
  }
}
```

### 4. Create i18n/utils.ts

Create utility functions for common i18n operations, particularly email-related helpers.

```typescript
// src/i18n/utils.ts

import { Language } from "./types";
import { I18nService } from "../services/i18n.service";

/**
 * Translate an email subject line with variable interpolation.
 * Convenience wrapper for email-specific translations.
 */
export function translateEmailSubject(
  i18n: I18nService,
  key: string,
  language: Language,
  variables?: Record<string, string | number>
): string {
  return i18n.translate(key, language, variables);
}

/**
 * Format a date for the given language using a date-only format (no time).
 * Suitable for display in email bodies and UI date fields.
 */
export function formatDateForLanguage(
  date: Date | string,
  language: Language
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * Format a date with time for the given language.
 * Suitable for timestamps in activity feeds and notifications.
 */
export function formatDateTimeForLanguage(
  date: Date | string,
  language: Language
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateObj);
}
```

### 5. Create i18n/index.ts Barrel Export

```typescript
// src/i18n/index.ts

export { Language, TranslationMap, Translations, TranslateOptions, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./types";
export { TranslationKeys, TranslationKey } from "./keys";
export { translateEmailSubject, formatDateForLanguage, formatDateTimeForLanguage } from "./utils";
```

### 6. Write Unit Tests

Create `src/services/i18n.service.spec.ts` with the following test cases:

- **translate with valid key en-US**: Provide translations map with key "hello" -> "Hello". Verify "Hello" returned.
- **translate with valid key es-ES**: Provide translations map with key "hello" -> "Hola". Verify "Hola" returned.
- **translate with variable interpolation**: `translate("hello_name", "en-US", { name: "Alice" })` with translation `"Hello, {{name}}"` returns `"Hello, Alice"`.
- **translate with multiple variables**: `translate("greeting", "en-US", { name: "Bob", count: 5 })` with translation `"Hi {{name}}, you have {{count}} messages"` returns `"Hi Bob, you have 5 messages"`.
- **translate with repeated variable**: Translation contains `{{name}}` twice. Verify both occurrences are replaced.
- **translate missing key**: Provide a key that does not exist. Verify the key name is returned as-is.
- **translate fallback to default language**: Key exists in en-US but not in es-ES. When translating with es-ES, verify fallback to en-US value.
- **translate with no variables provided**: Translation contains no `{{}}` patterns. Verify string returned as-is.
- **formatDate en-US**: Format `new Date("2026-02-28")` with en-US. Verify output contains "February" and "28" and "2026".
- **formatDate es-ES**: Format `new Date("2026-02-28")` with es-ES. Verify output contains "febrero" and "28" and "2026".
- **formatDate with string input**: Pass ISO string instead of Date object. Verify correct formatting.
- **formatDate with custom options**: Pass options `{ month: "short" }`. Verify short month format.
- **hasKey returns true for existing key**: Verify `hasKey("hello", "en-US")` returns true.
- **hasKey returns false for missing key**: Verify `hasKey("nonexistent", "en-US")` returns false.
- **translateEmailSubject utility**: Verify the utility function delegates correctly to I18nService.translate.
- **formatDateForLanguage utility**: Verify the utility function formats dates correctly.

---

## Verification

- [ ] `translate("hello_name", "en-US", { name: "Alice" })` returns `"Hello, Alice"` given translation `"Hello, {{name}}"`
- [ ] `translate("hello_name", "es-ES", { name: "Alice" })` returns `"Hola, Alice"` given translation `"Hola, {{name}}"`
- [ ] `translate("nonexistent_key", "en-US")` returns `"nonexistent_key"` (key name as fallback)
- [ ] `translate` falls back to DEFAULT_LANGUAGE (en-US) when key is missing in requested language
- [ ] `translate` replaces all occurrences of `{{variable}}` in the template string
- [ ] `translate` handles numeric variable values by converting to string
- [ ] `formatDate(new Date("2026-02-28"), "en-US")` produces locale-correct output (e.g., "February 28, 2026")
- [ ] `formatDate(new Date("2026-02-28"), "es-ES")` produces locale-correct output (e.g., "28 de febrero de 2026")
- [ ] `formatDate` accepts both Date objects and ISO 8601 strings
- [ ] `hasKey` correctly reports key existence per language
- [ ] I18nService accepts translations map via constructor (pure, no Firebase dependency)
- [ ] `i18n/index.ts` barrel exports all types, keys, and utility functions
- [ ] All tests pass without external dependencies

---

## Expected Output

**File Structure**:
```
src/
├── services/
│   ├── i18n.service.ts          # I18nService class with translate, formatDate, hasKey, getKeys
│   └── i18n.service.spec.ts     # 16+ test cases
└── i18n/
    ├── index.ts                 # Barrel export
    ├── types.ts                 # Language, TranslationMap, Translations, SUPPORTED_LANGUAGES
    ├── keys.ts                  # TranslationKeys const object, TranslationKey type
    └── utils.ts                 # translateEmailSubject, formatDateForLanguage, formatDateTimeForLanguage
```

**Key Files Created**:
- `i18n.service.ts`: I18nService with translate (interpolation), formatDate (locale-aware), hasKey, getKeys
- `i18n.service.spec.ts`: Comprehensive unit tests for interpolation, missing keys, date formatting
- `i18n/types.ts`: Language type, translation map types, supported languages constant
- `i18n/keys.ts`: TranslationKeys const object for type-safe key references
- `i18n/utils.ts`: Email and date formatting utility functions
- `i18n/index.ts`: Barrel export for the i18n module

---

## Notes

- The I18nService is intentionally stateless and does not depend on Firestore, Firebase, or any external service. It operates purely on the in-memory translation maps passed to its constructor. This makes it trivially testable and usable in any context.
- The `{{variableName}}` interpolation syntax uses a simple regex replacement. This is sufficient for the goodneighbor use case and avoids adding a templating library dependency.
- The `Intl.DateTimeFormat` API is built into Node.js 18+ and handles all the locale-specific formatting rules (month names, date order, etc.) without external libraries.
- The `TranslationKeys` const object (rather than an enum) is preferred because it produces cleaner JavaScript output and allows tree-shaking.
- The actual translation values (250+ keys for both languages) are defined in Task 25. This task defines the structure; Task 25 fills in the content.
- The fallback chain is: requested language -> default language (en-US) -> key name itself.

---

**Next Task**: [Task 25: Translation Keys & Locale Files](./task-25-translation-files.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
