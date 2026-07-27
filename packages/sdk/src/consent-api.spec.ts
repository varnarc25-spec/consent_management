import { describe, expect, it } from 'vitest';
import { buildConsentChecksum } from './checksum';
import { loadConsent, saveConsent } from './consent-store';
import { detectVisitorRegion } from './region';
import { getOrCreateVisitorId, rotateVisitorId } from './visitor-id';
import { readStorage, writeStorage } from './storage';

describe('visitor id', () => {
  it('creates and reuses a visitor id', () => {
    const first = getOrCreateVisitorId('dk_test');
    const second = getOrCreateVisitorId('dk_test');
    expect(second.visitorId).toBe(first.visitorId);
  });

  it('rotates expired visitor ids', () => {
    const first = getOrCreateVisitorId('dk_rotate');
    const rotated = rotateVisitorId('dk_rotate');
    expect(rotated.visitorId).not.toBe(first.visitorId);
  });
});

describe('storage fallback', () => {
  it('persists values in local storage', () => {
    writeStorage('cmp_test_key', 'value');
    expect(readStorage('cmp_test_key')).toBe('value');
  });
});

describe('consent persistence', () => {
  it('persists consent across reloads for the same config version', () => {
    saveConsent(
      'dk_persist',
      {
        configVersion: 2,
        categories: { strictly_necessary: true, analytics: false },
        expiresAt: Date.now() + 86_400_000,
      },
      { rememberChoice: true, consentExpirationDays: 365 },
    );

    const stored = loadConsent('dk_persist', 2);
    expect(stored?.categories).toEqual({ strictly_necessary: true, analytics: false });
  });
});

describe('region detection', () => {
  it('prefers domain region when provided', () => {
    expect(detectVisitorRegion('EU').region).toBe('EU');
  });
});

describe('checksum', () => {
  it('generates a stable checksum', async () => {
    const input = {
      visitorId: 'v_test',
      configVersion: 1,
      categories: { analytics: true },
      savedAt: '2026-01-01T00:00:00.000Z',
    };
    const first = await buildConsentChecksum(input);
    const second = await buildConsentChecksum(input);
    expect(first).toBe(second);
    expect(first).toHaveLength(32);
  });
});
