import type { PrismaClient } from '@prisma/client';

export class ConsentSubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    domainId: string;
    organizationId: string;
    visitorId: string;
    policyVersionId?: string | null;
    configVersion: number;
    categories: Record<string, boolean>;
    region?: string | null;
    language?: string | null;
    collectionMethod: string;
    checksum: string;
    userAgent?: string | null;
    expiresAt?: Date | null;
  }) {
    return this.prisma.consentSubmission.create({
      data: {
        domainId: data.domainId,
        organizationId: data.organizationId,
        visitorId: data.visitorId,
        policyVersionId: data.policyVersionId ?? null,
        configVersion: data.configVersion,
        categories: data.categories,
        region: data.region ?? null,
        language: data.language ?? null,
        collectionMethod: data.collectionMethod,
        checksum: data.checksum,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  findLatestForVisitor(domainId: string, visitorId: string) {
    return this.prisma.consentSubmission.findFirst({
      where: { domainId, visitorId, withdrawnAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  markWithdrawn(domainId: string, visitorId: string) {
    return this.prisma.consentSubmission.updateMany({
      where: { domainId, visitorId, withdrawnAt: null },
      data: { withdrawnAt: new Date() },
    });
  }
}
