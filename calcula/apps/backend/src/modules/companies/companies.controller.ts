import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { WebhookService } from '../../common/services/webhook.service';
import { CreateCompanyInput, UpdateCompanyInput } from './dto/company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly webhookService: WebhookService,
  ) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.companiesService.list(q);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.companiesService.one(id);
  }

  @Post()
  @Roles(PlatformRole.ADMIN)
  create(@Body() input: CreateCompanyInput) {
    return this.companiesService.create(input);
  }

  @Patch(':id')
  @Roles(PlatformRole.ADMIN)
  update(@Param('id') id: string, @Body() input: UpdateCompanyInput) {
    return this.companiesService.update(id, input);
  }

  /**
   * POST /api/companies/:id/sync — Trigger a manual sync of this company's data to Medusa.
   * POST /api/companies/sync-all — Sync all companies to Medusa (initial seeding).
   */
  @Post(':id/sync')
  @Roles(PlatformRole.ADMIN)
  async syncOne(@Param('id') id: string) {
    await this.companiesService.one(id); // validate exists
    await this.webhookService.syncToMedusa(id);
    return { success: true, company_id: id };
  }

  @Post('sync-all')
  @Roles(PlatformRole.ADMIN)
  async syncAll() {
    const companies = await this.companiesService.list();
    const settled = await Promise.allSettled(
      companies.map((c) => this.webhookService.syncToMedusa(c.id))
    );
    const results = settled.map((r, i) => ({
      company_id: companies[i].id,
      success: r.status === 'fulfilled'
    }));
    return { synced: results.length, results };
  }
}
