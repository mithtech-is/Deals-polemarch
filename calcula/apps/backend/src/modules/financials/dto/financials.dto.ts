import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { MetricValueSource } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ObjectType()
export class FinancialValueModel {
  @Field()
  id!: string;

  @Field()
  companyId!: string;

  @Field()
  periodId!: string;

  @Field()
  lineItemId!: string;

  @Field()
  lineItemCode!: string;

  @Field()
  lineItemName!: string;

  @Field()
  orderCode!: string;

  @Field()
  value!: number;

  @Field(() => String, { nullable: true })
  currency?: string | null;

  @Field(() => String)
  valueSource!: MetricValueSource;
}

@InputType()
export class UpsertFinancialValueInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field()
  @IsString()
  periodId!: string;

  @Field()
  @IsString()
  lineItemId!: string;

  @Field()
  @IsNumber()
  value!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Length(3, 3)
  currency?: string;

  @Field(() => String)
  @IsEnum(MetricValueSource)
  valueSource!: MetricValueSource;
}

@InputType()
export class UpsertFinancialValuesBatchInput {
  @Field(() => [UpsertFinancialValueInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFinancialValueInput)
  items!: UpsertFinancialValueInput[];
}
