import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.platformUser.findUnique({ where: { username } });
    if (!user || user.passwordHash !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'change-me',
      expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400)
    });

    return { accessToken, role: user.role, username: user.username };
  }

  async me(userId: string) {
    return this.prisma.platformUser.findUnique({ where: { id: userId } });
  }
}
