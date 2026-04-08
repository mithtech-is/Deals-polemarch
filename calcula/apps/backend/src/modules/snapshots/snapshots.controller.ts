import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookSecretGuard } from '../../common/guards/webhook-secret.guard';
import { SnapshotsService } from './snapshots.service';

/**
 * Read-only snapshot endpoints consumed by Medusa's cache layer.
 * All routes are guarded by WebhookSecretGuard so they are not
 * exposed to the public internet.
 */
@Controller()
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Get('companies/by-isin/:isin/versions')
  @Public()
  @UseGuards(WebhookSecretGuard)
  versionsByIsin(@Param('isin') isin: string) {
    return this.snapshotsService.versionsByIsin(isin);
  }

  @Get('companies/by-isin/:isin/snapshot/statements')
  @Public()
  @UseGuards(WebhookSecretGuard)
  statementsByIsin(@Param('isin') isin: string) {
    return this.snapshotsService.statementsByIsin(isin);
  }

  @Get('companies/by-isin/:isin/snapshot/prices')
  @Public()
  @UseGuards(WebhookSecretGuard)
  pricesByIsin(@Param('isin') isin: string) {
    return this.snapshotsService.pricesByIsin(isin);
  }

  @Get('companies/by-isin/:isin/snapshot/news')
  @Public()
  @UseGuards(WebhookSecretGuard)
  newsByIsin(@Param('isin') isin: string) {
    return this.snapshotsService.newsByIsin(isin);
  }

  @Get('companies/by-isin/:isin/snapshot/editorial')
  @Public()
  @UseGuards(WebhookSecretGuard)
  editorialByIsin(@Param('isin') isin: string) {
    return this.snapshotsService.editorialByIsin(isin);
  }

  // Moved off /companies/* to avoid colliding with CompaniesController's :id route
  @Get('snapshots/versions-since')
  @Public()
  @UseGuards(WebhookSecretGuard)
  versionsSince(@Query('since') since: string, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 200;
    return this.snapshotsService.versionsSince(since, Number.isFinite(n) ? n : 200);
  }
}
