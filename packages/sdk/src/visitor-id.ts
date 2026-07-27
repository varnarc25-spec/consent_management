import { readStorage, removeStorage, writeStorage } from './storage';

const VISITOR_PREFIX = 'cmp_visitor_';
const VISITOR_TTL_SECONDS = 365 * 24 * 60 * 60;

export interface VisitorIdentity {
  visitorId: string;
  createdAt: number;
  expiresAt: number;
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function getVisitorStorageKey(domainKey: string) {
  return `${VISITOR_PREFIX}${domainKey}`;
}

export function loadVisitorId(domainKey: string): VisitorIdentity | null {
  const raw = readStorage(getVisitorStorageKey(domainKey));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as VisitorIdentity;
    if (!data.visitorId || !data.expiresAt) return null;
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export function getOrCreateVisitorId(domainKey: string): VisitorIdentity {
  const existing = loadVisitorId(domainKey);
  if (existing) return existing;

  const identity: VisitorIdentity = {
    visitorId: `v_${randomId()}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + VISITOR_TTL_SECONDS * 1000,
  };
  writeStorage(getVisitorStorageKey(domainKey), JSON.stringify(identity), VISITOR_TTL_SECONDS);
  return identity;
}

export function rotateVisitorId(domainKey: string): VisitorIdentity {
  removeStorage(getVisitorStorageKey(domainKey));
  return getOrCreateVisitorId(domainKey);
}
