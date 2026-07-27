import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Body, Controller, Get, Header, Inject, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Repositories } from '@cmp/database';
import { DOMAIN_CONFIG } from '@cmp/config';
import { sdkConsentSubmissionSchema, sdkHeartbeatSchema } from '@cmp/validation';
import { Public } from '../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ok } from '../common/utils/response';
import { REPOS } from '../database/database.module';
import { ConsentService } from '../consent/consent.service';

function requiresVerification(domain: {
  isProduction: boolean;
  environment: string;
  verificationStatus: string;
}) {
  return (
    domain.isProduction &&
    domain.environment === 'production' &&
    domain.verificationStatus !== 'VERIFIED'
  );
}

function loadSdkBundle() {
  try {
    const sdkPath = require.resolve('@cmp/sdk/dist/sdk.js');
    return readFileSync(sdkPath, 'utf8');
  } catch {
    return "console.error('[CMP] SDK bundle not found. Run pnpm --filter @cmp/sdk build');";
  }
}

@Controller('public/cmp')
export class PublicCmpController {
  constructor(
    @Inject(REPOS) private readonly repos: Repositories,
    private readonly consentService: ConsentService,
  ) {}

  @Public()
  @Get('config/:domainKey')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  async getConfig(@Param('domainKey') domainKey: string, @Res({ passthrough: true }) res: Response): Promise<unknown> {
    const domain = await this.repos.domains.findByDomainKey(domainKey);
    if (!domain || !domain.enabled) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } };
    }

    if (requiresVerification(domain)) {
      return {
        ok: false,
        error: {
          code: 'DOMAIN_NOT_VERIFIED',
          message: 'Production configuration is unavailable until domain ownership is verified',
        },
      };
    }

    const consentConfig = await this.consentService.getPublishedConfig(domain.id);

    res.setHeader('ETag', `"${domain.configVersion}"`);

    return ok({
      domainKey: domain.domainKey,
      hostname: domain.hostname,
      configVersion: domain.configVersion,
      environment: domain.environment,
      region: domain.region,
      autoBlocking: domain.autoBlocking,
      debugMode: domain.debugMode,
      verified: domain.verificationStatus === 'VERIFIED',
      policyVersionId: consentConfig?.policyVersionId ?? null,
      policyVersionNumber: consentConfig?.versionNumber ?? null,
      requiresRenewal: consentConfig?.requiresRenewal ?? false,
      categories: consentConfig?.categories ?? [],
      banner: consentConfig?.banner ?? null,
      legalText: consentConfig?.legalText ?? null,
      regulationConfig: consentConfig?.regulationConfig ?? null,
      defaultConsentStates: consentConfig?.defaultConsentStates ?? null,
      supportedLanguages: consentConfig?.supportedLanguages ?? ['en'],
    });
  }

  @Public()
  @Get('verify/:domainKey.html')
  @Header('Content-Type', 'text/html')
  async verifyHtml(@Param('domainKey') domainKey: string, @Res() res: Response) {
    const domain = await this.repos.domains.findByDomainKey(domainKey);
    if (!domain) {
      res.status(404).send('Not found');
      return;
    }
    res.send(domain.verificationToken);
  }

  @Public()
  @Post('consent')
  async submitConsent(
    @Body(new ZodValidationPipe(sdkConsentSubmissionSchema))
    body: {
      domainKey: string;
      visitorId: string;
      policyVersionId?: string | null;
      configVersion: number;
      categories: Record<string, boolean>;
      region?: string;
      language?: string;
      collectionMethod: string;
      checksum: string;
      savedAt: string;
      expiresAt?: string | null;
    },
    @Req() req: Request,
  ) {
    const domain = await this.repos.domains.findByDomainKey(body.domainKey);
    if (!domain || !domain.enabled) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } };
    }

    if (requiresVerification(domain)) {
      return {
        ok: false,
        error: { code: 'DOMAIN_NOT_VERIFIED', message: 'Domain is not verified' },
      };
    }

    const expectedChecksum = createHash('sha256')
      .update(
        JSON.stringify({
          visitorId: body.visitorId,
          configVersion: body.configVersion,
          categories: body.categories,
          savedAt: body.savedAt,
        }),
      )
      .digest('hex')
      .slice(0, 32);

    if (body.checksum !== expectedChecksum) {
      return { ok: false, error: { code: 'INVALID_CHECKSUM', message: 'Consent checksum mismatch' } };
    }

    if (body.collectionMethod === 'withdrawal') {
      await this.repos.consentSubmissions.markWithdrawn(domain.id, body.visitorId);
    }

    const record = await this.repos.consentSubmissions.create({
      domainId: domain.id,
      organizationId: domain.organizationId,
      visitorId: body.visitorId,
      policyVersionId: body.policyVersionId ?? null,
      configVersion: body.configVersion,
      categories: body.categories,
      region: body.region ?? domain.region,
      language: body.language ?? null,
      collectionMethod: body.collectionMethod,
      checksum: body.checksum,
      userAgent: req.headers['user-agent'] ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    });

    return ok({
      consentId: record.id,
      visitorId: record.visitorId,
      savedAt: record.createdAt.toISOString(),
    });
  }

  @Public()
  @Get('consent/:domainKey/:visitorId')
  async getConsentForVisitor(
    @Param('domainKey') domainKey: string,
    @Param('visitorId') visitorId: string,
  ) {
    const domain = await this.repos.domains.findByDomainKey(domainKey);
    if (!domain || !domain.enabled) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'Domain not found' } };
    }

    const record = await this.repos.consentSubmissions.findLatestForVisitor(domain.id, visitorId);
    if (!record) {
      return { ok: false, error: { code: 'NOT_FOUND', message: 'No consent record found' } };
    }

    return ok({
      consentId: record.id,
      visitorId: record.visitorId,
      categories: record.categories,
      policyVersionId: record.policyVersionId,
      configVersion: record.configVersion,
      region: record.region,
      language: record.language,
      savedAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt?.toISOString() ?? null,
      withdrawn: Boolean(record.withdrawnAt),
    });
  }

  @Public()
  @Post('heartbeat')
  async heartbeat(
    @Body(new ZodValidationPipe(sdkHeartbeatSchema))
    body: {
      domainKey: string;
      hostname: string;
      scriptLoaded?: boolean;
      consentEventDetected?: boolean;
      autoBlockingEnabled?: boolean;
      googleConsentModeDetected?: boolean;
      duplicateScripts?: number;
      jsErrors?: string[];
      scriptLoadedFirst?: boolean;
      defaultConsentApplied?: boolean;
    },
  ) {
    const domain = await this.repos.domains.findByDomainKey(body.domainKey);
    if (!domain) {
      return { ok: false, error: { code: 'INVALID_KEY', message: 'Invalid domain key' } };
    }

    await this.repos.domains.recordSdkHeartbeat(body.domainKey, {
      scriptLoaded: body.scriptLoaded,
      consentEventDetected: body.consentEventDetected,
      autoBlockingEnabled: body.autoBlockingEnabled,
      googleConsentModeDetected: body.googleConsentModeDetected,
      duplicateScripts: body.duplicateScripts,
      jsErrors: body.jsErrors,
      scriptLoadedFirst: body.scriptLoadedFirst,
      defaultConsentApplied: body.defaultConsentApplied,
    });

    if (
      DOMAIN_CONFIG.autoVerifyOnHeartbeat &&
      domain.verificationStatus !== 'VERIFIED' &&
      body.scriptLoaded !== false
    ) {
      await this.repos.domains.markVerified(domain.id, 'CMP_SCRIPT');
    }

    const refreshed = await this.repos.domains.findByDomainKey(body.domainKey);

    return ok({
      received: true,
      domainKey: body.domainKey,
      configVersion: refreshed?.configVersion ?? domain.configVersion,
      verified: refreshed?.verificationStatus === 'VERIFIED',
    });
  }

  @Public()
  @Get('sdk.js')
  @Header('Content-Type', 'application/javascript')
  sdkScript(@Res() res: Response) {
    res.send(loadSdkBundle());
  }
}
