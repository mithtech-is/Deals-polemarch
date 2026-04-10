import { Module } from '@nestjs/common';
import { WebhookService } from '../../common/services/webhook.service';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { ProfileService } from './profile.service';
import { ProfileResolver } from './profile.resolver';

@Module({
  imports: [SnapshotsModule],
  providers: [ProfileService, ProfileResolver, WebhookService],
  exports: [ProfileService]
})
export class ProfileModule {}
