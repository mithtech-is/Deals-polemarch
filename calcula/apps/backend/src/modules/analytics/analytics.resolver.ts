import { Args, Query, Resolver } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';
import { CompanyOverview, MetricPoint, TrendPoint } from './dto/analytics.dto';

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Query(() => CompanyOverview)
  companyOverview(
    @Args('companyId') companyId: string,
    @Args('periodId', { nullable: true }) periodId?: string
  ) {
    return this.analyticsService.companyOverview(companyId, periodId);
  }

  @Query(() => [MetricPoint])
  companyRatios(
    @Args('companyId') companyId: string,
    @Args('periodId', { nullable: true }) periodId?: string
  ) {
    return this.analyticsService.companyRatios(companyId, periodId);
  }

  @Query(() => [TrendPoint])
  companyTrends(@Args('companyId') companyId: string) {
    return this.analyticsService.companyTrends(companyId);
  }
}
