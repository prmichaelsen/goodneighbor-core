import {
  translate,
  formatDate,
  hasKey,
  getKeys,
  translateEmailSubject,
  formatDateForLanguage,
  formatDateTimeForLanguage,
  resetTranslationsCache,
} from './utils';

describe('I18n Utils', () => {
  beforeEach(() => {
    resetTranslationsCache();
  });

  describe('translate', () => {
    it('should translate a key to en-US', () => {
      expect(translate('ui.save', 'en-US')).toBe('Save');
    });

    it('should translate a key to es-ES', () => {
      expect(translate('ui.save', 'es-ES')).toBe('Guardar');
    });

    it('should interpolate variables with {{name}} syntax', () => {
      const result = translate('auth.welcome_back', 'en-US', { name: 'Alice' });
      expect(result).toBe('Welcome back, Alice!');
    });

    it('should interpolate variables in es-ES', () => {
      const result = translate('auth.welcome_back', 'es-ES', { name: 'Carlos' });
      expect(result).toBe('¡Bienvenido de nuevo, Carlos!');
    });

    it('should return the key itself when translation is missing', () => {
      expect(translate('nonexistent.key', 'en-US')).toBe('nonexistent.key');
    });

    it('should preserve unresolved variables', () => {
      const result = translate('content.likes', 'en-US', {}); // missing 'count'
      expect(result).toBe('{{count}} likes');
    });

    it('should handle multiple variables', () => {
      const result = translate('email.notification.new_comment', 'en-US', {
        author: 'Bob',
        title: 'My Post',
      });
      expect(result).toBe('Bob commented on your post "My Post"');
    });

    it('should return template without modification when no variables provided', () => {
      expect(translate('ui.loading', 'en-US')).toBe('Loading...');
    });

    it('should translate email keys', () => {
      expect(translate('email.welcome.subject', 'en-US')).toBe('Welcome to Good Neighbor!');
      expect(translate('email.welcome.subject', 'es-ES')).toBe('¡Bienvenido a Good Neighbor!');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-06-15T10:30:00Z');

    it('should format date with default medium style', () => {
      const result = formatDate(testDate, 'en-US');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should format date with short style', () => {
      const result = formatDate(testDate, 'en-US', { dateStyle: 'short' });
      expect(result).toBeTruthy();
    });

    it('should format date with long style', () => {
      const result = formatDate(testDate, 'en-US', { dateStyle: 'long' });
      expect(result).toContain('June');
    });

    it('should format date for es-ES locale', () => {
      const result = formatDate(testDate, 'es-ES', { dateStyle: 'long' });
      expect(result).toContain('junio');
    });

    it('should accept string dates', () => {
      const result = formatDate('2024-06-15', 'en-US');
      expect(result).toBeTruthy();
    });

    it('should format with time style', () => {
      const result = formatDate(testDate, 'en-US', { dateStyle: 'short', timeStyle: 'short' });
      expect(result).toBeTruthy();
    });
  });

  describe('hasKey', () => {
    it('should return true for existing keys', () => {
      expect(hasKey('ui.save', 'en-US')).toBe(true);
      expect(hasKey('ui.save', 'es-ES')).toBe(true);
    });

    it('should return false for missing keys', () => {
      expect(hasKey('nonexistent.key', 'en-US')).toBe(false);
    });
  });

  describe('getKeys', () => {
    it('should return all keys for en-US', () => {
      const keys = getKeys('en-US');
      expect(keys.length).toBeGreaterThan(200);
      expect(keys).toContain('ui.save');
      expect(keys).toContain('email.welcome.subject');
    });

    it('should return all keys for es-ES', () => {
      const keys = getKeys('es-ES');
      expect(keys.length).toBeGreaterThan(200);
    });
  });

  describe('translateEmailSubject', () => {
    it('should translate email subject keys', () => {
      const result = translateEmailSubject('email.verification.subject', 'en-US');
      expect(result).toBe('Verify your email address');
    });
  });

  describe('formatDateForLanguage', () => {
    it('should format with long date style', () => {
      const result = formatDateForLanguage(new Date('2024-06-15'), 'en-US');
      expect(result).toContain('June');
    });
  });

  describe('formatDateTimeForLanguage', () => {
    it('should format with both date and time', () => {
      const result = formatDateTimeForLanguage(new Date('2024-06-15T10:30:00Z'), 'en-US');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});
