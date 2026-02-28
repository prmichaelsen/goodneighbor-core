# Task 23: NotificationService

**Milestone**: [M6 - Notification & I18n](../../milestones/milestone-6-notification-i18n.md)
**Estimated Time**: 3 hours
**Dependencies**: Task 5 (errors), Task 7 (config/secrets)
**Status**: Not Started

---

## Objective

Implement NotificationService for sending email via the Mandrill HTTP API with a debug capture mode. When `MANDRILL_API_KEY` is set, `sendEmail()` sends a real email through Mandrill. When the API key is absent or capture mode is enabled, `sendEmail()` stores the email to a Firestore `DEBUG_EMAILS` collection for testing and development. Additional methods `storeDebugEmail()` and `getDebugEmails()` provide direct access to the debug email store for test verification.

---

## Context

The goodneighbor app sends transactional emails (welcome, password reset, notifications) through Mandrill (Mailchimp's transactional email API). In development and testing, emails are captured to Firestore instead of being sent, allowing the full email pipeline to be exercised without an API key or risking sending real emails.

The service uses `Secret<T>` (from M2 Task 7) to handle the Mandrill API key safely -- the key is never logged or serialized in plaintext. The `EmailConfig` from M2 provides the API key, support email address, and sender name.

The Mandrill HTTP API endpoint for sending messages is `https://mandrillapp.com/api/1.0/messages/send`. The request body includes the API key, message object (from, to, subject, html), and optional tags/metadata.

---

## Steps

### 1. Create NotificationService Class

Create `src/services/notification.service.ts` extending BaseService. The constructor accepts a Firestore instance and an EmailConfig object.

```typescript
import { Firestore } from "firebase-admin/firestore";

interface NotificationServiceDeps {
  firestore: Firestore;
  config: EmailConfig;
}

export class NotificationService extends BaseService {
  private firestore: Firestore;
  private config: EmailConfig;

  constructor(deps: NotificationServiceDeps) {
    super();
    this.firestore = deps.firestore;
    this.config = deps.config;
  }
}
```

### 2. Implement sendEmail

Check if the Mandrill API key is present and the service is not in capture mode. If so, send via the Mandrill HTTP API. Otherwise, delegate to `storeDebugEmail()`.

```typescript
async sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { tags?: string[]; metadata?: Record<string, string> }
): Promise<Result<void, ExternalServiceError>> {
  const apiKey = this.config.mandrillApiKey;

  // If no API key or in capture mode, store as debug email
  if (!apiKey) {
    await this.storeDebugEmail(to, subject, html);
    return ok(undefined);
  }

  try {
    const response = await fetch("https://mandrillapp.com/api/1.0/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: apiKey.reveal(), // Secret<string>.reveal()
        message: {
          from_email: this.config.supportEmail,
          from_name: this.config.fromName,
          to: [{ email: to, type: "to" }],
          subject,
          html,
          tags: options?.tags ?? [],
          metadata: options?.metadata ?? {},
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return err(new ExternalServiceError(
        `Mandrill API error: ${response.status} ${errorBody}`
      ));
    }

    return ok(undefined);
  } catch (error) {
    return err(new ExternalServiceError(
      `Failed to send email via Mandrill: ${error instanceof Error ? error.message : String(error)}`
    ));
  }
}
```

### 3. Implement storeDebugEmail

Write the email to the `DEBUG_EMAILS` Firestore collection with a timestamp and metadata for later retrieval.

```typescript
async storeDebugEmail(
  to: string,
  subject: string,
  html: string
): Promise<Result<string, ExternalServiceError>> {
  try {
    const docRef = this.firestore.collection(COLLECTIONS.DEBUG_EMAILS).doc();
    const debugEmail = {
      id: docRef.id,
      to,
      subject,
      html,
      from: this.config.supportEmail,
      fromName: this.config.fromName,
      createdAt: new Date().toISOString(),
      metadata: {
        captureMode: true,
        environment: "debug",
      },
    };

    await docRef.set(debugEmail);
    return ok(docRef.id);
  } catch (error) {
    return err(new ExternalServiceError(
      `Failed to store debug email: ${error instanceof Error ? error.message : String(error)}`
    ));
  }
}
```

### 4. Implement getDebugEmails

Query the `DEBUG_EMAILS` collection with optional filters and a configurable limit.

```typescript
async getDebugEmails(
  limit: number = 50,
  filters?: { to?: string; subject?: string }
): Promise<Result<DebugEmail[], ExternalServiceError>> {
  try {
    let query: FirebaseFirestore.Query = this.firestore
      .collection(COLLECTIONS.DEBUG_EMAILS)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (filters?.to) {
      query = query.where("to", "==", filters.to);
    }

    // Note: Firestore does not support substring matching on subject.
    // If subject filter is needed, do client-side filtering after fetch.

    const snapshot = await query.get();
    let emails = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as DebugEmail));

    // Client-side subject filter if provided
    if (filters?.subject) {
      emails = emails.filter((e) =>
        e.subject.toLowerCase().includes(filters.subject!.toLowerCase())
      );
    }

    return ok(emails);
  } catch (error) {
    return err(new ExternalServiceError(
      `Failed to retrieve debug emails: ${error instanceof Error ? error.message : String(error)}`
    ));
  }
}
```

### 5. Define DebugEmail Type

If not already defined in the types module, define the DebugEmail interface:

```typescript
export interface DebugEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  from: string;
  fromName: string;
  createdAt: string;
  metadata: {
    captureMode: boolean;
    environment: string;
  };
}
```

### 6. Write Unit Tests

Create `src/services/notification.service.spec.ts` with the following test cases:

- **sendEmail with API key**: Mock fetch to return 200. Verify fetch called with correct Mandrill endpoint, API key from Secret.reveal(), and message body.
- **sendEmail without API key**: Provide config with no mandrillApiKey. Verify email stored to debug collection instead.
- **sendEmail Mandrill error**: Mock fetch to return 500. Verify ExternalServiceError returned with error details.
- **sendEmail network failure**: Mock fetch to throw. Verify ExternalServiceError returned.
- **sendEmail API key not logged**: Verify the API key value does not appear in any error messages or logs.
- **storeDebugEmail success**: Mock Firestore set. Verify document written with correct fields (to, subject, html, from, fromName, createdAt).
- **storeDebugEmail returns document ID**: Verify the returned string is the Firestore document ID.
- **getDebugEmails no filters**: Mock Firestore query returning 3 documents. Verify all returned.
- **getDebugEmails with to filter**: Verify Firestore where clause includes `to == filterValue`.
- **getDebugEmails with subject filter**: Verify client-side filtering applied on subject.
- **getDebugEmails respects limit**: Verify Firestore query uses the provided limit.
- **getDebugEmails empty result**: Mock empty snapshot. Verify empty array returned.

---

## Verification

- [ ] `sendEmail` sends via Mandrill HTTP API (`https://mandrillapp.com/api/1.0/messages/send`) when API key is present
- [ ] `sendEmail` stores to `COLLECTIONS.DEBUG_EMAILS` Firestore collection when API key is absent
- [ ] `sendEmail` uses `Secret.reveal()` to access the API key (never logs the raw value)
- [ ] `sendEmail` returns `Result<void, ExternalServiceError>` on both success and failure paths
- [ ] `sendEmail` includes from_email, from_name, to, subject, html in the Mandrill request body
- [ ] `storeDebugEmail` writes a document with to, subject, html, from, fromName, createdAt, and metadata fields
- [ ] `storeDebugEmail` returns the Firestore document ID on success
- [ ] `getDebugEmails` queries with `orderBy("createdAt", "desc")` and respects the limit parameter
- [ ] `getDebugEmails` supports filtering by `to` (Firestore where clause) and `subject` (client-side)
- [ ] NotificationService accepts Firestore and EmailConfig via constructor injection
- [ ] All tests pass with mocked Firestore and mocked fetch

---

## Expected Output

**File Structure**:
```
src/services/
├── notification.service.ts      # NotificationService class with 3 methods
└── notification.service.spec.ts # 12+ test cases covering all paths
```

**Key Files Created**:
- `notification.service.ts`: NotificationService with sendEmail, storeDebugEmail, getDebugEmails
- `notification.service.spec.ts`: Unit tests with mocked Firestore and HTTP fetch

---

## Notes

- The Mandrill API uses a simple HTTP POST endpoint. No SDK is required -- a plain `fetch()` call is sufficient and avoids adding another dependency.
- The `Secret<T>` class from M2 ensures the API key is never serialized to logs or error messages. Only `reveal()` exposes the raw value, and that should only happen inside the HTTP request body construction.
- The `DEBUG_EMAILS` collection path is `"goodneighbor/collections/debug-emails"` from COLLECTIONS constants (M1 Task 4).
- Subject filtering in `getDebugEmails` is done client-side because Firestore does not support substring matching. This is acceptable because debug email queries are low-volume.
- The `DebugEmail` type may need to be added to `src/types/` if not already defined. It is not a content entity and does not use ContentEntityRefs.
- Consider adding a `captureMode` boolean to EmailConfig that forces debug capture even when an API key is present. This allows testing the email pipeline in staging without sending real emails.

---

**Next Task**: [Task 24: I18nService](./task-24-i18n-service.md)
**Related Design Docs**: [goodneighbor-core design](../../design/local.goodneighbor-core.md)
**Estimated Completion Date**: TBD
