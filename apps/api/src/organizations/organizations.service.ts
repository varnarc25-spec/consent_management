import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Repositories } from '@cmp/database';
import type { CurrentUser } from '@cmp/types';
import type { CreateOrganizationInput } from '@cmp/validation';
import { REPOS } from '../database/database.module';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(REPOS) private readonly repos: Repositories,
    private readonly auditService: AuditService,
  ) {}

  async create(user: CurrentUser, input: CreateOrganizationInput, meta: AuditMeta) {
    if (user.organizationId) {
      throw new BadRequestException({
        code: 'ORG_EXISTS',
        message: 'User already belongs to an organization',
      });
    }

    const org = await this.repos.organizations.createUnique(input);
    await this.repos.users.update(user.id, {
      organization: { connect: { id: org.id } },
    });
    await this.repos.users.assignRole(user.id, 'org_owner');

    await this.auditService.log({
      userId: user.id,
      organizationId: org.id,
      action: 'organization.created',
      module: 'organization',
      newValue: { id: org.id, name: org.name, slug: org.slug },
      ...meta,
    });

    return org;
  }

  async getMine(user: CurrentUser) {
    if (!user.organizationId) return null;
    return this.repos.organizations.findById(user.organizationId);
  }

  async update(user: CurrentUser, input: Partial<CreateOrganizationInput>, meta: AuditMeta) {
    if (!user.organizationId) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'No organization found' });
    }

    const existing = await this.repos.organizations.findById(user.organizationId);
    if (!existing) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'Organization not found' });
    }

    const updated = await this.repos.organizations.update(user.organizationId, input);

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'organization.updated',
      module: 'organization',
      previousValue: existing,
      newValue: updated,
      ...meta,
    });

    return updated;
  }

  async softDelete(user: CurrentUser, meta: AuditMeta) {
    if (!user.organizationId) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'No organization found' });
    }
    if (!user.roles.includes('org_owner') && !user.roles.includes('super_admin')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only owners can delete organizations' });
    }

    const existing = await this.repos.organizations.findById(user.organizationId);
    const deleted = await this.repos.organizations.softDelete(user.organizationId);

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'organization.deleted',
      module: 'organization',
      previousValue: existing,
      newValue: deleted,
      ...meta,
    });

    return deleted;
  }

  async permanentDelete(
    user: CurrentUser,
    input: { confirmation: 'DELETE'; organizationName: string },
    meta: AuditMeta,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'No organization found' });
    }
    if (!user.roles.includes('org_owner') && !user.roles.includes('super_admin')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only owners can permanently delete organizations',
      });
    }

    const existing = await this.repos.organizations.findById(user.organizationId);
    if (!existing) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'Organization not found' });
    }
    if (existing.name !== input.organizationName) {
      throw new BadRequestException({
        code: 'CONFIRMATION_MISMATCH',
        message: 'Organization name does not match',
      });
    }

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'organization.permanently_deleted',
      module: 'organization',
      previousValue: existing,
      newValue: null,
      ...meta,
    });

    return this.repos.organizations.permanentDelete(user.organizationId);
  }

  async getOnboarding(user: CurrentUser) {
    if (!user.organizationId) {
      return { step: 3, complete: false, hasOrganization: false };
    }
    const org = await this.repos.organizations.findById(user.organizationId);
    const domains = await this.repos.domains.listByOrganization(user.organizationId);
    return {
      step: org?.onboardingStep ?? 3,
      complete: org?.onboardingComplete ?? false,
      hasOrganization: true,
      organization: org,
      domainCount: domains.length,
      hasVerifiedDomain: domains.some((d) => d.verificationStatus === 'VERIFIED'),
    };
  }

  async updateOnboarding(
    user: CurrentUser,
    input: {
      step?: number;
      complete?: boolean;
      profile?: Partial<CreateOrganizationInput>;
    },
    meta: AuditMeta,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException({ code: 'NO_ORG', message: 'No organization found' });
    }

    const updates: Record<string, unknown> = {};
    if (input.step !== undefined) updates.onboardingStep = input.step;
    if (input.complete !== undefined) updates.onboardingComplete = input.complete;
    if (input.profile) Object.assign(updates, input.profile);

    const updated = await this.repos.organizations.update(user.organizationId, updates);

    await this.auditService.log({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'organization.onboarding_updated',
      module: 'organization',
      newValue: { step: input.step, complete: input.complete },
      ...meta,
    });

    return updated;
  }
}

export interface AuditMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}
