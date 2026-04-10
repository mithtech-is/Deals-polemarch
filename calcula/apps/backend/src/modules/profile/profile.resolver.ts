import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CompanyDetailsModel,
  CompanyValuationsModel,
  UpsertCompanyDetailsInput,
  UpsertCompanyValuationsInput
} from './dto/profile.dto';
import { ProfileService } from './profile.service';

@Resolver()
export class ProfileResolver {
  constructor(private readonly profileService: ProfileService) {}

  @Query(() => CompanyDetailsModel, { nullable: true })
  companyDetails(@Args('companyId') companyId: string) {
    return this.profileService.getDetails(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyDetailsModel)
  upsertCompanyDetails(@Args('input') input: UpsertCompanyDetailsInput) {
    return this.profileService.upsertDetails(input);
  }

  @Query(() => CompanyValuationsModel, { nullable: true })
  companyValuations(@Args('companyId') companyId: string) {
    return this.profileService.getValuations(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CompanyValuationsModel)
  upsertCompanyValuations(@Args('input') input: UpsertCompanyValuationsInput) {
    return this.profileService.upsertValuations(input);
  }
}
