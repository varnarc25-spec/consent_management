import { createHmac } from 'node:crypto';

export function computeGroupVisitorId(secret: string, visitorId: string): string {
  return createHmac('sha256', secret).update(visitorId).digest('hex');
}
