import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString } from 'class-validator';

// ── CompanyDetails ─────────────────────────────────────────────

@ObjectType()
export class CompanyDetailsModel {
  @Field() companyId!: string;

  @Field(() => String, { nullable: true }) logoUrl?: string | null;
  @Field(() => String, { nullable: true }) website?: string | null;
  @Field(() => String, { nullable: true }) linkedinUrl?: string | null;
  @Field(() => String, { nullable: true }) twitterUrl?: string | null;
  @Field(() => String, { nullable: true }) crunchbaseUrl?: string | null;

  @Field(() => String, { nullable: true }) founded?: string | null;
  @Field(() => String, { nullable: true }) incorporationCountry?: string | null;
  @Field(() => String, { nullable: true }) legalEntityType?: string | null;
  @Field(() => String, { nullable: true }) registeredOffice?: string | null;
  @Field(() => String, { nullable: true }) headquarters?: string | null;
  @Field(() => String, { nullable: true }) auditor?: string | null;
  @Field(() => String, { nullable: true }) panNumber?: string | null;
  @Field(() => String, { nullable: true }) rta?: string | null;
  @Field(() => String, { nullable: true }) depository?: string | null;
  @Field(() => Int, { nullable: true }) employeeCount?: number | null;
  @Field(() => Int, { nullable: true }) subsidiariesCount?: number | null;
  @Field(() => String, { nullable: true }) fiscalYearEnd?: string | null;

  @Field(() => String, { nullable: true }) shareType?: string | null;
  @Field(() => String, { nullable: true }) faceValue?: string | null;
  @Field(() => String, { nullable: true }) totalShares?: string | null;
  @Field(() => Int, { nullable: true }) lotSize?: number | null;
  @Field(() => String, { nullable: true }) availabilityPercent?: string | null;

  @Field(() => String, { nullable: true }) fiftyTwoWeekHigh?: string | null;
  @Field(() => String, { nullable: true }) fiftyTwoWeekLow?: string | null;

  @Field(() => String, { nullable: true }) lastRoundType?: string | null;
  @Field(() => String, { nullable: true }) lastRoundDate?: string | null;
  @Field(() => String, { nullable: true }) lastRoundRaised?: string | null;
  @Field(() => String, { nullable: true }) lastRoundLead?: string | null;
  @Field(() => String, { nullable: true }) lastRoundValuation?: string | null;

  @Field() updatedAt!: string;
}

@InputType()
export class UpsertCompanyDetailsInput {
  @Field() @IsString() companyId!: string;

  @Field({ nullable: true }) @IsOptional() @IsString() logoUrl?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() website?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() linkedinUrl?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() twitterUrl?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() crunchbaseUrl?: string;

  @Field({ nullable: true }) @IsOptional() @IsString() founded?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() incorporationCountry?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() legalEntityType?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() registeredOffice?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() headquarters?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() auditor?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() panNumber?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() rta?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() depository?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() employeeCount?: number;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() subsidiariesCount?: number;
  @Field({ nullable: true }) @IsOptional() @IsString() fiscalYearEnd?: string;

  @Field({ nullable: true }) @IsOptional() @IsString() shareType?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() faceValue?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() totalShares?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsNumber() lotSize?: number;
  @Field({ nullable: true }) @IsOptional() @IsString() availabilityPercent?: string;

  @Field({ nullable: true }) @IsOptional() @IsString() fiftyTwoWeekHigh?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() fiftyTwoWeekLow?: string;

  @Field({ nullable: true }) @IsOptional() @IsString() lastRoundType?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() lastRoundDate?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() lastRoundRaised?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() lastRoundLead?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() lastRoundValuation?: string;
}

// ── CompanyValuations ──────────────────────────────────────────

@ObjectType()
export class CompanyValuationsModel {
  @Field() companyId!: string;
  @Field() baseCurrency!: string;
  @Field(() => String, { nullable: true }) asOfDate?: string | null;
  @Field(() => String, { nullable: true }) summary?: string | null;
  /** JSON-serialized array of ValuationModelEntry. Parsed by the client. */
  @Field() modelsJson!: string;
  @Field() updatedAt!: string;
}

@InputType()
export class UpsertCompanyValuationsInput {
  @Field() @IsString() companyId!: string;
  @Field() @IsString() baseCurrency!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() asOfDate?: string;
  @Field({ nullable: true }) @IsOptional() @IsString() summary?: string;
  /** JSON-serialized array of ValuationModelEntry. */
  @Field() @IsString() modelsJson!: string;
}
