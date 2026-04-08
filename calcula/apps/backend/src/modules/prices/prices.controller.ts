import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { WebhookSecretGuard } from '../../common/guards/webhook-secret.guard';
import { CompaniesService } from '../companies/companies.service';
import { PricesService } from './prices.service';
import { UpsertCompanyPriceInput } from './dto/price.dto';

@Controller()
export class PricesController {
  constructor(
    private readonly pricesService: PricesService,
    private readonly companiesService: CompaniesService
  ) {}

  // ── By companyId (UUID) ──────────────────────────────────────

  @Get('companies/:companyId/price/history')
  @Public()
  historyByCompanyId(@Param('companyId') companyId: string) {
    return this.pricesService.history(companyId);
  }

  @Post('companies/:companyId/price')
  @Roles(PlatformRole.ADMIN)
  upsertByCompanyId(
    @Param('companyId') companyId: string,
    @Body() body: UpsertCompanyPriceInput
  ) {
    return this.pricesService.upsertOne(companyId, body);
  }

  @Post('companies/:companyId/price/bulk')
  @Roles(PlatformRole.ADMIN)
  upsertBulkByCompanyId(
    @Param('companyId') companyId: string,
    @Body() body: { entries: UpsertCompanyPriceInput[] }
  ) {
    return this.pricesService.upsertBulk(companyId, body.entries ?? []);
  }

  @Delete('companies/:companyId/price/:id')
  @Roles(PlatformRole.ADMIN)
  deleteByCompanyId(@Param('id') id: string) {
    return this.pricesService.deleteOne(id);
  }

  // ── By ISIN (Medusa integration) ─────────────────────────────

  @Get('companies/by-isin/:isin/price/history')
  @Public()
  @UseGuards(WebhookSecretGuard)
  async historyByIsin(@Param('isin') isin: string) {
    const company = await this.companiesService.byIsin(isin);
    return this.pricesService.history(company.id);
  }

  @Post('companies/by-isin/:isin/price')
  @Public()
  @UseGuards(WebhookSecretGuard)
  async upsertByIsin(
    @Param('isin') isin: string,
    @Body() body: UpsertCompanyPriceInput
  ) {
    const company = await this.companiesService.byIsin(isin);
    return this.pricesService.upsertOne(company.id, body);
  }

  @Post('companies/by-isin/:isin/price/bulk')
  @Public()
  @UseGuards(WebhookSecretGuard)
  async upsertBulkByIsin(
    @Param('isin') isin: string,
    @Body() body: { entries: UpsertCompanyPriceInput[] }
  ) {
    const company = await this.companiesService.byIsin(isin);
    return this.pricesService.upsertBulk(company.id, body.entries ?? []);
  }
}
