import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Repositories } from '@cmp/database';
import type { CurrentUser } from '@cmp/types';
import type { CreateDomainScanInput } from '@cmp/validation';
import { REPOS } from '../database/database.module';
import { assertSameOrganization } from '../common/guards/tenant.guard';
import { AuditService } from '../audit/audit.service';
import type { AuditMeta } from '../organizations/organizations.service';
import { CookiesService } from '../cookies/cookies.service';
import { WebhookDeliveryService } from '../webhooks/webhook-delivery.service';
import { runWebsiteScan } from './scanner/scanner.engine';
import { buildStartUrl } from './scanner/crawl.util';
import { nextScanAtFromFrequency } from '../domains/domains.service';

export interface ScanSummaryResponse {
  id: string;
  domainId: string;
  status: string;
  startUrl: string;
  maxPages: number;
  maxDepth: number;
  pagesScanned: number;
  progressPercent?: number;
  cookiesFound: number;
  trackersFound: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ScanDetailResponse extends ScanSummaryResponse {
  includePaths: string[] | null;
  excludePaths: string[] | null;
  timeoutMs: number;
  jsRendering: boolean;
  deviceType: string;
  pages: Array<{
    id: string;
    url: string;
    canonicalUrl: string | null;
    status: string;
    depth: number;
    errorMessage: string | null;
    scannedAt: string;
  }>;
  findings: Array<{
    id: string;
    findingType: string;
    consentState: string;
    name: string;
    valueSample: string | null;
    cookieDomain: string | null;
    cookiePath: string | null;
    expiresAt: string | null;
    secure: boolean | null;
    httpOnly: boolean | null;
    sameSite: string | null;
    isThirdParty: boolean | null;
    pageUrl: string | null;
    technology: string | null;
    sourceUrl: string | null;
  }>;
}

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);
  private readonly activeScans = new Set<string>();

  constructor(
    @Inject(REPOS) private readonly repos: Repositories,
    private readonly auditService: AuditService,
    private readonly cookiesService: CookiesService,
    private readonly webhookDelivery: WebhookDeliveryService,
  ) {}

  async list(user: CurrentUser, domainId: string): Promise<ScanSummaryResponse[]> {
    const domain = await this.getDomainForUser(user, domainId);
    await this.repos.scans.expireStaleRunningScans(domain.id);
    const scans = await this.repos.scans.listByDomain(domain.id);
    return scans.map((scan) => this.toSummary(scan));
  }

  async get(user: CurrentUser, domainId: string, scanId: string): Promise<ScanDetailResponse> {
    const domain = await this.getDomainForUser(user, domainId);
    const scan = await this.repos.scans.findById(scanId);
    if (!scan || scan.domainId !== domain.id) {
      throw new NotFoundException({ code: 'SCAN_NOT_FOUND', message: 'Scan not found' });
    }
    return this.toDetail(scan);
  }

  async exportPagesCsv(user: CurrentUser, domainId: string, scanId: string) {
    const domain = await this.getDomainForUser(user, domainId);
    const scan = await this.repos.scans.findById(scanId);
    if (!scan || scan.domainId !== domain.id) {
      throw new NotFoundException({ code: 'SCAN_NOT_FOUND', message: 'Scan not found' });
    }

    const header = 'url,status,depth,error_message\n';
    const rows = scan.pages
      .map((page) =>
        [page.url, page.status, page.depth, page.errorMessage ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    return { hostname: domain.hostname, csv: header + rows };
  }

  async start(
    user: CurrentUser,
    domainId: string,
    input: CreateDomainScanInput,
    meta: AuditMeta,
  ): Promise<ScanSummaryResponse> {
    const domain = await this.getDomainForUser(user, domainId);
    const running = await this.repos.scans.countRunningForDomain(domain.id);
    if (running > 0) {
      throw new ConflictException({
        code: 'SCAN_ALREADY_RUNNING',
        message: 'A scan is already running for this domain',
      });
    }

    const maxPages = Math.min(input.maxPages ?? domain.scanLimit, domain.scanLimit);
    const startUrl = input.startUrl ?? buildStartUrl(domain.hostname);

    const scan = await this.repos.scans.create({
      domainId: domain.id,
      organizationId: domain.organizationId,
      startUrl,
      maxPages,
      maxDepth: input.maxDepth,
      includePaths: input.includePaths,
      excludePaths: input.excludePaths,
      timeoutMs: input.timeoutMs,
      jsRendering: input.jsRendering,
      deviceType: input.deviceType,
      createdByUserId: user.id,
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'scan.started',
      module: 'scanner',
      newValue: { scanId: scan.id, domainId: domain.id, startUrl },
      ...meta,
    });

    void this.processScan(scan.id).catch((error) => {
      this.logger.error(
        `Background scan ${scan.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    void this.webhookDelivery.emit(scan.organizationId, 'scan.started', {
      scanId: scan.id,
      domainId: domain.id,
      startUrl,
      status: scan.status,
    });
    return this.toSummary(scan);
  }

  async retryScan(
    user: CurrentUser,
    domainId: string,
    scanId: string,
    meta: AuditMeta,
  ): Promise<ScanSummaryResponse> {
    const domain = await this.getDomainForUser(user, domainId);
    const failedScan = await this.repos.scans.findById(scanId);
    if (!failedScan || failedScan.domainId !== domain.id) {
      throw new NotFoundException({ code: 'SCAN_NOT_FOUND', message: 'Scan not found' });
    }
    if (failedScan.status !== 'FAILED') {
      throw new BadRequestException({
        code: 'SCAN_NOT_FAILED',
        message: 'Only failed scans can be retried',
      });
    }

    const running = await this.repos.scans.countRunningForDomain(domain.id);
    if (running > 0) {
      throw new ConflictException({
        code: 'SCAN_ALREADY_RUNNING',
        message: 'A scan is already running for this domain',
      });
    }

    const includePaths = (failedScan.includePaths as string[] | null) ?? undefined;
    const excludePaths = (failedScan.excludePaths as string[] | null) ?? undefined;

    const scan = await this.repos.scans.create({
      domainId: domain.id,
      organizationId: domain.organizationId,
      startUrl: failedScan.startUrl,
      maxPages: Math.min(failedScan.maxPages, domain.scanLimit),
      maxDepth: failedScan.maxDepth,
      includePaths,
      excludePaths,
      timeoutMs: failedScan.timeoutMs,
      jsRendering: failedScan.jsRendering,
      deviceType: failedScan.deviceType,
      createdByUserId: user.id,
    });

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'scan.retried',
      module: 'scanner',
      newValue: { scanId: scan.id, retriedFromScanId: scanId, domainId: domain.id },
      ...meta,
    });

    void this.processScan(scan.id).catch((error) => {
      this.logger.error(
        `Background scan ${scan.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    void this.webhookDelivery.emit(scan.organizationId, 'scan.started', {
      scanId: scan.id,
      domainId: domain.id,
      startUrl: scan.startUrl,
      status: scan.status,
      retriedFromScanId: scanId,
    });
    return this.toSummary(scan);
  }

  async runDueScans() {
    const due = await this.repos.domains.findDueForScan(new Date());
    for (const domain of due) {
      try {
        const running = await this.repos.scans.countRunningForDomain(domain.id);
        if (running === 0) {
          await this.start(
            this.systemUser(domain.organizationId),
            domain.id,
            {
              startUrl: buildStartUrl(domain.hostname),
              maxPages: domain.scanLimit,
              maxDepth: 3,
              timeoutMs: 30000,
              jsRendering: true,
              deviceType: 'desktop',
            },
            {},
          );
        }
        await this.repos.domains.update(domain.id, {
          nextScanAt: nextScanAtFromFrequency(domain.scanFrequency),
        });
      } catch (error) {
        this.logger.warn(
          `Scheduled scan for domain ${domain.id} failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private systemUser(organizationId: string): CurrentUser {
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'scheduler@internal.cmp',
      firstName: 'Scan',
      lastName: 'Scheduler',
      emailVerified: true,
      organizationId,
      roles: ['org_admin'],
      permissions: [],
    };
  }

  private async processScan(scanId: string) {
    if (this.activeScans.has(scanId)) return;
    this.activeScans.add(scanId);

    const startedAt = new Date();
    try {
      const scan = await this.repos.scans.findById(scanId);
      if (!scan) return;

      await this.repos.scans.updateStatus(scanId, 'RUNNING', { startedAt });

      const result = await runWebsiteScan(scan, async (pageRecord, progress) => {
        const page = await this.repos.scans.createPage(scanId, {
          url: pageRecord.url,
          canonicalUrl: pageRecord.canonicalUrl,
          status: pageRecord.status,
          depth: pageRecord.depth,
          errorMessage: pageRecord.errorMessage,
        });

        const findings = pageRecord.findings.map((finding) => ({
          ...finding,
          pageId: page.id,
        }));
        await this.repos.scans.createFindings(scanId, findings);

        await this.repos.scans.updateStatus(scanId, 'RUNNING', {
          pagesScanned: progress.pagesScanned,
          cookiesFound: progress.cookiesFound,
          trackersFound: progress.trackersFound,
        });
      });

      const completedAt = new Date();
      await this.repos.scans.updateStatus(scanId, 'COMPLETED', {
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        pagesScanned: result.pagesScanned,
        cookiesFound: result.cookiesFound,
        trackersFound: result.trackersFound,
      });

      try {
        await this.cookiesService.ingestScanResults(scanId);
      } catch (ingestError) {
        const ingestMessage =
          ingestError instanceof Error ? ingestError.message : 'Cookie inventory ingest failed';
        this.logger.error(`Scan ${scanId} ingest failed: ${ingestMessage}`);
        await this.repos.scans.updateStatus(scanId, 'COMPLETED', {
          errorMessage: `Scan finished but cookie inventory update failed: ${ingestMessage}`,
        });
      }

      void this.webhookDelivery.emit(scan.organizationId, 'scan.completed', {
        scanId,
        domainId: scan.domainId,
        pagesScanned: result.pagesScanned,
        cookiesFound: result.cookiesFound,
        trackersFound: result.trackersFound,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed';
      await this.repos.scans.updateStatus(scanId, 'FAILED', {
        errorMessage: message,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
      });
      const failedScan = await this.repos.scans.findById(scanId);
      if (failedScan) {
        void this.webhookDelivery.emit(failedScan.organizationId, 'scan.failed', {
          scanId,
          domainId: failedScan.domainId,
          errorMessage: message,
        });
      }
    } finally {
      this.activeScans.delete(scanId);
    }
  }

  private async getDomainForUser(user: CurrentUser, domainId: string) {
    if (!user.organizationId) {
      throw new BadRequestException({ code: 'ORG_REQUIRED', message: 'Organization required' });
    }
    const domain = await this.repos.domains.findById(domainId);
    if (!domain) {
      throw new NotFoundException({ code: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }
    assertSameOrganization(user, domain.organizationId);
    return domain;
  }

  private toSummary(scan: {
    id: string;
    domainId: string;
    status: string;
    startUrl: string;
    maxPages: number;
    maxDepth: number;
    pagesScanned: number;
    cookiesFound: number;
    trackersFound: number;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    durationMs: number | null;
    createdAt: Date;
  }): ScanSummaryResponse {
    const summary: ScanSummaryResponse = {
      id: scan.id,
      domainId: scan.domainId,
      status: scan.status,
      startUrl: scan.startUrl,
      maxPages: scan.maxPages,
      maxDepth: scan.maxDepth,
      pagesScanned: scan.pagesScanned,
      cookiesFound: scan.cookiesFound,
      trackersFound: scan.trackersFound,
      errorMessage: scan.errorMessage,
      startedAt: scan.startedAt?.toISOString() ?? null,
      completedAt: scan.completedAt?.toISOString() ?? null,
      durationMs: scan.durationMs,
      createdAt: scan.createdAt.toISOString(),
    };

    if (scan.status === 'RUNNING' && scan.maxPages > 0) {
      summary.progressPercent = Math.min(
        100,
        Math.round((scan.pagesScanned / scan.maxPages) * 100),
      );
    }

    return summary;
  }

  private toDetail(scan: NonNullable<Awaited<ReturnType<Repositories['scans']['findById']>>>): ScanDetailResponse {
    return {
      ...this.toSummary(scan),
      includePaths: (scan.includePaths as string[] | null) ?? null,
      excludePaths: (scan.excludePaths as string[] | null) ?? null,
      timeoutMs: scan.timeoutMs,
      jsRendering: scan.jsRendering,
      deviceType: scan.deviceType,
      pages: scan.pages.map((page) => ({
        id: page.id,
        url: page.url,
        canonicalUrl: page.canonicalUrl,
        status: page.status,
        depth: page.depth,
        errorMessage: page.errorMessage,
        scannedAt: page.scannedAt.toISOString(),
      })),
      findings: scan.findings.map((finding) => ({
        id: finding.id,
        findingType: finding.findingType,
        consentState: finding.consentState,
        name: finding.name,
        valueSample: finding.valueSample,
        cookieDomain: finding.cookieDomain,
        cookiePath: finding.cookiePath,
        expiresAt: finding.expiresAt?.toISOString() ?? null,
        secure: finding.secure,
        httpOnly: finding.httpOnly,
        sameSite: finding.sameSite,
        isThirdParty: finding.isThirdParty,
        pageUrl: finding.pageUrl,
        technology: finding.technology,
        sourceUrl: finding.sourceUrl,
      })),
    };
  }
}
