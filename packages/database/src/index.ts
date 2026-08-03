import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export * from '@prisma/client';
export { createRepositories } from './repositories';
export type { Repositories } from './repositories';
export { DEFAULT_BANNER_CONTENT, DEFAULT_CONSENT_CATEGORIES } from './constants/default-consent';
export { MASTER_COOKIE_DEFINITIONS } from './constants/master-cookies';
export type { CookieDetectionPatterns, MasterCookieSeed } from './constants/master-cookies';
export { initializeDomainConsent } from './repositories/consent.repository';
export type { ScanFindingInput } from './repositories/scan.repository';
export {
  generateApiKeyMaterial,
  hashApiKey,
} from './repositories/api-key.repository';
export { generateWebhookSecret } from './repositories/webhook.repository';
