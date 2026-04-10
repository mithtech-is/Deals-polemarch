import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@ObjectType()
export class CompanyModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  isin!: string;

  @Field(() => String, { nullable: true })
  cin?: string | null;

  @Field(() => String, { nullable: true })
  sector?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => String, { nullable: true })
  activity?: string | null;

  @Field(() => String, { nullable: true })
  sectorId?: string | null;

  @Field(() => String, { nullable: true })
  industryId?: string | null;

  @Field(() => String, { nullable: true })
  activityId?: string | null;

  @Field()
  listingStatus!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field()
  country!: string;
}

@InputType()
export class CreateCompanyInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsString()
  isin!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sector?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  activity?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sectorId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  activityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  listingStatus?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;
}

@InputType()
export class UpdateCompanyInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  isin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sector?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  activity?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sectorId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  activityId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  listingStatus?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  country?: string;
}
