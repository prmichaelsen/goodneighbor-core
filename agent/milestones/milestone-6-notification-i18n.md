# Milestone 6: Notification & I18n

**Goal**: Implement email notification service (Mandrill) with debug capture mode, and internationalization service with en-US and es-ES translations
**Duration**: 2-3 days
**Dependencies**: M1 (types), M2 (config for email settings and Secret handling)
**Status**: Not Started

---

## Overview

This milestone adds two supporting services that complement the core business logic from M5: email notifications via the Mandrill API, and internationalization (i18n) with full en-US and es-ES translation coverage.

The NotificationService implements a dual-mode email system: when a Mandrill API key is configured, emails are sent via the Mandrill HTTP API. When no API key is present (or when debug/capture mode is enabled), emails are stored to a Firestore debug collection for testing and development. This pattern allows the full email pipeline to be exercised without sending real emails.

The I18nService provides `translate(key, language, variables?)` with `{{variableName}}` interpolation and `formatDate(date, language)` with locale-aware formatting via `Intl.DateTimeFormat`. Translation keys are organized by category (common UI, email, content, profile, errors) and ported from the goodneighbor source, excluding all cleanbook-specific keys.

Both services follow the same dependency injection and Result type patterns established in M5.

---

## Deliverables

### 1. NotificationService
- `sendEmail(to, subject, html, options)` -- sends via Mandrill when API key is present, stores to debug collection otherwise
- `storeDebugEmail(to, subject, html)` -- writes email to DEBUG_EMAILS Firestore collection with timestamp
- `getDebugEmails(limit, filters?)` -- queries debug emails with optional filters for testing verification
- Mandrill HTTP API integration using `Secret<T>` for API key handling
- Configurable capture mode independent of API key presence

### 2. I18nService
- `translate(key, language, variables?)` -- looks up translation by key and language, interpolates `{{variableName}}` patterns
- `formatDate(date, language)` -- locale-aware date formatting using `Intl.DateTimeFormat`
- Support for `"en-US"` and `"es-ES"` languages
- Missing key fallback: returns the key name itself
- Email-specific helper: `translateEmailSubject(key, language, variables?)`

### 3. Translation Files
- 250+ translation keys covering: common UI (labels, buttons, messages), email (subjects, bodies, templates), content (post types, feed types), profile (field labels, board widgets), errors (user-facing error messages)
- Both en-US and es-ES values for every key
- Organized by category for maintainability
- All cleanbook-specific keys excluded

---

## Success Criteria

- [ ] `sendEmail()` sends via Mandrill HTTP API when `MANDRILL_API_KEY` is present in config
- [ ] `sendEmail()` stores to Firestore DEBUG_EMAILS collection when API key is absent or capture mode is enabled
- [ ] `storeDebugEmail()` writes email document with to, subject, html, and timestamp fields
- [ ] `getDebugEmails()` retrieves debug emails with optional filtering by recipient or subject
- [ ] Mandrill API key is handled via `Secret<T>` and never logged in plaintext
- [ ] `translate("hello_name", "en-US", { name: "Alice" })` returns `"Hello, Alice"`
- [ ] `translate("hello_name", "es-ES", { name: "Alice" })` returns `"Hola, Alice"`
- [ ] `translate("nonexistent_key", "en-US")` returns `"nonexistent_key"` (missing key fallback)
- [ ] `formatDate()` formats dates correctly per locale (e.g., "February 28, 2026" for en-US, "28 de febrero de 2026" for es-ES)
- [ ] 250+ translation keys defined with both en-US and es-ES values
- [ ] No cleanbook-specific keys present in translation files
- [ ] All unit tests pass with mocked dependencies
- [ ] Barrel exports from `src/i18n/index.ts` expose all translation types and utilities

---

## Key Files to Create

```
src/
├── services/
│   ├── notification.service.ts      # NotificationService - Mandrill email + debug capture
│   ├── notification.service.spec.ts # Tests with mocked Firestore and HTTP
│   ├── i18n.service.ts              # I18nService - translate, formatDate
│   └── i18n.service.spec.ts         # Tests for interpolation, missing keys, date formatting
└── i18n/
    ├── index.ts                     # Barrel export for i18n module
    ├── types.ts                     # Language type ("en-US" | "es-ES"), TranslationMap type
    ├── keys.ts                      # TranslationKeys enum or const object
    ├── translations/
    │   ├── common.ts                # Shared UI translations (labels, buttons, messages)
    │   └── email.ts                 # Email-specific translations (subjects, bodies)
    └── utils.ts                     # formatDateForLanguage, translateEmailSubject helpers
```

---

## Tasks

1. [Task 23: NotificationService](../tasks/milestone-6-notification-i18n/task-23-notification-service.md) - Implement email sending via Mandrill API with debug capture mode
2. [Task 24: I18nService](../tasks/milestone-6-notification-i18n/task-24-i18n-service.md) - Implement translation with variable interpolation and locale-aware date formatting
3. [Task 25: Translation Keys & Locale Files](../tasks/milestone-6-notification-i18n/task-25-translation-files.md) - Create 250+ translation keys for en-US and es-ES

---

## Environment Variables

No new environment variables are introduced. This milestone consumes configuration already defined in M2:

```env
# Email (from M2 EmailConfigSchema)
MANDRILL_API_KEY=mandrill-key-here           # Optional (Secret) - when absent, uses debug capture mode
SUPPORT_EMAIL=support@goodneighbor.com       # Optional, default: "support@goodneighbor.com"
EMAIL_FROM_NAME=Good Neighbor                # Optional, default: "Good Neighbor"
```

---

## Testing Requirements

- [ ] NotificationService unit tests: sendEmail calls Mandrill API when key present (mock HTTP), sendEmail stores to Firestore when key absent, storeDebugEmail writes correct document structure, getDebugEmails returns stored emails with filtering
- [ ] I18nService unit tests: translate with valid key returns correct string for each language, translate with variables interpolates correctly, translate with missing key returns key name, formatDate produces locale-correct output for en-US and es-ES
- [ ] Translation file tests: all keys have both en-US and es-ES values (programmatic verification), no cleanbook keys present, barrel exports include all translation modules
- [ ] All tests use mocked Firestore (no emulator required for unit tests)

---

## Documentation Requirements

- [ ] JSDoc comments on NotificationService methods documenting Mandrill integration and debug capture behavior
- [ ] JSDoc comments on I18nService methods documenting interpolation syntax and fallback behavior
- [ ] JSDoc comments on Language type documenting supported locales
- [ ] Inline comments in translation files explaining category organization
- [ ] Inline comments in utils.ts documenting the formatDateForLanguage locale options

---

## Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Mandrill API changes or deprecation | High | Low | Wrap API calls in service methods; HTTP API is stable and widely used |
| Translation key typos causing silent misses | Medium | Medium | Programmatic test verifying all keys have both language values; TypeScript enum/const for key names |
| Missing translations in es-ES (incomplete port) | Medium | Medium | Test that every key in en-US also exists in es-ES; port systematically from source |
| Intl.DateTimeFormat locale behavior varies across Node versions | Low | Low | Pin Node.js 18+ requirement; test date formatting explicitly |
| Debug email collection grows unbounded | Low | Medium | Document need for periodic cleanup; consider TTL or limit in getDebugEmails |

---

**Next Milestone**: Milestone 7: ServiceContainer, Build & Publish
**Blockers**: M1 (types) and M2 (config/secrets) must be complete; M5 is not a hard dependency but should be completed first for consistent patterns
**Notes**:
- The NotificationService is independent of M5 core services and could theoretically be developed in parallel with M5, but following the same patterns is important.
- The I18nService is a standalone utility service with no Firebase dependency for translate/formatDate -- only the NotificationService needs Firebase for debug email storage.
- Translation keys should be ported from `/home/prmichaelsen/goodneighbor/src/` i18n files, carefully excluding cleanbook-specific entries.
- The `translateEmailSubject` helper in utils.ts is used by NotificationService to localize email subjects before sending.
