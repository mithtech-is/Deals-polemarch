import { Module } from '@nestjs/common';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { PeriodsService } from './periods.service';
import { PeriodsResolver } from './periods.resolver';

@Module({
  imports: [SnapshotsModule],
  providers: [PeriodsService, PeriodsResolver, WebhookService],
  exports: [PeriodsService]
})
export class PeriodsModule {}
