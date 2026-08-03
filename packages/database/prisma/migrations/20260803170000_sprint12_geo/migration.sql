-- Sprint 12: geo targeting disable flag on organizations
ALTER TABLE "organizations" ADD COLUMN "geo_targeting_disabled" BOOLEAN NOT NULL DEFAULT false;
