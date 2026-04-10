import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CompanyCompetitorsModel,
  CompanyFaqModel,
  CompanyOverviewModel,
  CompanyShareholdersModel,
  CompanyTeamModel,
  ProsConsModel,
  UpsertCompanyCompetitorsInput,
  UpsertCompanyFaqInput,
  UpsertCompanyOverviewInput,
  UpsertCompanyShareholdersInput,
  UpsertCompanyTeamInput,
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

  @Query(() => CompanyFaqModel, { nullable: true })
  companyFaq(@Args('companyId') companyId: string) {
    return this.editorialService.getFaq(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyFaqModel)
  upsertCompanyFaq(@Args('input') input: UpsertCompanyFaqInput) {
    return this.editorialService.upsertFaq(input);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyFaqModel)
  seedDefaultFaq(@Args('companyId', { type: () => ID }) companyId: string) {
    return this.editorialService.seedDefaultFaq(companyId);
  }

  @Query(() => CompanyTeamModel, { nullable: true })
  companyTeam(@Args('companyId') companyId: string) {
    return this.editorialService.getTeam(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyTeamModel)
  upsertCompanyTeam(@Args('input') input: UpsertCompanyTeamInput) {
    return this.editorialService.upsertTeam(input);
  }

  @Query(() => CompanyShareholdersModel, { nullable: true })
  companyShareholders(@Args('companyId') companyId: string) {
    return this.editorialService.getShareholders(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyShareholdersModel)
  upsertCompanyShareholders(@Args('input') input: UpsertCompanyShareholdersInput) {
    return this.editorialService.upsertShareholders(input);
  }

  @Query(() => CompanyCompetitorsModel, { nullable: true })
  companyCompetitors(@Args('companyId') companyId: string) {
    return this.editorialService.getCompetitors(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyCompetitorsModel)
  upsertCompanyCompetitors(@Args('input') input: UpsertCompanyCompetitorsInput) {
    return this.editorialService.upsertCompetitors(input);
  }
}
