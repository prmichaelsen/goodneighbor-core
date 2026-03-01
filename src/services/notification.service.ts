// src/services/notification.service.ts
// NotificationService sends emails via Mandrill HTTP API or stores to debug collection.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { EmailConfig } from '../config/schema';
import { ExternalServiceError } from '../errors/app-errors';
import { COLLECTIONS } from '../constants/collections';
import {
  setDocument,
  queryDocuments,
} from '@prmichaelsen/firebase-admin-sdk-v8';

const MANDRILL_SEND_URL = 'https://mandrillapp.com/api/1.0/messages/send';

export interface SendEmailOptions {
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export interface DebugEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  storedAt: string;
}

export interface DebugEmailFilters {
  to?: string;
  subject?: string;
}

export interface NotificationServiceDeps {
  emailConfig: EmailConfig;
  logger?: {
    error(message: string, context?: Record<string, unknown>): void;
    info?(message: string, context?: Record<string, unknown>): void;
  };
  /** Override fetch for testing */
  fetch?: typeof globalThis.fetch;
}

export class NotificationService {
  private emailConfig: EmailConfig;
  private logger: NotificationServiceDeps['logger'];
  private fetchFn: typeof globalThis.fetch;

  constructor(deps: NotificationServiceDeps) {
    this.emailConfig = deps.emailConfig;
    this.logger = deps.logger;
    this.fetchFn = deps.fetch ?? globalThis.fetch;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    options?: SendEmailOptions,
  ): Promise<Result<void, ExternalServiceError>> {
    // If no API key, use debug capture
    if (!this.emailConfig.mandrillApiKey) {
      await this.storeDebugEmail(to, subject, html);
      return ok(undefined);
    }

    try {
      const response = await this.fetchFn(MANDRILL_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: this.emailConfig.mandrillApiKey,
          message: {
            from_email: options?.fromEmail ?? this.emailConfig.supportEmail,
            from_name: options?.fromName ?? this.emailConfig.fromName,
            to: [{ email: to, type: 'to' }],
            subject,
            html,
            ...(options?.replyTo ? { headers: { 'Reply-To': options.replyTo } } : {}),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return err(new ExternalServiceError('Mandrill', `HTTP ${response.status}: ${body}`));
      }

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed';
      return err(new ExternalServiceError('Mandrill', message));
    }
  }

  async storeDebugEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const debugEmail = {
      id,
      to,
      subject,
      html,
      storedAt: new Date().toISOString(),
    };

    await setDocument(COLLECTIONS.DEBUG_EMAILS, id, debugEmail);
    this.logger?.info?.('Debug email stored', { id, to, subject });
    return id;
  }

  async getDebugEmails(
    limit: number = 20,
    filters?: DebugEmailFilters,
  ): Promise<Result<DebugEmail[], ExternalServiceError>> {
    try {
      const where: Array<{ field: string; op: '=='; value: string }> = [];
      if (filters?.to) {
        where.push({ field: 'to', op: '==' as const, value: filters.to });
      }
      if (filters?.subject) {
        where.push({ field: 'subject', op: '==' as const, value: filters.subject });
      }

      const results = await queryDocuments(COLLECTIONS.DEBUG_EMAILS, {
        where: where.length > 0 ? where : undefined,
        orderBy: [{ field: 'storedAt', direction: 'DESCENDING' }],
        limit,
      });

      const emails = results.map((r) => ({
        ...r.data,
        id: r.id,
      })) as unknown as DebugEmail[];

      return ok(emails);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Firestore query failed';
      return err(new ExternalServiceError('Firestore', message));
    }
  }
}
