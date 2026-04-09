import { Field, ID, Int, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsDateString, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PRICE_EVENT_CATEGORIES } from '../../prices/dto/price.dto';

@ObjectType()
export class NewsEventModel {
  @Field(() => ID)
  id!: string;

  @Field()
  companyId!: string;

  @Field()
  occurredAt!: string;

  @Field()
  category!: string;

  @Field()
  title!: string;

  @Field()
  body!: string;

  @Field(() => String, { nullable: true })
  sourceUrl?: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@InputType()
export class UpsertNewsEventInput {
  /** If set, updates an existing row. If null/omitted, creates a new one. */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  id?: string;

  @Field()
  @IsString()
  companyId!: string;

  @Field()
  @IsDateString()
  occurredAt!: string;

  @Field()
  @IsIn(PRICE_EVENT_CATEGORIES as unknown as string[])
  category!: string;

  @Field()
  @IsString()
  title!: string;

  @Field()
  @IsString()
  body!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sourceUrl?: string;
}

@InputType()
export class UpsertNewsEventBulkInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field(() => [UpsertNewsEventInput])
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpsertNewsEventInput)
  rows!: UpsertNewsEventInput[];
}

@ObjectType()
export class PushEventResult {
  @Field(() => ID)
  priceHistoryId!: string;

  @Field()
  datetime!: string;

  @Field()
  matchedExact!: boolean;
}

@ObjectType()
export class PushEventSkip {
  @Field(() => ID)
  eventId!: string;

  @Field()
  reason!: string;
}

@ObjectType()
export class PushEventBulkResult {
  @Field(() => Int)
  pushed!: number;

  @Field(() => [PushEventSkip])
  skipped!: PushEventSkip[];
}
