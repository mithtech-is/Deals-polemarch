import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole, StatementType } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  FinancialLineItemModel,
  FinancialRemainderMappingModel,
  RepairFinancialRemainderMappingInput,
  UpsertFinancialLineItemInput,
  UpsertFinancialRemainderMappingInput
} from './dto/taxonomy.dto';
import { TaxonomyService } from './taxonomy.service';

@Resolver(() => FinancialLineItemModel)
export class TaxonomyResolver {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Query(() => [FinancialLineItemModel])
  financialLineItemTree(
    @Args('statementType', { nullable: true, type: () => String }) statementType?: StatementType
  ) {
    return this.taxonomyService.tree(statementType);
  }

  @Query(() => [FinancialLineItemModel])
  financialLineItems(
    @Args('statementType', { nullable: true, type: () => String }) statementType?: StatementType
  ) {
    return this.taxonomyService.flat(statementType);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => FinancialLineItemModel)
  upsertFinancialLineItem(@Args('input') input: UpsertFinancialLineItemInput) {
    return this.taxonomyService.upsert(input);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => Boolean)
  deleteFinancialLineItem(@Args('id') id: string) {
    return this.taxonomyService.delete(id);
  }

  @Query(() => [FinancialRemainderMappingModel])
  financialRemainderMappings(
    @Args('statementType', { nullable: true, type: () => String }) statementType?: StatementType
  ) {
    return this.taxonomyService.remainderMappings(statementType);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => FinancialRemainderMappingModel)
  upsertFinancialRemainderMapping(@Args('input') input: UpsertFinancialRemainderMappingInput) {
    return this.taxonomyService.upsertRemainderMapping(input);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => Boolean)
  deleteFinancialRemainderMapping(@Args('id') id: string) {
    return this.taxonomyService.deleteRemainderMapping(id);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => FinancialRemainderMappingModel)
  repairFinancialRemainderMapping(@Args('input') input: RepairFinancialRemainderMappingInput) {
    return this.taxonomyService.repairRemainderMapping(input);
  }
}
