import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsInt, IsOptional, Max, Min, IsUUID } from 'class-validator';

@ObjectType()
export class FinancialPeriodModel {
  @Field()
  id!: string;

  @Field()
  companyId!: string;

  @Field(() => Int)
  fiscalYear!: number;

  @Field(() => Int, { nullable: true })
  fiscalQuarter?: number | null;

  @Field()
  periodStart!: Date;

  @Field()
  periodEnd!: Date;

  @Field()
  isAudited!: boolean;
}

@InputType()
export class UpsertPeriodInput {
  @Field()
  @IsUUID()
  companyId!: string;

  @Field(() => Int)
  @IsInt()
  fiscalYear!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  fiscalQuarter?: number;

  @Field()
  @IsDateString()
  periodStart!: string;

  @Field()
  @IsDateString()
  periodEnd!: string;

  @Field()
  @IsBoolean()
  isAudited!: boolean;
}
