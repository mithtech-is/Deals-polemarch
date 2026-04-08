import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PricesService } from './prices.service';
import { CompanyPriceModel, UpsertCompanyPriceInput } from './dto/price.dto';

@Resolver(() => CompanyPriceModel)
export class PricesResolver {
  constructor(private readonly pricesService: PricesService) {}

  @Query(() => [CompanyPriceModel])
  companyPriceHistory(@Args('companyId') companyId: string) {
    return this.pricesService.history(companyId);
  }

  @Mutation(() => CompanyPriceModel)
  @Roles(PlatformRole.ADMIN)
  upsertCompanyPrice(
    @Args('companyId') companyId: string,
    @Args('input') input: UpsertCompanyPriceInput
  ) {
    return this.pricesService.upsertOne(companyId, input);
  }

  @Mutation(() => [CompanyPriceModel])
  @Roles(PlatformRole.ADMIN)
  upsertCompanyPriceBulk(
    @Args('companyId') companyId: string,
    @Args({ name: 'entries', type: () => [UpsertCompanyPriceInput] }) entries: UpsertCompanyPriceInput[]
  ) {
    return this.pricesService.upsertBulk(companyId, entries);
  }

  @Mutation(() => Boolean)
  @Roles(PlatformRole.ADMIN)
  deleteCompanyPrice(@Args('id') id: string) {
    return this.pricesService.deleteOne(id);
  }

  /**
   * Delete many price rows at once. Returns the number actually deleted
   * (may be less than `ids.length` if any id was invalid or referenced a
   * row from another company).
   */
  @Mutation(() => Number)
  @Roles(PlatformRole.ADMIN)
  async deleteCompanyPriceBulk(
    @Args('companyId') companyId: string,
    @Args({ name: 'ids', type: () => [String] }) ids: string[]
  ) {
    const { deleted } = await this.pricesService.deleteBulk(companyId, ids);
    return deleted;
  }
}
