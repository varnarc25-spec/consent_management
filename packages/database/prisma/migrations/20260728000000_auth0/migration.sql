-- Auth0 identity provider support
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "auth0_sub" TEXT;

CREATE UNIQUE INDEX "users_auth0_sub_key" ON "users"("auth0_sub");
