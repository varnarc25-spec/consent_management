import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PERMISSIONS } from '@cmp/auth';
import { createDomainSchema, updateDomainSchema, verifyDomainSchema } from '@cmp/validation';
import type { CurrentUser } from '@cmp/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ok } from '../common/utils/response';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUserDecorator } from '../auth/decorators/current-user.decorator';
import { DomainsService } from './domains.service';

/** Any org member who uses the web portal or admin can list/read domains. */
const DOMAIN_READ_PERMISSIONS = [
  PERMISSIONS.DOMAIN_MANAGE,
  PERMISSIONS.BANNER_CONFIGURE,
  PERMISSIONS.CONSENT_VIEW,
  PERMISSIONS.SCAN_VIEW,
] as const;

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @RequirePermissions(...DOMAIN_READ_PERMISSIONS)
  list(@CurrentUserDecorator() user: CurrentUser) {
    return this.domainsService.list(user).then(ok);
  }

  @Get(':id')
  @RequirePermissions(...DOMAIN_READ_PERMISSIONS)
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.get(user, id).then(ok);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
  create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body(new ZodValidationPipe(createDomainSchema)) body: unknown,
    @Req() req: Request,
  ) {
    return this.domainsService
      .create(user, body as Parameters<DomainsService['create']>[1], meta(req))
      .then(ok);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
  update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDomainSchema)) body: unknown,
    @Req() req: Request,
  ) {
    return this.domainsService
      .update(user, id, body as Parameters<DomainsService['update']>[2], meta(req))
      .then(ok);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
  remove(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.domainsService.remove(user, id, meta(req)).then(ok);
  }

  @Get(':id/verification-instructions')
  @RequirePermissions(...DOMAIN_READ_PERMISSIONS)
  instructions(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.getVerificationInstructions(user, id).then(ok);
  }

  @Post(':id/verify')
  @RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
  verify(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(verifyDomainSchema)) body: { method: 'DNS_TXT' | 'HTML_FILE' | 'META_TAG' | 'CMP_SCRIPT' | 'MANUAL' },
    @Req() req: Request,
  ) {
    return this.domainsService.verify(user, id, body.method, meta(req)).then(ok);
  }

  @Get(':id/installation-script')
  @RequirePermissions(...DOMAIN_READ_PERMISSIONS)
  installScript(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.getInstallScript(user, id).then(ok);
  }

  @Post(':id/validate-installation')
  @RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
  validate(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.domainsService.validateInstallation(user, id, meta(req)).then(ok);
  }

  @Get(':id/validation-history')
  @RequirePermissions(...DOMAIN_READ_PERMISSIONS)
  history(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.validationHistory(user, id).then(ok);
  }
}

function meta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.headers['x-request-id'] as string | undefined,
  };
}
