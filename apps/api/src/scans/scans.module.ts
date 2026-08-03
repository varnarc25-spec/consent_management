import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CookiesModule } from '../cookies/cookies.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';

@Module({
  imports: [AuditModule, CookiesModule, WebhooksModule],
  controllers: [ScansController],
  providers: [ScansService],
  exports: [ScansService],
})
export class ScansModule {}
