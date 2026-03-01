import { NotificationService } from './notification.service';
import { COLLECTIONS } from '../constants/collections';

jest.mock('@prmichaelsen/firebase-admin-sdk-v8', () => ({
  setDocument: jest.fn(),
  queryDocuments: jest.fn(),
}));

const sdk = require('@prmichaelsen/firebase-admin-sdk-v8');

function createMockFetch(status = 200, body = '[{"status":"sent"}]') {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(body),
  });
}

function createService(apiKey?: string, fetchOverride?: jest.Mock) {
  return new NotificationService({
    emailConfig: {
      mandrillApiKey: apiKey,
      supportEmail: 'support@goodneighbor.com',
      fromName: 'Good Neighbor',
    },
    logger: { error: jest.fn(), info: jest.fn() },
    fetch: fetchOverride ?? createMockFetch(),
  });
}

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sdk.setDocument.mockResolvedValue(undefined);
    sdk.queryDocuments.mockResolvedValue([]);
  });

  describe('sendEmail', () => {
    it('should send email via Mandrill when API key is present', async () => {
      const mockFetch = createMockFetch();
      const service = createService('test-api-key', mockFetch);
      const result = await service.sendEmail('test@example.com', 'Subject', '<p>Body</p>');
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://mandrillapp.com/api/1.0/messages/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test-api-key'),
        }),
      );
    });

    it('should include correct message payload in Mandrill request', async () => {
      const mockFetch = createMockFetch();
      const service = createService('key', mockFetch);
      await service.sendEmail('user@test.com', 'Hello', '<p>Hi</p>');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message.to[0].email).toBe('user@test.com');
      expect(body.message.subject).toBe('Hello');
      expect(body.message.html).toBe('<p>Hi</p>');
      expect(body.message.from_email).toBe('support@goodneighbor.com');
    });

    it('should use custom from options when provided', async () => {
      const mockFetch = createMockFetch();
      const service = createService('key', mockFetch);
      await service.sendEmail('user@test.com', 'Hello', '<p>Hi</p>', {
        fromEmail: 'custom@test.com',
        fromName: 'Custom Sender',
      });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message.from_email).toBe('custom@test.com');
      expect(body.message.from_name).toBe('Custom Sender');
    });

    it('should fall back to debug capture when API key is absent', async () => {
      const service = createService(undefined);
      const result = await service.sendEmail('user@test.com', 'Subject', '<p>Body</p>');
      expect(result.ok).toBe(true);
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.DEBUG_EMAILS,
        expect.any(String),
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Subject',
        }),
      );
    });

    it('should return ExternalServiceError on Mandrill HTTP error', async () => {
      const mockFetch = createMockFetch(500, 'Internal Error');
      const service = createService('key', mockFetch);
      const result = await service.sendEmail('user@test.com', 'Subject', '<p>Body</p>');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('500');
      }
    });

    it('should return ExternalServiceError on network failure', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const service = createService('key', mockFetch);
      const result = await service.sendEmail('user@test.com', 'Subject', '<p>Body</p>');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Network error');
      }
    });
  });

  describe('storeDebugEmail', () => {
    it('should store email to DEBUG_EMAILS collection', async () => {
      const service = createService();
      const id = await service.storeDebugEmail('test@example.com', 'Subject', '<p>Body</p>');
      expect(id).toBeTruthy();
      expect(sdk.setDocument).toHaveBeenCalledWith(
        COLLECTIONS.DEBUG_EMAILS,
        expect.any(String),
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Subject',
          html: '<p>Body</p>',
          storedAt: expect.any(String),
        }),
      );
    });
  });

  describe('getDebugEmails', () => {
    it('should query debug emails with limit', async () => {
      sdk.queryDocuments.mockResolvedValue([
        { id: 'e1', data: { to: 'a@test.com', subject: 'Test', html: '<p>Hi</p>', storedAt: '2024-01-01' } },
      ]);
      const service = createService();
      const result = await service.getDebugEmails(10);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0].to).toBe('a@test.com');
      }
    });

    it('should apply to filter', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getDebugEmails(10, { to: 'specific@test.com' });
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.DEBUG_EMAILS,
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'to', op: '==', value: 'specific@test.com' },
          ]),
        }),
      );
    });

    it('should apply subject filter', async () => {
      sdk.queryDocuments.mockResolvedValue([]);
      const service = createService();
      await service.getDebugEmails(10, { subject: 'Welcome' });
      expect(sdk.queryDocuments).toHaveBeenCalledWith(
        COLLECTIONS.DEBUG_EMAILS,
        expect.objectContaining({
          where: expect.arrayContaining([
            { field: 'subject', op: '==', value: 'Welcome' },
          ]),
        }),
      );
    });

    it('should return ExternalServiceError on failure', async () => {
      sdk.queryDocuments.mockRejectedValue(new Error('query failed'));
      const service = createService();
      const result = await service.getDebugEmails(10);
      expect(result.ok).toBe(false);
    });
  });
});
