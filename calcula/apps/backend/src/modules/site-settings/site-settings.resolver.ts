import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SiteSettingsModel, UpdateSiteSettingsInput } from './dto/site-settings.dto';
import {
  SiteSettingsService,
  SiteDisplayScale
} from './site-settings.service';

@Resolver()
export class SiteSettingsResolver {
  constructor(private readonly svc: SiteSettingsService) {}

  @Query(() => SiteSettingsModel)
  async siteSettings(): Promise<SiteSettingsModel> {
    const p = await this.svc.get();
    return { defaultCurrency: p.defaultCurrency, defaultScale: p.defaultScale };
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => SiteSettingsModel)
  async updateSiteSettings(
    @Args('input') input: UpdateSiteSettingsInput
  ): Promise<SiteSettingsModel> {
    const p = await this.svc.update({
      defaultCurrency: input.defaultCurrency,
      defaultScale: input.defaultScale as SiteDisplayScale | undefined
    });
    return { defaultCurrency: p.defaultCurrency, defaultScale: p.defaultScale };
  }
}
