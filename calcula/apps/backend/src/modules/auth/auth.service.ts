import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(username: string, password: string) {
    if (!password || password.length > 128) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.platformUser.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'change-me') {
      throw new Error('JWT_SECRET must be configured with a secure value');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400)
    });

    return { accessToken, role: user.role, username: user.username };
  }

  async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  }

  async me(userId: string) {
    return this.prisma.platformUser.findUnique({ where: { id: userId } });
  }
}
