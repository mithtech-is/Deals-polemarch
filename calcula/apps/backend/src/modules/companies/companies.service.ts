import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyInput, UpdateCompanyInput } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: string) {
    return this.prisma.company.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async one(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async byIsin(isin: string) {
    const company = await this.prisma.company.findUnique({ where: { isin } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  create(input: CreateCompanyInput) {
    return this.prisma.company.create({
      data: {
        ...input,
        country: input.country ?? 'IN',
        listingStatus: input.listingStatus ?? 'unlisted'
      }
    });
  }

  async update(id: string, input: UpdateCompanyInput) {
    await this.one(id);
    return this.prisma.company.update({ where: { id }, data: input });
  }

  async delete(id: string) {
    await this.one(id);
    return this.prisma.company.delete({ where: { id } });
  }
}
