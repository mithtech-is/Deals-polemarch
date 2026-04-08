import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

/** Allowed price-event category tags. Keep in sync with:
 *  - `snapshots.service.ts` (PriceSnapshot.events[].category)
 *  - `storefront/src/lib/snapshot.ts#PriceEventCategory`
 *  - `calcula/apps/frontend/types/domain.ts#CompanyPricePoint`
 */
export const PRICE_EVENT_CATEGORIES = ['C', 'N', 'R'] as const;
export type PriceEventCategory = (typeof PRICE_EVENT_CATEGORIES)[number];

@ObjectType()
export class CompanyPriceModel {
  @Field()
  id!: string;

  @Field()
  companyId!: string;

  @Field()
  datetime!: string;

  @Field(() => Float)
  price!: number;

  @Field(() => String, { nullable: true })
  note?: string | null;

  @Field(() => String, { nullable: true })
  link?: string | null;

  @Field(() => String, { nullable: true })
  category?: string | null;
}

@InputType()
export class UpsertCompanyPriceInput {
  @Field()
  @IsISO8601()
  datetime!: string;

  @Field(() => Float)
  @IsNumber()
  price!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  link?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(PRICE_EVENT_CATEGORIES as unknown as string[])
  category?: string;
}
