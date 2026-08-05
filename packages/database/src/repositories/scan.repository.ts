import type { Prisma, PrismaClient, ScanConsentState, ScanFindingType, ScanStatus } from '@prisma/client';

export interface CreateScanInput {
  domainId: string;
  organizationId: string;
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  includePaths?: string[];
  excludePaths?: string[];
  timeoutMs: number;
  jsRendering: boolean;
  deviceType: string;
  createdByUserId?: string;
}

export interface ScanFindingInput {
  findingType: ScanFindingType;
  consentState: ScanConsentState;
  name: string;
  valueSample?: string | null;
  cookieDomain?: string | null;
  cookiePath?: string | null;
  expiresAt?: Date | null;
  secure?: boolean | null;
  httpOnly?: boolean | null;
  sameSite?: string | null;
  isThirdParty?: boolean | null;
  pageUrl?: string | null;
  technology?: string | null;
  sourceUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  pageId?: string | null;
}

export class ScanRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string) {
    return this.prisma.domainScan.findUnique({
      where: { id },
      include: {
        pages: { orderBy: { scannedAt: 'asc' } },
        findings: { orderBy: { name: 'asc' } },
      },
    });
  }

  listByDomain(domainId: string, limit = 50) {
    return this.prisma.domainScan.findMany({
      where: { domainId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  countRunningForDomain(domainId: string) {
    return this.prisma.domainScan.count({
      where: { domainId, status: { in: ['PENDING', 'RUNNING'] } },
    });
  }

  async expireStaleRunningScans(domainId?: string, maxAgeMs = 30 * 60 * 1000) {
    const zeroProgressCutoff = new Date(Date.now() - 10 * 60 * 1000);
    const cutoff = new Date(Date.now() - maxAgeMs);
    const domainFilter = domainId ? { domainId } : {};

    await this.prisma.domainScan.updateMany({
      where: {
        status: 'RUNNING',
        pagesScanned: 0,
        startedAt: { lt: zeroProgressCutoff },
        ...domainFilter,
      },
      data: {
        status: 'FAILED',
        errorMessage:
          'Scan timed out with no pages crawled (server may have restarted). Start a new scan.',
        completedAt: new Date(),
      },
    });

    const stale = await this.prisma.domainScan.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: cutoff },
        ...domainFilter,
      },
      select: { id: true, startedAt: true },
    });

    for (const scan of stale) {
      const durationMs = scan.startedAt
        ? Date.now() - scan.startedAt.getTime()
        : maxAgeMs;
      await this.prisma.domainScan.update({
        where: { id: scan.id },
        data: {
          status: 'FAILED',
          errorMessage:
            'Scan timed out or was interrupted (server restarted). Start a new scan.',
          completedAt: new Date(),
          durationMs,
        },
      });
    }

    return stale.length;
  }

  create(input: CreateScanInput) {
    return this.prisma.domainScan.create({
      data: {
        domainId: input.domainId,
        organizationId: input.organizationId,
        startUrl: input.startUrl,
        maxPages: input.maxPages,
        maxDepth: input.maxDepth,
        includePaths: input.includePaths ?? undefined,
        excludePaths: input.excludePaths ?? undefined,
        timeoutMs: input.timeoutMs,
        jsRendering: input.jsRendering,
        deviceType: input.deviceType,
        createdByUserId: input.createdByUserId,
      },
    });
  }

  updateStatus(
    id: string,
    status: ScanStatus,
    patch?: {
      errorMessage?: string | null;
      startedAt?: Date;
      completedAt?: Date;
      durationMs?: number;
      pagesScanned?: number;
      cookiesFound?: number;
      trackersFound?: number;
    },
  ) {
    return this.prisma.domainScan.update({
      where: { id },
      data: {
        status,
        errorMessage: patch?.errorMessage,
        startedAt: patch?.startedAt,
        completedAt: patch?.completedAt,
        durationMs: patch?.durationMs,
        pagesScanned: patch?.pagesScanned,
        cookiesFound: patch?.cookiesFound,
        trackersFound: patch?.trackersFound,
      },
    });
  }

  createPage(scanId: string, data: {
    url: string;
    canonicalUrl?: string | null;
    status: string;
    depth: number;
    errorMessage?: string | null;
  }) {
    return this.prisma.domainScanPage.create({
      data: {
        scanId,
        url: data.url,
        canonicalUrl: data.canonicalUrl,
        status: data.status,
        depth: data.depth,
        errorMessage: data.errorMessage,
      },
    });
  }

  createFindings(scanId: string, findings: ScanFindingInput[]) {
    if (findings.length === 0) return { count: 0 };
    return this.prisma.domainScanFinding.createMany({
      data: findings.map((finding) => ({
        scanId,
        pageId: finding.pageId,
        findingType: finding.findingType,
        consentState: finding.consentState,
        name: finding.name,
        valueSample: finding.valueSample,
        cookieDomain: finding.cookieDomain,
        cookiePath: finding.cookiePath,
        expiresAt: finding.expiresAt,
        secure: finding.secure,
        httpOnly: finding.httpOnly,
        sameSite: finding.sameSite,
        isThirdParty: finding.isThirdParty,
        pageUrl: finding.pageUrl,
        technology: finding.technology,
        sourceUrl: finding.sourceUrl,
        metadata: finding.metadata,
      })),
    });
  }

  findLatestForOrganization(organizationId: string) {
    return this.prisma.domainScan.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async aggregateForOrganization(organizationId: string, domainId?: string) {
    const scanWhere = domainId ? { domainId } : { organizationId };
    const byStatus = await this.prisma.domainScan.groupBy({
      by: ['status'],
      where: scanWhere,
      _count: { _all: true },
    });
    const totalScans = await this.prisma.domainScan.count({ where: scanWhere });
    const pagesScanned = await this.prisma.domainScan.aggregate({
      where: { ...scanWhere, status: 'COMPLETED' },
      _sum: { pagesScanned: true },
    });
    const byFindingType = await this.prisma.domainScanFinding.groupBy({
      by: ['findingType'],
      where: { scan: scanWhere },
      _count: { _all: true },
    });
    const failedScans = byStatus.find((r) => r.status === 'FAILED')?._count._all ?? 0;

    return {
      totalScans,
      pagesScannedTotal: pagesScanned._sum.pagesScanned ?? 0,
      failedScans,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byFindingType: byFindingType.map((r) => ({
        type: r.findingType,
        count: r._count._all,
      })),
    };
  }
}
