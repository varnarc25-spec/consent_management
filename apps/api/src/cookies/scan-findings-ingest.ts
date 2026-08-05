import type { ScanFindingType } from '@cmp/database';
import { buildCookieKey } from './scan-comparison';
import { matchTracker } from '../scans/scanner/tracker-patterns';

const INGESTIBLE_FINDING_TYPES: ScanFindingType[] = [
  'COOKIE',
  'LOCAL_STORAGE',
  'SESSION_STORAGE',
  'INDEXED_DB',
  'SCRIPT',
  'IFRAME',
  'PIXEL',
  'NETWORK_REQUEST',
  'SERVICE_WORKER',
];

export interface GroupedScanFinding {
  inventoryKey: string;
  cookieName: string;
  cookieDomain: string | null;
  sourceUrl: string | null;
  isThirdParty: boolean | null;
  expiresAt: Date | null;
  foundBeforeConsent: boolean;
  findingType: ScanFindingType;
  metadata?: Record<string, unknown>;
}

export function buildInventoryKey(
  findingType: ScanFindingType,
  name: string,
  cookieDomain?: string | null,
  sourceUrl?: string | null,
): string {
  switch (findingType) {
    case 'COOKIE':
      return buildCookieKey(name, cookieDomain ?? null);
    case 'LOCAL_STORAGE':
      return `localStorage|${name}`;
    case 'SESSION_STORAGE':
      return `sessionStorage|${name}`;
    case 'INDEXED_DB':
      return `indexedDB|${name}`;
    case 'SERVICE_WORKER':
      return `serviceWorker|${sourceUrl ?? name}`;
    case 'SCRIPT':
    case 'IFRAME':
    case 'PIXEL':
    case 'NETWORK_REQUEST':
      return `tracker|${findingType}|${name}|${sourceUrl ?? ''}`;
    default:
      return `${findingType}|${name}|${cookieDomain ?? ''}|${sourceUrl ?? ''}`;
  }
}

export function resolveTrackerCategory(name: string, sourceUrl: string | null): string | null {
  if (sourceUrl) {
    const byUrl = matchTracker(sourceUrl);
    if (byUrl) return byUrl.category;
  }
  const byName = matchTracker(name);
  if (byName) return byName.category;
  return null;
}

export function isTrackerFindingType(findingType: ScanFindingType) {
  return ['SCRIPT', 'IFRAME', 'PIXEL', 'NETWORK_REQUEST', 'SERVICE_WORKER'].includes(findingType);
}

export function isStorageFindingType(findingType: ScanFindingType) {
  return ['LOCAL_STORAGE', 'SESSION_STORAGE', 'INDEXED_DB'].includes(findingType);
}

export function groupScanFindingsForIngest(
  findings: Array<{
    findingType: ScanFindingType;
    consentState: string;
    name: string;
    cookieDomain: string | null;
    sourceUrl: string | null;
    expiresAt: Date | null;
    isThirdParty: boolean | null;
    technology: string | null;
    metadata: unknown;
  }>,
): GroupedScanFinding[] {
  const grouped = new Map<string, GroupedScanFinding>();

  for (const finding of findings) {
    if (!INGESTIBLE_FINDING_TYPES.includes(finding.findingType)) continue;

    const inventoryKey = buildInventoryKey(
      finding.findingType,
      finding.name,
      finding.cookieDomain ?? null,
      finding.sourceUrl ?? null,
    );

    const existing = grouped.get(inventoryKey);
    const foundBeforeConsent =
      finding.consentState === 'BEFORE_CONSENT' || existing?.foundBeforeConsent;

    const baseMetadata: Record<string, unknown> = {
      findingType: finding.findingType,
    };
    if (finding.technology) baseMetadata.technology = finding.technology;
    if (finding.metadata && typeof finding.metadata === 'object') {
      Object.assign(baseMetadata, finding.metadata as Record<string, unknown>);
    }

    grouped.set(inventoryKey, {
      inventoryKey,
      cookieName: finding.name,
      cookieDomain: finding.cookieDomain,
      sourceUrl: finding.sourceUrl,
      expiresAt: finding.expiresAt ?? existing?.expiresAt ?? null,
      isThirdParty: finding.isThirdParty ?? existing?.isThirdParty ?? null,
      foundBeforeConsent: Boolean(foundBeforeConsent),
      findingType: finding.findingType,
      metadata: baseMetadata,
    });
  }

  return Array.from(grouped.values());
}
