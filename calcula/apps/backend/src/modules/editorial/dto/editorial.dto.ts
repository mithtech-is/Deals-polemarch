import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ObjectType()
export class CompanyOverviewModel {
  @Field()
  companyId!: string;

  @Field()
  summary!: string;

  @Field(() => String, { nullable: true })
  businessModel?: string | null;

  @Field(() => String, { nullable: true })
  competitiveMoat?: string | null;

  @Field(() => String, { nullable: true })
  risks?: string | null;

  @Field(() => String, { nullable: true })
  financialInsights?: string | null;

  @Field(() => String, { nullable: true })
  industryAnalysis?: string | null;

  @Field(() => String, { nullable: true })
  sectorAnalysis?: string | null;

  @Field(() => String, { nullable: true })
  activityAnalysis?: string | null;

  @Field()
  updatedAt!: string;
}

@ObjectType()
export class ProsConsModel {
  @Field()
  companyId!: string;

  @Field()
  pros!: string;

  @Field()
  cons!: string;

  @Field()
  updatedAt!: string;
}

@InputType()
export class UpsertCompanyOverviewInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field()
  @IsString()
  summary!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  businessModel?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  competitiveMoat?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  risks?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  financialInsights?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industryAnalysis?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sectorAnalysis?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  activityAnalysis?: string;
}

@InputType()
export class UpsertProsConsInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field()
  @IsString()
  pros!: string;

  @Field()
  @IsString()
  cons!: string;
}

@ObjectType()
export class FaqItemModel {
  @Field()
  question!: string;

  @Field()
  answer!: string;
}

@ObjectType()
export class CompanyFaqModel {
  @Field()
  companyId!: string;

  @Field(() => [FaqItemModel])
  items!: FaqItemModel[];

  @Field()
  updatedAt!: string;
}

@InputType()
export class FaqItemInput {
  @Field()
  @IsString()
  question!: string;

  @Field()
  @IsString()
  answer!: string;
}

@InputType()
export class UpsertCompanyFaqInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field(() => [FaqItemInput])
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => FaqItemInput)
  items!: FaqItemInput[];
}

// ── Key Management Team ───────────────────────────────────────────

@ObjectType()
export class TeamMemberModel {
  @Field()
  name!: string;

  @Field()
  role!: string;

  @Field(() => String, { nullable: true })
  since?: string | null;

  @Field(() => String, { nullable: true })
  bio?: string | null;

  @Field(() => String, { nullable: true })
  linkedinUrl?: string | null;

  @Field(() => String, { nullable: true })
  photoUrl?: string | null;
}

@ObjectType()
export class CompanyTeamModel {
  @Field()
  companyId!: string;

  @Field(() => [TeamMemberModel])
  members!: TeamMemberModel[];

  @Field()
  updatedAt!: string;
}

@InputType()
export class TeamMemberInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsString()
  role!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  since?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}

@InputType()
export class UpsertCompanyTeamInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field(() => [TeamMemberInput])
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberInput)
  members!: TeamMemberInput[];
}

// ── Major Shareholders ────────────────────────────────────────────

@ObjectType()
export class ShareholderModel {
  @Field()
  name!: string;

  @Field()
  type!: string; // e.g. "Founder", "Institutional", "Employee Trust", "Public"

  @Field(() => String, { nullable: true })
  stakePercent?: string | null; // stored as string to preserve "~12.5%" etc.

  @Field(() => String, { nullable: true })
  since?: string | null;

  @Field(() => String, { nullable: true })
  note?: string | null;
}

@ObjectType()
export class CompanyShareholdersModel {
  @Field()
  companyId!: string;

  @Field(() => [ShareholderModel])
  entries!: ShareholderModel[];

  @Field()
  updatedAt!: string;
}

@InputType()
export class ShareholderInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsString()
  type!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  stakePercent?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  since?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class UpsertCompanyShareholdersInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field(() => [ShareholderInput])
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ShareholderInput)
  entries!: ShareholderInput[];
}

// ── Competitors ───────────────────────────────────────────────────

@ObjectType()
export class CompetitorModel {
  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  isin?: string | null;

  @Field(() => String, { nullable: true })
  link?: string | null;

  @Field(() => String, { nullable: true })
  theirEdge?: string | null;

  @Field(() => String, { nullable: true })
  ourEdge?: string | null;

  @Field(() => String, { nullable: true })
  note?: string | null;
}

@ObjectType()
export class CompanyCompetitorsModel {
  @Field()
  companyId!: string;

  @Field(() => [CompetitorModel])
  entries!: CompetitorModel[];

  @Field()
  updatedAt!: string;
}

@InputType()
export class CompetitorInput {
  @Field()
  @IsString()
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  isin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  link?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  theirEdge?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ourEdge?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}

@InputType()
export class UpsertCompanyCompetitorsInput {
  @Field()
  @IsString()
  companyId!: string;

  @Field(() => [CompetitorInput])
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CompetitorInput)
  entries!: CompetitorInput[];
}
