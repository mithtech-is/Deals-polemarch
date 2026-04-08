import { Module } from '@nestjs/common';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { EditorialService } from './editorial.service';
import { EditorialResolver } from './editorial.resolver';

@Module({
  imports: [SnapshotsModule],
  providers: [EditorialService, EditorialResolver, WebhookService],
  exports: [EditorialService]
})
export class EditorialModule {}
