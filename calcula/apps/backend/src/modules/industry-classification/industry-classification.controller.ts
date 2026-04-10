import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { IndustryClassificationService } from './industry-classification.service';

/**
 * REST endpoints for managing the TRBC industry classification taxonomy.
 * Mounted under `/api/industry-classification`. All mutations are admin-only.
 * The tree endpoint is also admin-only since the whole module exists to
 * power the admin UI.
 */
@Controller('industry-classification')
export class IndustryClassificationController {
  constructor(private readonly service: IndustryClassificationService) {}

  @Get('tree')
  @Roles(PlatformRole.ADMIN)
  tree() {
    return this.service.tree();
  }

  // Sectors -----------------------------------------------------------------

  @Post('sectors')
  @Roles(PlatformRole.ADMIN)
  upsertSector(
    @Body()
    body: { id?: string; name: string; code?: string | null; sortOrder?: number }
  ) {
    return this.service.upsertSector(body);
  }

  @Delete('sectors/:id')
  @Roles(PlatformRole.ADMIN)
  deleteSector(@Param('id') id: string) {
    return this.service.deleteSector(id);
  }

  // Industries --------------------------------------------------------------

  @Post('industries')
  @Roles(PlatformRole.ADMIN)
  upsertIndustry(
    @Body()
    body: { id?: string; sectorId: string; name: string; code?: string | null; sortOrder?: number }
  ) {
    return this.service.upsertIndustry(body);
  }

  @Delete('industries/:id')
  @Roles(PlatformRole.ADMIN)
  deleteIndustry(@Param('id') id: string) {
    return this.service.deleteIndustry(id);
  }

  // Activities --------------------------------------------------------------

  @Post('activities')
  @Roles(PlatformRole.ADMIN)
  upsertActivity(
    @Body()
    body: {
      id?: string;
      industryId: string;
      name: string;
      code?: string | null;
      sortOrder?: number;
    }
  ) {
    return this.service.upsertActivity(body);
  }

  @Delete('activities/:id')
  @Roles(PlatformRole.ADMIN)
  deleteActivity(@Param('id') id: string) {
    return this.service.deleteActivity(id);
  }
}
