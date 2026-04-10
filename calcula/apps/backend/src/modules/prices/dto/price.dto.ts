import { Field, Float, InputType, ObjectType } from '@nestjs/graphql';
import { IsIn, IsISO8601, IsNumber, IsOptional, IsString } from 'class-validator';

/** Allowed category tags. Shared by CompanyPriceHistory (chart markers)
 *  and NewsEvent (storefront timeline). Single-letter codes:
 *    C = Corporate action  — directly affects shares/shareholders:
 *        dividend, split, bonus, buyback, AGM, voting, DRHP filing,
 *        rights issue, OFS, preferential allotment, IPO withdrawal.
 *    E = business Event    — affects company value but not the shares
 *        directly: M&A, funding rounds, product launches, management
 *        changes, reorganisations.
 *    N = News              — media coverage, analyst commentary,
 *        valuation markdowns/markups, rumours.
 *    R = Regulatory        — SEBI/RBI notices + filings that don't fall
 *        under shareholder-facing corporate actions above.
 *
 *  Keep in sync with:
 *   - `snapshots.service.ts` (PriceSnapshot.events[].category)
 *   - `storefront/src/lib/snapshot.ts#PriceEventCategory`
 *   - `calcula/apps/frontend/types/domain.ts#PriceEventCategory`
 */
export const PRICE_EVENT_CATEGORIES = ['C', 'E', 'N', 'R'] as const;
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
