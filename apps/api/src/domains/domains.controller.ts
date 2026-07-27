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

@Controller('domains')
@RequirePermissions(PERMISSIONS.DOMAIN_MANAGE)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  list(@CurrentUserDecorator() user: CurrentUser) {
    return this.domainsService.list(user).then(ok);
  }

  @Get(':id')
  get(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.get(user, id).then(ok);
  }

  @Post()
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
  remove(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.domainsService.remove(user, id, meta(req)).then(ok);
  }

  @Get(':id/verification-instructions')
  instructions(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.getVerificationInstructions(user, id).then(ok);
  }

  @Post(':id/verify')
  verify(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(verifyDomainSchema)) body: { method: 'DNS_TXT' | 'HTML_FILE' | 'META_TAG' | 'CMP_SCRIPT' | 'MANUAL' },
    @Req() req: Request,
  ) {
    return this.domainsService.verify(user, id, body.method, meta(req)).then(ok);
  }

  @Get(':id/installation-script')
  installScript(@CurrentUserDecorator() user: CurrentUser, @Param('id') id: string) {
    return this.domainsService.getInstallScript(user, id).then(ok);
  }

  @Post(':id/validate-installation')
  validate(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.domainsService.validateInstallation(user, id, meta(req)).then(ok);
  }

  @Get(':id/validation-history')
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
