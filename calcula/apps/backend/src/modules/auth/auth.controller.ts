import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginInput) {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  async me(@Req() req: { user?: { sub?: string; username?: string; role?: string } }) {
    const user = await this.authService.me(req.user?.sub ?? '');
    return {
      id: user?.id ?? req.user?.sub,
      username: user?.username ?? req.user?.username,
      role: user?.role ?? req.user?.role
    };
  }
}
