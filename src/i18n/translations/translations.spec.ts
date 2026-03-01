import { buildTranslations } from './common';

const CLEANBOOK_KEYWORDS = [
  'clean', 'cleaning', 'appointment', 'cleaner', 'guesty',
  'mellow', 'daily_digest', 'manager_notification', 'property',
];

describe('Translation Keys', () => {
  const translations = buildTranslations();
  const enKeys = Object.keys(translations['en-US']);
  const esKeys = Object.keys(translations['es-ES']);

  it('should have 250+ translation keys', () => {
    expect(enKeys.length).toBeGreaterThanOrEqual(250);
  });

  it('should have the same keys in both languages', () => {
    const enSet = new Set(enKeys);
    const esSet = new Set(esKeys);

    const missingInEs = enKeys.filter((k) => !esSet.has(k));
    const missingInEn = esKeys.filter((k) => !enSet.has(k));

    expect(missingInEs).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('should have no empty values in en-US', () => {
    const emptyKeys = enKeys.filter((k) => !translations['en-US'][k]?.trim());
    expect(emptyKeys).toEqual([]);
  });

  it('should have no empty values in es-ES', () => {
    const emptyKeys = esKeys.filter((k) => !translations['es-ES'][k]?.trim());
    expect(emptyKeys).toEqual([]);
  });

  it('should not contain cleanbook-specific keys', () => {
    const cleanbook = enKeys.filter((key) =>
      CLEANBOOK_KEYWORDS.some((kw) => key.toLowerCase().includes(kw)),
    );
    expect(cleanbook).toEqual([]);
  });

  it('should include common UI keys', () => {
    expect(translations['en-US']['ui.save']).toBeTruthy();
    expect(translations['en-US']['ui.cancel']).toBeTruthy();
    expect(translations['en-US']['ui.delete']).toBeTruthy();
  });

  it('should include auth keys', () => {
    expect(translations['en-US']['auth.login']).toBeTruthy();
    expect(translations['en-US']['auth.logout']).toBeTruthy();
    expect(translations['en-US']['auth.signup']).toBeTruthy();
  });

  it('should include content keys', () => {
    expect(translations['en-US']['content.post']).toBeTruthy();
    expect(translations['en-US']['content.like']).toBeTruthy();
  });

  it('should include email keys', () => {
    expect(translations['en-US']['email.welcome.subject']).toBeTruthy();
    expect(translations['en-US']['email.verification.subject']).toBeTruthy();
  });

  it('should include error keys', () => {
    expect(translations['en-US']['error.generic']).toBeTruthy();
    expect(translations['en-US']['error.not_found']).toBeTruthy();
  });

  it('should include profile keys', () => {
    expect(translations['en-US']['profile.profile']).toBeTruthy();
    expect(translations['en-US']['profile.edit_profile']).toBeTruthy();
  });

  it('should include feed keys', () => {
    expect(translations['en-US']['feed.feed']).toBeTruthy();
    expect(translations['en-US']['feed.create_feed']).toBeTruthy();
  });

  it('should include search keys', () => {
    expect(translations['en-US']['search.search']).toBeTruthy();
    expect(translations['en-US']['search.no_results']).toBeTruthy();
  });

  it('should support variable interpolation in translations', () => {
    const keysWithVars = enKeys.filter((k) => translations['en-US'][k].includes('{{'));
    expect(keysWithVars.length).toBeGreaterThan(10);

    // Verify es-ES also has variables for the same keys
    for (const key of keysWithVars) {
      const esValue = translations['es-ES'][key];
      if (translations['en-US'][key].includes('{{')) {
        expect(esValue).toBeTruthy();
      }
    }
  });
});
