# Task 25: Translation Keys & Locale Files

**Milestone**: [M6 - Notification & I18n](../../milestones/milestone-6-notification-i18n.md)
**Estimated Time**: 4 hours
**Dependencies**: Task 24 (I18nService)
**Status**: Not Started

---

## Objective

Create 250+ translation keys for en-US and es-ES covering all goodneighbor platform features. Translation content is ported from the goodneighbor source application, excluding all cleanbook-specific keys (cleaning appointments, Guesty, Mellow, daily digest, manager notifications, cleaner-related strings). Keys are organized by category: common UI, email, content, profile, and errors. A programmatic test verifies all keys have both language values.

---

## Context

The goodneighbor app has a comprehensive i18n system with translations covering every user-facing string in the application. These translations need to be ported to goodneighbor-core so that any consumer (Next.js frontend, MCP server, email service, CLI) can produce localized output.

The translation keys are organized into two files:
- `i18n/translations/common.ts` -- shared translations used across the application (UI labels, buttons, messages, content types, profile fields, error messages)
- `i18n/translations/email.ts` -- email-specific translations (subjects, body templates, greeting/signature text)

The source of truth for translation values is the goodneighbor Next.js application at `/home/prmichaelsen/goodneighbor/src/`. Keys should be ported as-is (preserving the exact English and Spanish text) unless they are cleanbook-specific.

**Cleanbook keys to exclude**: Any key containing or related to: clean, cleaning, appointment, cleaner, guesty, mellow, daily_digest, manager_notification, property_management, maintenance, booking, schedule (in the cleaning context).

---

## Steps

### 1. Create i18n/translations/common.ts

Define the shared translation maps for both languages. Organize by category using dot-separated key naming.

```typescript
// src/i18n/translations/common.ts

import { Translations } from "../types";

export const commonTranslations: Translations = {
  "en-US": {
    // === Common UI ===
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.submit": "Submit",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.success": "Success",
    "common.confirm": "Confirm",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.sort": "Sort",
    "common.share": "Share",
    "common.report": "Report",
    "common.block": "Block",
    "common.unblock": "Unblock",
    "common.follow": "Follow",
    "common.unfollow": "Unfollow",
    "common.like": "Like",
    "common.unlike": "Unlike",
    "common.reply": "Reply",
    "common.comment": "Comment",
    "common.post": "Post",
    "common.see_more": "See more",
    "common.see_less": "See less",
    "common.view_all": "View all",
    "common.no_results": "No results found",
    "common.try_again": "Try again",
    "common.learn_more": "Learn more",
    "common.sign_in": "Sign in",
    "common.sign_out": "Sign out",
    "common.sign_up": "Sign up",
    "common.welcome": "Welcome",
    "common.hello_name": "Hello, {{name}}",
    "common.items_count": "{{count}} items",
    "common.created_at": "Created {{date}}",
    "common.updated_at": "Updated {{date}}",
    // ... continue with 200+ more keys

    // === Content ===
    "content.post": "Post",
    "content.feed": "Feed",
    "content.comment": "Comment",
    "content.reply": "Reply",
    "content.create_post": "Create post",
    "content.create_feed": "Create feed",
    "content.edit_post": "Edit post",
    "content.delete_post": "Delete post",
    "content.post_published": "Post published successfully",
    "content.post_deleted": "Post deleted",
    "content.feed_created": "Feed created successfully",
    // ... content category keys

    // === Profile ===
    "profile.display_name": "Display name",
    "profile.username": "Username",
    "profile.bio": "Bio",
    "profile.location": "Location",
    "profile.website": "Website",
    "profile.avatar": "Avatar",
    "profile.edit_profile": "Edit profile",
    "profile.my_profile": "My profile",
    "profile.public_profile": "Public profile",
    "profile.private_settings": "Private settings",
    "profile.board": "Profile board",
    "profile.edit_board": "Edit board",
    // ... profile category keys

    // === Feed ===
    "feed.follow": "Follow this feed",
    "feed.unfollow": "Unfollow this feed",
    "feed.submit_post": "Submit a post",
    "feed.submission_pending": "Your submission is pending review",
    "feed.submission_approved": "Your submission was approved",
    "feed.submission_rejected": "Your submission was rejected",
    "feed.no_posts": "No posts in this feed yet",
    "feed.followers_count": "{{count}} followers",
    // ... feed category keys

    // === Errors ===
    "error.not_found": "Not found",
    "error.not_found_description": "The requested resource was not found",
    "error.unauthorized": "Unauthorized",
    "error.unauthorized_description": "You must be signed in to perform this action",
    "error.forbidden": "Forbidden",
    "error.forbidden_description": "You do not have permission to perform this action",
    "error.validation": "Validation error",
    "error.validation_description": "Please check your input and try again",
    "error.server_error": "Server error",
    "error.server_error_description": "Something went wrong. Please try again later",
    "error.network_error": "Network error",
    "error.network_error_description": "Unable to connect. Please check your internet connection",
    // ... error category keys
  },

  "es-ES": {
    // === Common UI ===
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.submit": "Enviar",
    "common.close": "Cerrar",
    "common.back": "Atras",
    "common.next": "Siguiente",
    "common.previous": "Anterior",
    "common.loading": "Cargando...",
    "common.error": "Ocurrio un error",
    "common.success": "Exito",
    "common.confirm": "Confirmar",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.sort": "Ordenar",
    "common.share": "Compartir",
    "common.report": "Reportar",
    "common.block": "Bloquear",
    "common.unblock": "Desbloquear",
    "common.follow": "Seguir",
    "common.unfollow": "Dejar de seguir",
    "common.like": "Me gusta",
    "common.unlike": "Ya no me gusta",
    "common.reply": "Responder",
    "common.comment": "Comentar",
    "common.post": "Publicar",
    "common.see_more": "Ver mas",
    "common.see_less": "Ver menos",
    "common.view_all": "Ver todo",
    "common.no_results": "No se encontraron resultados",
    "common.try_again": "Intentar de nuevo",
    "common.learn_more": "Saber mas",
    "common.sign_in": "Iniciar sesion",
    "common.sign_out": "Cerrar sesion",
    "common.sign_up": "Registrarse",
    "common.welcome": "Bienvenido",
    "common.hello_name": "Hola, {{name}}",
    "common.items_count": "{{count}} elementos",
    "common.created_at": "Creado {{date}}",
    "common.updated_at": "Actualizado {{date}}",
    // ... continue with 200+ more keys

    // === Content ===
    "content.post": "Publicacion",
    "content.feed": "Canal",
    "content.comment": "Comentario",
    "content.reply": "Respuesta",
    "content.create_post": "Crear publicacion",
    "content.create_feed": "Crear canal",
    "content.edit_post": "Editar publicacion",
    "content.delete_post": "Eliminar publicacion",
    "content.post_published": "Publicacion creada exitosamente",
    "content.post_deleted": "Publicacion eliminada",
    "content.feed_created": "Canal creado exitosamente",
    // ... content category keys

    // === Profile ===
    "profile.display_name": "Nombre para mostrar",
    "profile.username": "Nombre de usuario",
    "profile.bio": "Biografia",
    "profile.location": "Ubicacion",
    "profile.website": "Sitio web",
    "profile.avatar": "Avatar",
    "profile.edit_profile": "Editar perfil",
    "profile.my_profile": "Mi perfil",
    "profile.public_profile": "Perfil publico",
    "profile.private_settings": "Configuracion privada",
    "profile.board": "Tablero de perfil",
    "profile.edit_board": "Editar tablero",
    // ... profile category keys

    // === Feed ===
    "feed.follow": "Seguir este canal",
    "feed.unfollow": "Dejar de seguir este canal",
    "feed.submit_post": "Enviar una publicacion",
    "feed.submission_pending": "Tu envio esta pendiente de revision",
    "feed.submission_approved": "Tu envio fue aprobado",
    "feed.submission_rejected": "Tu envio fue rechazado",
    "feed.no_posts": "Aun no hay publicaciones en este canal",
    "feed.followers_count": "{{count}} seguidores",
    // ... feed category keys

    // === Errors ===
    "error.not_found": "No encontrado",
    "error.not_found_description": "El recurso solicitado no fue encontrado",
    "error.unauthorized": "No autorizado",
    "error.unauthorized_description": "Debes iniciar sesion para realizar esta accion",
    "error.forbidden": "Prohibido",
    "error.forbidden_description": "No tienes permiso para realizar esta accion",
    "error.validation": "Error de validacion",
    "error.validation_description": "Por favor revisa tu entrada e intenta de nuevo",
    "error.server_error": "Error del servidor",
    "error.server_error_description": "Algo salio mal. Por favor intenta de nuevo mas tarde",
    "error.network_error": "Error de red",
    "error.network_error_description": "No se puede conectar. Por favor revisa tu conexion a internet",
    // ... error category keys
  },
};
```

### 2. Create i18n/translations/email.ts

Define email-specific translations for subjects, bodies, and template fragments.

```typescript
// src/i18n/translations/email.ts

import { Translations } from "../types";

export const emailTranslations: Translations = {
  "en-US": {
    // === Welcome ===
    "email.welcome.subject": "Welcome to Good Neighbor, {{name}}!",
    "email.welcome.greeting": "Hello {{name}},",
    "email.welcome.body": "Thank you for joining Good Neighbor. We are excited to have you in our community.",
    "email.welcome.cta": "Get started by creating your profile",

    // === Password Reset ===
    "email.password_reset.subject": "Reset your password",
    "email.password_reset.greeting": "Hello {{name}},",
    "email.password_reset.body": "We received a request to reset your password. Click the link below to create a new password.",
    "email.password_reset.cta": "Reset password",
    "email.password_reset.expiry": "This link will expire in {{hours}} hours.",
    "email.password_reset.ignore": "If you did not request a password reset, you can safely ignore this email.",

    // === Email Verification ===
    "email.verify.subject": "Verify your email address",
    "email.verify.greeting": "Hello {{name}},",
    "email.verify.body": "Please verify your email address by clicking the link below.",
    "email.verify.cta": "Verify email",

    // === Notifications ===
    "email.notification.new_comment": "{{name}} commented on your post",
    "email.notification.new_follower": "{{name}} started following you",
    "email.notification.new_like": "{{name}} liked your post",
    "email.notification.new_mention": "{{name}} mentioned you in a post",
    "email.notification.feed_submission_approved": "Your submission to {{feedName}} was approved",
    "email.notification.feed_submission_rejected": "Your submission to {{feedName}} was rejected",

    // === Common Email ===
    "email.common.footer": "This email was sent by Good Neighbor. If you have questions, contact us at {{supportEmail}}.",
    "email.common.unsubscribe": "Unsubscribe from these emails",
    "email.common.do_not_reply": "Please do not reply to this email.",
    "email.common.team_signature": "The Good Neighbor Team",
    "email.common.view_in_browser": "View in browser",
  },

  "es-ES": {
    // === Welcome ===
    "email.welcome.subject": "Bienvenido a Good Neighbor, {{name}}!",
    "email.welcome.greeting": "Hola {{name}},",
    "email.welcome.body": "Gracias por unirte a Good Neighbor. Estamos emocionados de tenerte en nuestra comunidad.",
    "email.welcome.cta": "Comienza creando tu perfil",

    // === Password Reset ===
    "email.password_reset.subject": "Restablece tu contrasena",
    "email.password_reset.greeting": "Hola {{name}},",
    "email.password_reset.body": "Recibimos una solicitud para restablecer tu contrasena. Haz clic en el enlace de abajo para crear una nueva contrasena.",
    "email.password_reset.cta": "Restablecer contrasena",
    "email.password_reset.expiry": "Este enlace expirara en {{hours}} horas.",
    "email.password_reset.ignore": "Si no solicitaste un restablecimiento de contrasena, puedes ignorar este correo de manera segura.",

    // === Email Verification ===
    "email.verify.subject": "Verifica tu direccion de correo electronico",
    "email.verify.greeting": "Hola {{name}},",
    "email.verify.body": "Por favor verifica tu direccion de correo electronico haciendo clic en el enlace de abajo.",
    "email.verify.cta": "Verificar correo",

    // === Notifications ===
    "email.notification.new_comment": "{{name}} comento en tu publicacion",
    "email.notification.new_follower": "{{name}} empezo a seguirte",
    "email.notification.new_like": "A {{name}} le gusto tu publicacion",
    "email.notification.new_mention": "{{name}} te menciono en una publicacion",
    "email.notification.feed_submission_approved": "Tu envio a {{feedName}} fue aprobado",
    "email.notification.feed_submission_rejected": "Tu envio a {{feedName}} fue rechazado",

    // === Common Email ===
    "email.common.footer": "Este correo fue enviado por Good Neighbor. Si tienes preguntas, contactanos en {{supportEmail}}.",
    "email.common.unsubscribe": "Cancelar suscripcion a estos correos",
    "email.common.do_not_reply": "Por favor no respondas a este correo.",
    "email.common.team_signature": "El equipo de Good Neighbor",
    "email.common.view_in_browser": "Ver en el navegador",
  },
};
```

### 3. Create Merged Translations Export

Create a function or constant that merges common and email translations into a single Translations object.

```typescript
// Add to i18n/index.ts or create i18n/translations/index.ts

import { commonTranslations } from "./translations/common";
import { emailTranslations } from "./translations/email";
import { Translations, Language, SUPPORTED_LANGUAGES } from "./types";

export function buildTranslations(): Translations {
  const merged: Translations = {} as Translations;
  for (const lang of SUPPORTED_LANGUAGES) {
    merged[lang] = {
      ...commonTranslations[lang],
      ...emailTranslations[lang],
    };
  }
  return merged;
}
```

### 4. Complete TranslationKeys Const Object

Update `i18n/keys.ts` to include all 250+ keys defined in the translation files. Every key in common.ts and email.ts should have a corresponding entry in the TranslationKeys object for type-safe references.

### 5. Port Remaining Keys from Source

Systematically port keys from the goodneighbor source at `/home/prmichaelsen/goodneighbor/src/`. Categories to cover:

- **Common UI** (40+ keys): labels, buttons, navigation, status messages, empty states
- **Content** (30+ keys): post types, feed types, content actions, categories (safety, events, recommendations, lost_found, general)
- **Profile** (30+ keys): field labels, board widget types, settings, privacy
- **Feed** (25+ keys): feed actions, submission status, moderation, permissions
- **Search** (15+ keys): search labels, filters, sort options, facets
- **Auth** (20+ keys): sign in/up/out, password reset, verification, session expiry
- **Notifications** (20+ keys): notification types, email templates
- **Errors** (25+ keys): user-facing error messages for all error types
- **Dates/Times** (15+ keys): relative time labels, date format labels
- **Misc** (30+ keys): settings, about, help, legal, accessibility

### 6. Write Verification Tests

Create tests that programmatically verify translation completeness.

```typescript
describe("Translation completeness", () => {
  it("should have the same keys in en-US and es-ES", () => {
    const translations = buildTranslations();
    const enKeys = Object.keys(translations["en-US"]).sort();
    const esKeys = Object.keys(translations["es-ES"]).sort();
    expect(enKeys).toEqual(esKeys);
  });

  it("should have at least 250 keys", () => {
    const translations = buildTranslations();
    const keyCount = Object.keys(translations["en-US"]).length;
    expect(keyCount).toBeGreaterThanOrEqual(250);
  });

  it("should not contain cleanbook keys", () => {
    const translations = buildTranslations();
    const allKeys = Object.keys(translations["en-US"]);
    const cleanBookPatterns = [
      "clean", "cleaning", "appointment", "cleaner",
      "guesty", "mellow", "daily_digest", "manager_notification",
      "property_management", "maintenance", "booking",
    ];
    for (const key of allKeys) {
      for (const pattern of cleanBookPatterns) {
        expect(key.toLowerCase()).not.toContain(pattern);
      }
    }
  });

  it("should have no empty values", () => {
    const translations = buildTranslations();
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every key in TranslationKeys should exist in translations", () => {
    const translations = buildTranslations();
    for (const key of Object.values(TranslationKeys)) {
      expect(translations["en-US"]).toHaveProperty(key);
      expect(translations["es-ES"]).toHaveProperty(key);
    }
  });
});
```

---

## Verification

- [ ] 250+ translation keys defined across common.ts and email.ts
- [ ] Every key has both en-US and es-ES values
- [ ] No key has an empty string value
- [ ] No cleanbook-specific keys are present (clean, cleaning, appointment, cleaner, guesty, mellow, daily_digest, etc.)
- [ ] Keys are organized by category using dot-separated naming (common.*, content.*, profile.*, feed.*, email.*, error.*, etc.)
- [ ] `buildTranslations()` correctly merges common and email translations
- [ ] `TranslationKeys` const object includes entries for all defined translation keys
- [ ] Barrel export from `i18n/index.ts` includes commonTranslations, emailTranslations, and buildTranslations
- [ ] Variable interpolation patterns (`{{variableName}}`) are consistent across languages
- [ ] Programmatic test verifies en-US and es-ES have identical key sets
- [ ] Programmatic test verifies at least 250 keys exist
- [ ] All tests pass

---

## Expected Output

**File Structure**:
```
src/i18n/
├── index.ts                     # Barrel export including buildTranslations
├── types.ts                     # Language, TranslationMap, Translations (from Task 24)
├── keys.ts                      # TranslationKeys with 250+ entries (updated from Task 24)
├── translations/
│   ├── common.ts                # Common UI translations (200+ keys per language)
│   └── email.ts                 # Email-specific translations (50+ keys per language)
└── utils.ts                     # Utility functions (from Task 24)
```

**Key Files Created/Updated**:
- `i18n/translations/common.ts`: Common translations organized by category (common, content, profile, feed, search, auth, errors, dates, misc)
- `i18n/translations/email.ts`: Email translations (welcome, password reset, verification, notifications, common email fragments)
- `i18n/keys.ts`: Updated with all 250+ key entries
- `i18n/index.ts`: Updated with buildTranslations() export

---

## Notes

- The translation values shown in Steps 1 and 2 above are representative examples. The full 250+ keys should be ported from the goodneighbor source. When porting, carefully exclude any cleanbook-specific keys.
- Spanish translations should preserve the `{{variableName}}` interpolation patterns exactly as they appear in the English versions. Variable names are not translated.
- Some Spanish translations in the source may use accented characters (e.g., "publicacion" with accent on the "o"). Preserve these correctly in the UTF-8 source files.
- The `buildTranslations()` function merges common and email translations using object spread. If a key exists in both files (which should not happen by convention), the email translation takes precedence.
- Consider adding a build-time check or lint rule that verifies translation completeness as part of CI.
- If the goodneighbor source has more than 250 relevant keys, port all of them. The 250 figure is a minimum, not a maximum.

---

**Next Task**: [Task 26: ServiceContainer](../milestone-7-servicecontainer-build-publish/task-26-service-container.md) (if M7 exists)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
