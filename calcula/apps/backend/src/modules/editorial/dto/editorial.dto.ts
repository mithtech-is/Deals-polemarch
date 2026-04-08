import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

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
