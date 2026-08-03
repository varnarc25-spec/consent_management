import { describe, expect, it } from 'vitest';
import { resolveGeoRegulation, applyRegulationProfile } from './regional-rules';

describe('regional rules', () => {
  it('matches EU country to GDPR profile', () => {
    const resolved = resolveGeoRegulation(
      { country: 'DE', region: 'DE', language: 'de' },
      {
        enabled: true,
        defaultProfileId: 'generic_opt_in',
        regionalRules: [
          {
            id: 'eu',
            name: 'EU',
            priority: 10,
            conditions: { countryGroups: ['EU'] },
            profileId: 'gdpr',
          },
        ],
      },
    );
    expect(resolved.profileId).toBe('gdpr');
    expect(resolved.regulation).toBe('GDPR');
  });

  it('falls back to default profile when no rule matches', () => {
    const resolved = resolveGeoRegulation(
      { country: 'JP', region: 'JP', language: 'ja' },
      { enabled: true, defaultProfileId: 'generic_opt_out' },
    );
    expect(resolved.profileId).toBe('generic_opt_out');
  });

  it('applies opt-in category defaults from profile', () => {
    const { categories } = applyRegulationProfile(
      { title: 'Test' },
      [
        { slug: 'strictly_necessary', defaultState: 'ENABLED' },
        { slug: 'analytics', defaultState: 'ENABLED' },
      ],
      resolveGeoRegulation({ country: 'DE', region: 'DE', language: 'de' }, { enabled: true }).profile,
    );
    expect(categories?.find((c) => c.slug === 'analytics')?.defaultState).toBe('DISABLED');
  });
});
