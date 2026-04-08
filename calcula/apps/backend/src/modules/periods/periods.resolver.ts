import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinancialPeriodModel, UpsertPeriodInput } from './dto/period.dto';
import { PeriodsService } from './periods.service';

@Resolver(() => FinancialPeriodModel)
export class PeriodsResolver {
  constructor(private readonly periodsService: PeriodsService) {}

  @Query(() => [FinancialPeriodModel])
  companyPeriods(@Args('companyId') companyId: string) {
    return this.periodsService.companyPeriods(companyId);
  }

  @Mutation(() => FinancialPeriodModel)
  @Roles(PlatformRole.ADMIN)
  upsertPeriod(@Args('input') input: UpsertPeriodInput) {
    return this.periodsService.upsert(input);
  }

  @Mutation(() => Boolean)
  @Roles(PlatformRole.ADMIN)
  async deletePeriod(@Args('id') id: string) {
    await this.periodsService.delete(id);
    return true;
  }
}
