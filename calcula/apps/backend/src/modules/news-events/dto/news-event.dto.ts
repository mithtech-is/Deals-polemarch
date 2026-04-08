import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
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
