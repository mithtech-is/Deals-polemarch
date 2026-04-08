import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { StatementType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';

@ObjectType()
export class FinancialLineItemModel {
  @Field()
  id!: string;

  @Field()
  code!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  parentId?: string | null;

  @Field(() => String)
  statementType!: StatementType;

  @Field(() => Int)
  displayOrder!: number;

  @Field()
  orderCode!: string;

  @Field()
  isRequired!: boolean;

  @Field()
  isCalculated!: boolean;

  @Field(() => String, { nullable: true })
  formula?: string | null;

  @Field(() => [FinancialLineItemModel], { nullable: true })
  children?: FinancialLineItemModel[];
}

@InputType()
export class UpsertFinancialLineItemInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  code!: string;

  @Field()
  @IsString()
  name!: string;

  @Field(() => String)
  @IsEnum(StatementType)
  statementType!: StatementType;

  @Field(() => Int)
  @IsInt()
  displayOrder!: number;

  @Field()
  @IsString()
  @Matches(/^\d{2}(\d{2})*$/, { message: 'orderCode must be groups of 2 digits (e.g. 01, 0101, 010101)' })
  orderCode!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field()
  @IsBoolean()
  isRequired!: boolean;

  @Field()
  @IsBoolean()
  isCalculated!: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  formula?: string;
}

@ObjectType()
export class FinancialRemainderMappingModel {
  @Field()
  id!: string;

  @Field()
  parentLineItemId!: string;

  @Field()
  parentCode!: string;

  @Field()
  parentName!: string;

  @Field()
  remainderLineItemId!: string;

  @Field()
  remainderCode!: string;

  @Field()
  remainderName!: string;

  @Field()
  isValid!: boolean;

  @Field(() => String, { nullable: true })
  validationMessage?: string | null;
}

@InputType()
export class UpsertFinancialRemainderMappingInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  parentLineItemId!: string;

  @Field()
  @IsString()
  remainderLineItemId!: string;
}

@InputType()
export class RepairFinancialRemainderMappingInput {
  @Field()
  @IsString()
  parentLineItemId!: string;
}
