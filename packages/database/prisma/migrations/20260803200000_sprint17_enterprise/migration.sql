-- Sprint 17: Enterprise features

ALTER TABLE "organizations" ADD COLUMN "white_label" JSONB;
ALTER TABLE "organizations" ADD COLUMN "sso_config" JSONB;
ALTER TABLE "organizations" ADD COLUMN "retention_policy" JSONB;
ALTER TABLE "organizations" ADD COLUMN "data_residency_region" VARCHAR(32);

ALTER TABLE "consent_submissions" ADD COLUMN "group_visitor_id" TEXT;
CREATE INDEX "consent_submissions_group_visitor_id_created_at_idx" ON "consent_submissions"("group_visitor_id", "created_at");

CREATE TABLE "domain_groups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "share_consent" BOOLEAN NOT NULL DEFAULT true,
    "consent_sync_secret" TEXT NOT NULL,
    "parent_domain_id" UUID,
    "allowed_hostnames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domain_group_members" (
    "group_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "domain_group_members_pkey" PRIMARY KEY ("group_id","domain_id")
);

CREATE TABLE "organization_custom_roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_custom_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_custom_roles" (
    "user_id" UUID NOT NULL,
    "custom_role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_custom_roles_pkey" PRIMARY KEY ("user_id","custom_role_id")
);

CREATE TABLE "user_domain_access" (
    "user_id" UUID NOT NULL,
    "domain_id" UUID NOT NULL,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_domain_access_pkey" PRIMARY KEY ("user_id","domain_id")
);

CREATE UNIQUE INDEX "domain_groups_organization_id_slug_key" ON "domain_groups"("organization_id", "slug");
CREATE INDEX "domain_groups_organization_id_idx" ON "domain_groups"("organization_id");
CREATE INDEX "domain_group_members_domain_id_idx" ON "domain_group_members"("domain_id");
CREATE UNIQUE INDEX "organization_custom_roles_organization_id_slug_key" ON "organization_custom_roles"("organization_id", "slug");
CREATE INDEX "organization_custom_roles_organization_id_idx" ON "organization_custom_roles"("organization_id");
CREATE INDEX "user_domain_access_domain_id_idx" ON "user_domain_access"("domain_id");

ALTER TABLE "domain_groups" ADD CONSTRAINT "domain_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_group_members" ADD CONSTRAINT "domain_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "domain_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "domain_group_members" ADD CONSTRAINT "domain_group_members_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_custom_roles" ADD CONSTRAINT "organization_custom_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "organization_custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_custom_roles" ADD CONSTRAINT "user_custom_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_domain_access" ADD CONSTRAINT "user_domain_access_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_domain_access" ADD CONSTRAINT "user_domain_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
