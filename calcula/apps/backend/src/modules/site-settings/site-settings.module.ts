import { Module } from '@nestjs/common';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { SiteSettingsController } from './site-settings.controller';
import { SiteSettingsResolver } from './site-settings.resolver';
import { SiteSettingsService } from './site-settings.service';

@Module({
  imports: [SnapshotsModule],
  controllers: [SiteSettingsController],
  providers: [SiteSettingsService, SiteSettingsResolver],
  exports: [SiteSettingsService]
})
export class SiteSettingsModule {}
