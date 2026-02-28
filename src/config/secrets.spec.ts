import { Secret } from './secrets';

describe('Secret', () => {
  const secretValue = 'my-super-secret-api-key';
  let secret: Secret;

  beforeEach(() => {
    secret = new Secret(secretValue);
  });

  it('should return the original value via reveal()', () => {
    expect(secret.reveal()).toBe(secretValue);
  });

  it('should return [REDACTED] via toString()', () => {
    expect(secret.toString()).toBe('[REDACTED]');
  });

  it('should return [REDACTED] via toJSON()', () => {
    expect(secret.toJSON()).toBe('[REDACTED]');
  });

  it('should return [REDACTED] in template literal interpolation', () => {
    expect(`Key: ${secret}`).toBe('Key: [REDACTED]');
  });

  it('should return [REDACTED] when JSON.stringify is used', () => {
    const obj = { apiKey: secret };
    const json = JSON.stringify(obj);
    expect(json).toBe('{"apiKey":"[REDACTED]"}');
  });

  it('should never expose the secret value in string concatenation', () => {
    const result = 'prefix-' + secret;
    expect(result).toBe('prefix-[REDACTED]');
    expect(result).not.toContain(secretValue);
  });
});
