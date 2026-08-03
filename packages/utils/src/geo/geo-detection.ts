export type GeoDetectionSource =
  | 'cdn'
  | 'accept_language'
  | 'client'
  | 'domain'
  | 'preview'
  | 'disabled'
  | 'ip_api';

export interface DetectedGeo {
  country: string | null;
  region: string | null;
  language: string;
  timezone: string | null;
  source: GeoDetectionSource;
}

const CDN_COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-country-code',
  'cloudfront-viewer-country',
  'x-appengine-country',
  'x-geo-country',
] as const;

function normalizeCountry(value: string | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!code || code === 'XX' || code === 'T1') return null;
  return code.length === 2 ? code : null;
}

export function detectCountryFromHeaders(
  headers: Record<string, string | string[] | undefined>,
): { country: string | null; source: GeoDetectionSource } {
  for (const header of CDN_COUNTRY_HEADERS) {
    const raw = headers[header];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const country = normalizeCountry(value);
    if (country) return { country, source: 'cdn' };
  }

  const acceptLanguage = headers['accept-language'];
  const lang = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  if (lang?.includes('-')) {
    const part = lang.split(',')[0]?.split('-')[1];
    const country = normalizeCountry(part);
    if (country) return { country, source: 'accept_language' };
  }

  return { country: null, source: 'cdn' };
}

export function detectClientGeoHints(
  domainRegion?: string | null,
): Pick<DetectedGeo, 'country' | 'region' | 'language' | 'timezone'> {
  const language =
    typeof navigator !== 'undefined'
      ? navigator.language || (navigator.languages?.[0] ?? 'en')
      : 'en';
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
      : null;

  const localeCountry = language.includes('-')
    ? normalizeCountry(language.split('-')[1] ?? undefined)
    : null;
  const country = localeCountry ?? null;
  const region =
    domainRegion ??
    localeCountry ??
    timezone?.split('/')[0]?.toUpperCase() ??
    null;

  return { country, region, language, timezone };
}

export function mergeDetectedGeo(
  server: { country: string | null; source: GeoDetectionSource },
  client: Pick<DetectedGeo, 'country' | 'region' | 'language' | 'timezone'>,
  domainRegion?: string | null,
  geoDisabled?: boolean,
  previewCountry?: string | null,
): DetectedGeo {
  if (previewCountry) {
    const country = normalizeCountry(previewCountry);
    return {
      country,
      region: country ?? domainRegion ?? client.region,
      language: client.language,
      timezone: client.timezone,
      source: 'preview',
    };
  }

  if (geoDisabled) {
    return {
      country: client.country,
      region: domainRegion ?? client.region,
      language: client.language,
      timezone: client.timezone,
      source: 'disabled',
    };
  }

  const country = server.country ?? client.country;
  const region = country ?? domainRegion ?? client.region;

  return {
    country,
    region,
    language: client.language,
    timezone: client.timezone,
    source: server.country ? server.source : country ? 'client' : domainRegion ? 'domain' : 'client',
  };
}
