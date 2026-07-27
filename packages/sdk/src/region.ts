export interface DetectedRegion {
  region: string | null;
  language: string;
  timezone: string | null;
}

export function detectVisitorRegion(domainRegion?: string | null): DetectedRegion {
  const language =
    typeof navigator !== 'undefined'
      ? navigator.language || (navigator.languages?.[0] ?? 'en')
      : 'en';
  const timezone =
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
      : null;

  const localeRegion = language.includes('-') ? language.split('-')[1]?.toUpperCase() ?? null : null;
  const region = domainRegion ?? localeRegion ?? timezone?.split('/')[0]?.toUpperCase() ?? null;

  return { region, language, timezone };
}
