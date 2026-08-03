import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PERMISSIONS } from '@cmp/auth';
import { createDomainScanSchema } from '@cmp/validation';
import type { CurrentUser } from '@cmp/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ok } from '../common/utils/response';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { ScansService } from './scans.service';

function meta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  };
}

@Controller('domains/:domainId/scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SCAN_VIEW)
  list(@CurrentUserDecorator() user: CurrentUser, @Param('domainId') domainId: string) {
    return this.scansService.list(user, domainId).then(ok);
  }

  @Get(':scanId')
  @RequirePermissions(PERMISSIONS.SCAN_VIEW)
  get(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('domainId') domainId: string,
    @Param('scanId') scanId: string,
  ) {
    return this.scansService.get(user, domainId, scanId).then(ok);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SCAN_RUN)
  start(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('domainId') domainId: string,
    @Body(new ZodValidationPipe(createDomainScanSchema)) body: unknown,
    @Req() req: Request,
  ) {
    return this.scansService
      .start(user, domainId, body as Parameters<ScansService['start']>[2], meta(req))
      .then(ok);
  }

  @Post(':scanId/retry')
  @RequirePermissions(PERMISSIONS.SCAN_RUN)
  retry(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('domainId') domainId: string,
    @Param('scanId') scanId: string,
    @Req() req: Request,
  ) {
    return this.scansService.retryScan(user, domainId, scanId, meta(req)).then(ok);
  }
}
