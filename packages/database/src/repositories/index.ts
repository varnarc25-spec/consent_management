import type { PrismaClient } from '@prisma/client';
import { UserRepository } from './user.repository';
import { OrganizationRepository } from './organization.repository';
import { AuditRepository } from './audit.repository';
import { AuthTokenRepository } from './auth-token.repository';

import { DomainRepository } from './domain.repository';
import {
  ConsentCategoryRepository,
  ConsentRenewalRepository,
  PolicyVersionRepository,
} from './consent.repository';
import { ConsentSubmissionRepository } from './consent-submission.repository';

export function createRepositories(prisma: PrismaClient) {
  return {
    users: new UserRepository(prisma),
    organizations: new OrganizationRepository(prisma),
    audit: new AuditRepository(prisma),
    authTokens: new AuthTokenRepository(prisma),
    domains: new DomainRepository(prisma),
    consentCategories: new ConsentCategoryRepository(prisma),
    policyVersions: new PolicyVersionRepository(prisma),
    consentRenewals: new ConsentRenewalRepository(prisma),
    consentSubmissions: new ConsentSubmissionRepository(prisma),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
