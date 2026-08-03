import { PERMISSIONS, ROLE_DEFINITIONS } from '@cmp/auth';
import { prisma } from './index';
import { MASTER_COOKIE_DEFINITIONS } from './constants/master-cookies';

const PERMISSION_META: Record<string, { name: string; module: string }> = {
  [PERMISSIONS.ORGANIZATION_MANAGE]: { name: 'Manage organization', module: 'organization' },
  [PERMISSIONS.DOMAIN_MANAGE]: { name: 'Manage domains', module: 'domain' },
  [PERMISSIONS.BANNER_CONFIGURE]: { name: 'Configure banners', module: 'banner' },
  [PERMISSIONS.SCAN_RUN]: { name: 'Run scans', module: 'scanner' },
  [PERMISSIONS.SCAN_VIEW]: { name: 'View scan results', module: 'scanner' },
  [PERMISSIONS.COOKIE_MANAGE]: { name: 'Manage cookies', module: 'cookie' },
  [PERMISSIONS.CONSENT_VIEW]: { name: 'View consent logs', module: 'consent' },
  [PERMISSIONS.CONSENT_EXPORT]: { name: 'Export consent records', module: 'consent' },
  [PERMISSIONS.USER_MANAGE]: { name: 'Manage users', module: 'user' },
  [PERMISSIONS.INTEGRATION_MANAGE]: { name: 'Manage integrations', module: 'integration' },
  [PERMISSIONS.BILLING_MANAGE]: { name: 'Manage billing', module: 'billing' },
  [PERMISSIONS.API_KEY_MANAGE]: { name: 'Manage API keys', module: 'api' },
  [PERMISSIONS.AUDIT_VIEW]: { name: 'View audit logs', module: 'audit' },
};

async function main() {
  for (const [slug, meta] of Object.entries(PERMISSION_META)) {
    await prisma.permission.upsert({
      where: { slug },
      create: { slug, name: meta.name, module: meta.module },
      update: { name: meta.name, module: meta.module },
    });
  }

  for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.upsert({
      where: { slug },
      create: { slug, name: def.name, description: def.description },
      update: { name: def.name, description: def.description },
    });

    const permissions = await prisma.permission.findMany({
      where: { slug: { in: def.permissions } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Seeded roles and permissions');

  for (const cookie of MASTER_COOKIE_DEFINITIONS) {
    const existing = await prisma.cookieDefinition.findFirst({
      where: { organizationId: null, cookieName: cookie.cookieName, provider: cookie.provider },
    });

    if (existing) {
      await prisma.cookieDefinition.update({
        where: { id: existing.id },
        data: {
          providerDomain: cookie.providerDomain,
          description: cookie.description,
          purpose: cookie.purpose,
          category: cookie.category,
          duration: cookie.duration,
          dataCollected: cookie.dataCollected,
          isThirdParty: cookie.isThirdParty,
          privacyPolicyUrl: cookie.privacyPolicyUrl,
          riskLevel: cookie.riskLevel,
          aliases: cookie.aliases ?? undefined,
          detectionPatterns: cookie.detectionPatterns as object,
          isSystem: true,
        },
      });
    } else {
      await prisma.cookieDefinition.create({
        data: {
          organizationId: null,
          cookieName: cookie.cookieName,
          provider: cookie.provider,
          providerDomain: cookie.providerDomain,
          description: cookie.description,
          purpose: cookie.purpose,
          category: cookie.category,
          duration: cookie.duration,
          dataCollected: cookie.dataCollected,
          isThirdParty: cookie.isThirdParty,
          privacyPolicyUrl: cookie.privacyPolicyUrl,
          riskLevel: cookie.riskLevel,
          aliases: cookie.aliases ?? undefined,
          detectionPatterns: cookie.detectionPatterns as object,
          isSystem: true,
        },
      });
    }
  }

  console.log(`Seeded ${MASTER_COOKIE_DEFINITIONS.length} master cookie definitions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
