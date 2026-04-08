import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole, StatementType } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  FinancialValueModel,
  UpsertFinancialValuesBatchInput
} from './dto/financials.dto';
import { FinancialsService } from './financials.service';

@Resolver(() => FinancialValueModel)
export class FinancialsResolver {
  constructor(private readonly financialsService: FinancialsService) {}

  @Query(() => [FinancialValueModel])
  companyMultiPeriodFinancials(
    @Args('companyId') companyId: string,
    @Args({ name: 'periodIds', type: () => [String] }) periodIds: string[],
    @Args('statementType', { nullable: true, type: () => String }) statementType?: StatementType
  ) {
    return this.financialsService.companyMultiPeriodFinancials(companyId, periodIds, statementType);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => [FinancialValueModel])
  upsertFinancialValues(@Args('input') input: UpsertFinancialValuesBatchInput) {
    return this.financialsService.upsertFinancialValues(input.items);
  }
}
