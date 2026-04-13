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

  @Post()
  @Roles(PlatformRole.ADMIN)
  create(@Body() input: CreateCompanyInput) {
    return this.companiesService.create(input);
  }

  // ── Literal routes BEFORE parameterised :id routes ──────────

  /** POST /api/companies/import — Inverse of export. Admin-only. */
  @Post('import')
  @Roles(PlatformRole.ADMIN)
  async importOne(@Body() payload: Record<string, unknown>) {
    return this.companiesService.importOne(payload);
  }

  /** POST /api/companies/sync-all — Sync all companies to Medusa. */
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

  // ── Parameterised :id routes ────────────────────────────────

  @Get(':id')
  one(@Param('id') id: string) {
    return this.companiesService.one(id);
  }

  @Patch(':id')
  @Roles(PlatformRole.ADMIN)
  update(@Param('id') id: string, @Body() input: UpdateCompanyInput) {
    return this.companiesService.update(id, input);
  }

  /** POST /api/companies/:id/sync — Manual sync one company to Medusa. */
  @Post(':id/sync')
  @Roles(PlatformRole.ADMIN)
  async syncOne(@Param('id') id: string) {
    await this.companiesService.one(id);
    await this.webhookService.syncToMedusa(id);
    return { success: true, company_id: id };
  }

  /** GET /api/companies/:id/export — Full company JSON blob. Admin-only. */
  @Get(':id/export')
  @Roles(PlatformRole.ADMIN)
  async exportOne(@Param('id') id: string) {
    return this.companiesService.exportOne(id);
  }
}
