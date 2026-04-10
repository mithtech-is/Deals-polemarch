import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookSecretGuard } from '../../common/guards/webhook-secret.guard';
import { SiteSettingsService } from './site-settings.service';

/**
 * Read-only public endpoint consumed by Medusa's proxy and, through it,
 * the storefront. Guarded by the shared webhook secret so the fleet of
 * public surfaces can pull the setting without a user token.
 */
@Controller()
export class SiteSettingsController {
  constructor(private readonly svc: SiteSettingsService) {}

  @Get('site-settings')
  @Public()
  @UseGuards(WebhookSecretGuard)
  get() {
    return this.svc.get();
  }
}
