import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthToken, LoginInput, Me } from './dto/login.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Mutation(() => AuthToken)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input.username, input.password);
  }

  @Query(() => Me)
  async me(@Context() ctx: { req: { user?: { sub?: string; username?: string; role?: string } } }) {
    const user = await this.authService.me(ctx.req.user?.sub ?? '');
    return {
      id: user?.id ?? ctx.req.user?.sub,
      username: user?.username ?? ctx.req.user?.username,
      role: user?.role ?? ctx.req.user?.role
    };
  }
}
