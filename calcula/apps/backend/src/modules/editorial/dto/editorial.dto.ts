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
