export const TRACKER_INVENTORY_TYPES = [
  'SCRIPT',
  'IFRAME',
  'PIXEL',
  'NETWORK_REQUEST',
  'SERVICE_WORKER',
] as const;

export const COOKIE_INVENTORY_TYPES = [
  'COOKIE',
  'LOCAL_STORAGE',
  'SESSION_STORAGE',
  'INDEXED_DB',
] as const;

export function isTrackerInventoryType(type: string) {
  return TRACKER_INVENTORY_TYPES.includes(type as typeof TRACKER_INVENTORY_TYPES[number]);
}

export function isCookieInventoryType(type: string) {
  return COOKIE_INVENTORY_TYPES.includes(type as typeof COOKIE_INVENTORY_TYPES[number]);
}
