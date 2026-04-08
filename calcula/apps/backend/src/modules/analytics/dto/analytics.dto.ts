import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MetricPoint {
  @Field()
  code!: string;

  @Field(() => Float, { nullable: true })
  value?: number | null;
}

@ObjectType()
export class TrendPoint {
  @Field()
  periodLabel!: string;

  @Field(() => Float, { nullable: true })
  revenue?: number | null;

  @Field(() => Float, { nullable: true })
  netProfit?: number | null;

  @Field(() => Float, { nullable: true })
  networth?: number | null;
}

@ObjectType()
export class CompanyOverview {
  @Field()
  companyId!: string;

  @Field(() => String, { nullable: true })
  periodId?: string | null;

  @Field(() => [MetricPoint])
  cards!: MetricPoint[];
}
