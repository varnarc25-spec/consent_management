import { Module } from '@nestjs/common';
import { ConsentModule } from '../consent/consent.module';
import { PublicCmpController } from './public-cmp.controller';

@Module({
  imports: [ConsentModule],
  controllers: [PublicCmpController],
})
export class PublicCmpModule {}
