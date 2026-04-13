import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as crypto from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    const request = this.getRequest(context) as any;

    // Allow server-to-server calls authenticated via X-Webhook-Secret
    // (e.g. Medusa creating a Calcula company after product creation).
    const webhookSecret = request.headers?.['x-webhook-secret'] as string | undefined;
    const expectedSecret = process.env.CALCULA_WEBHOOK_SECRET;
    if (
      webhookSecret &&
      expectedSecret &&
      webhookSecret.length === expectedSecret.length &&
      crypto.timingSafeEqual(Buffer.from(webhookSecret), Buffer.from(expectedSecret))
    ) {
      request.user = { sub: 'webhook', username: 'webhook', role: 'WEBHOOK' };
      return true;
    }

    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret === 'change-me') {
      throw new UnauthorizedException('Server configuration error');
    }
    try {
      const payload = this.jwtService.verify(token, { secret: jwtSecret });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private getRequest(context: ExecutionContext): Record<string, any> {
    if (context.getType<string>() === 'http') {
      return context.switchToHttp().getRequest();
    }
    const gqlContext = GqlExecutionContext.create(context);
    return gqlContext.getContext().req;
  }
}
