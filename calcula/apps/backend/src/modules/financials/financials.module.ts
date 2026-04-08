import { Module } from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { FinancialsResolver } from './financials.resolver';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsModule } from '../snapshots/snapshots.module';

@Module({
  imports: [SnapshotsModule],
  providers: [FinancialsService, FinancialsResolver, WebhookService],
  exports: [FinancialsService]
})
export class FinancialsModule {}
