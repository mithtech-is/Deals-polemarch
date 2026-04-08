import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompaniesService } from './companies.service';
import { CompanyModel, CreateCompanyInput, UpdateCompanyInput } from './dto/company.dto';

@Resolver(() => CompanyModel)
export class CompaniesResolver {
  constructor(private readonly companiesService: CompaniesService) {}

  @Query(() => [CompanyModel])
  companies(@Args('q', { nullable: true }) q?: string) {
    return this.companiesService.list(q);
  }

  @Query(() => CompanyModel)
  company(@Args('id') id: string) {
    return this.companiesService.one(id);
  }

  @Query(() => CompanyModel)
  companyByIsin(@Args('isin') isin: string) {
    return this.companiesService.byIsin(isin);
  }

  @Mutation(() => CompanyModel)
  @Roles(PlatformRole.ADMIN)
  createCompany(@Args('input') input: CreateCompanyInput) {
    return this.companiesService.create(input);
  }

  @Mutation(() => CompanyModel)
  @Roles(PlatformRole.ADMIN)
  updateCompany(@Args('id') id: string, @Args('input') input: UpdateCompanyInput) {
    return this.companiesService.update(id, input);
  }

  @Mutation(() => Boolean)
  @Roles(PlatformRole.ADMIN)
  async deleteCompany(@Args('id') id: string) {
    await this.companiesService.delete(id);
    return true;
  }
}
