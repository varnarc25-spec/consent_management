import { describe, expect, it } from 'vitest';
import {
  buildInventoryKey,
  groupScanFindingsForIngest,
  resolveTrackerCategory,
} from '../src/cookies/scan-findings-ingest';

describe('scan-findings-ingest', () => {
  it('builds distinct inventory keys per finding type', () => {
    expect(buildInventoryKey('COOKIE', '_ga', '.varnarc.com')).toBe('_ga|.varnarc.com');
    expect(buildInventoryKey('LOCAL_STORAGE', 'cmp_consent_dk_abc')).toBe('localStorage|cmp_consent_dk_abc');
    expect(
      buildInventoryKey('SCRIPT', 'Google Tag Manager', null, 'https://googletagmanager.com/gtm.js'),
    ).toBe('tracker|SCRIPT|Google Tag Manager|https://googletagmanager.com/gtm.js');
  });

  it('groups findings and merges consent timing', () => {
    const grouped = groupScanFindingsForIngest([
      {
        findingType: 'LOCAL_STORAGE',
        consentState: 'AFTER_ACCEPT',
        name: 'cmp_consent_dk_test',
        cookieDomain: null,
        sourceUrl: null,
        expiresAt: null,
        isThirdParty: false,
        technology: null,
        metadata: null,
      },
      {
        findingType: 'LOCAL_STORAGE',
        consentState: 'BEFORE_CONSENT',
        name: 'cmp_consent_dk_test',
        cookieDomain: null,
        sourceUrl: null,
        expiresAt: null,
        isThirdParty: false,
        technology: null,
        metadata: null,
      },
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.foundBeforeConsent).toBe(true);
    expect(grouped[0]?.findingType).toBe('LOCAL_STORAGE');
  });

  it('includes tracker and storage findings in ingest set', () => {
    const grouped = groupScanFindingsForIngest([
      {
        findingType: 'COOKIE',
        consentState: 'BEFORE_CONSENT',
        name: '_fbp',
        cookieDomain: '.varnarc.com',
        sourceUrl: 'https://varnarc.com/',
        expiresAt: null,
        isThirdParty: true,
        technology: null,
        metadata: null,
      },
      {
        findingType: 'SCRIPT',
        consentState: 'BEFORE_CONSENT',
        name: 'Google Tag Manager',
        cookieDomain: null,
        sourceUrl: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXX',
        expiresAt: null,
        isThirdParty: true,
        technology: 'Google Tag Manager',
        metadata: null,
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped.map((g) => g.findingType)).toEqual(['COOKIE', 'SCRIPT']);
  });

  it('resolves tracker categories from source URLs', () => {
    expect(resolveTrackerCategory('Google Tag Manager', 'https://www.googletagmanager.com/gtm.js')).toBe(
      'analytics',
    );
    expect(resolveTrackerCategory('Meta Pixel', 'https://connect.facebook.net/en_US/fbevents.js')).toBe(
      'marketing',
    );
  });
});
