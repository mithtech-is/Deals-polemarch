import { Module } from '@nestjs/common';
import { WebhookService } from '../../common/services/webhook.service';
import { PricesModule } from '../prices/prices.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { NewsEventsService } from './news-events.service';
import { NewsEventsResolver } from './news-events.resolver';

@Module({
  imports: [SnapshotsModule, PricesModule],
  providers: [NewsEventsService, NewsEventsResolver, WebhookService],
  exports: [NewsEventsService]
})
export class NewsEventsModule {}
