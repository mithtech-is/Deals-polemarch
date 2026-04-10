import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString } from 'class-validator';

@ObjectType()
export class SiteSettingsModel {
  @Field() defaultCurrency!: string;
  /** "auto" | "units" | "thousands" | "lakhs" | "crores" | "millions" | "billions" */
  @Field() defaultScale!: string;
}

@InputType()
export class UpdateSiteSettingsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['auto', 'units', 'thousands', 'lakhs', 'crores', 'millions', 'billions'])
  defaultScale?: string;
}
