import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsString, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  username!: string;

  @Field()
  @IsString()
  @MinLength(3)
  password!: string;
}

@ObjectType()
export class AuthToken {
  @Field()
  accessToken!: string;

  @Field()
  role!: string;

  @Field()
  username!: string;
}

@ObjectType()
export class Me {
  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  role?: string;
}
