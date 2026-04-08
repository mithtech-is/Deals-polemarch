import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CompanyOverviewModel,
  ProsConsModel,
  UpsertCompanyOverviewInput,
  UpsertProsConsInput
} from './dto/editorial.dto';
import { EditorialService } from './editorial.service';

@Resolver()
export class EditorialResolver {
  constructor(private readonly editorialService: EditorialService) {}

  // Named `companyNarrative` to avoid collision with
  // AnalyticsResolver.companyOverview (which is the financial overview
  // card data, unrelated to this long-form narrative).
  @Query(() => CompanyOverviewModel, { nullable: true })
  companyNarrative(@Args('companyId') companyId: string) {
    return this.editorialService.getOverview(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyOverviewModel)
  upsertCompanyNarrative(@Args('input') input: UpsertCompanyOverviewInput) {
    return this.editorialService.upsertOverview(input);
  }

  @Query(() => ProsConsModel, { nullable: true })
  companyProsCons(@Args('companyId') companyId: string) {
    return this.editorialService.getProsCons(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => ProsConsModel)
  upsertProsCons(@Args('input') input: UpsertProsConsInput) {
    return this.editorialService.upsertProsCons(input);
  }
}
