import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type UpsertSectorInput = { id?: string; name: string; code?: string | null; sortOrder?: number };
type UpsertIndustryInput = {
  id?: string;
  sectorId: string;
  name: string;
  code?: string | null;
  sortOrder?: number;
};
type UpsertActivityInput = {
  id?: string;
  industryId: string;
  name: string;
  code?: string | null;
  sortOrder?: number;
};

/**
 * CRUD for the TRBC (The Refinitiv Business Classification) taxonomy.
 * Three-level hierarchy: Sector → Industry → Activity.
 *
 * Cascading semantics:
 *   - Deleting a sector cascades to its industries and activities.
 *   - Company FKs are `ON DELETE SET NULL` so companies don't disappear
 *     when an admin prunes the taxonomy.
 */
@Injectable()
export class IndustryClassificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full hierarchy with nested children — used by the admin page to render
   * the editable tree and by the company edit modal to power the three
   * cascading dropdowns in one request.
   */
  async tree() {
    const sectors = await this.prisma.trbcSector.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        industries: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            activities: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
            }
          }
        }
      }
    });
    return sectors;
  }

  // --- Sectors ------------------------------------------------------------

  async upsertSector(input: UpsertSectorInput) {
    if (!input.name?.trim()) throw new BadRequestException('Name is required');
    if (input.id) {
      return this.prisma.trbcSector.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          code: input.code ?? null,
          sortOrder: input.sortOrder ?? 0
        }
      });
    }
    return this.prisma.trbcSector.create({
      data: {
        name: input.name.trim(),
        code: input.code ?? null,
        sortOrder: input.sortOrder ?? 0
      }
    });
  }

  async deleteSector(id: string) {
    const exists = await this.prisma.trbcSector.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Sector not found');
    await this.prisma.trbcSector.delete({ where: { id } });
    return { success: true };
  }

  // --- Industries ---------------------------------------------------------

  async upsertIndustry(input: UpsertIndustryInput) {
    if (!input.name?.trim()) throw new BadRequestException('Name is required');
    if (!input.sectorId) throw new BadRequestException('sectorId is required');
    const parent = await this.prisma.trbcSector.findUnique({ where: { id: input.sectorId } });
    if (!parent) throw new BadRequestException('Parent sector not found');
    if (input.id) {
      return this.prisma.trbcIndustry.update({
        where: { id: input.id },
        data: {
          sectorId: input.sectorId,
          name: input.name.trim(),
          code: input.code ?? null,
          sortOrder: input.sortOrder ?? 0
        }
      });
    }
    return this.prisma.trbcIndustry.create({
      data: {
        sectorId: input.sectorId,
        name: input.name.trim(),
        code: input.code ?? null,
        sortOrder: input.sortOrder ?? 0
      }
    });
  }

  async deleteIndustry(id: string) {
    const exists = await this.prisma.trbcIndustry.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Industry not found');
    await this.prisma.trbcIndustry.delete({ where: { id } });
    return { success: true };
  }

  // --- Activities ---------------------------------------------------------

  async upsertActivity(input: UpsertActivityInput) {
    if (!input.name?.trim()) throw new BadRequestException('Name is required');
    if (!input.industryId) throw new BadRequestException('industryId is required');
    const parent = await this.prisma.trbcIndustry.findUnique({
      where: { id: input.industryId }
    });
    if (!parent) throw new BadRequestException('Parent industry not found');
    if (input.id) {
      return this.prisma.trbcActivity.update({
        where: { id: input.id },
        data: {
          industryId: input.industryId,
          name: input.name.trim(),
          code: input.code ?? null,
          sortOrder: input.sortOrder ?? 0
        }
      });
    }
    return this.prisma.trbcActivity.create({
      data: {
        industryId: input.industryId,
        name: input.name.trim(),
        code: input.code ?? null,
        sortOrder: input.sortOrder ?? 0
      }
    });
  }

  async deleteActivity(id: string) {
    const exists = await this.prisma.trbcActivity.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Activity not found');
    await this.prisma.trbcActivity.delete({ where: { id } });
    return { success: true };
  }
}
