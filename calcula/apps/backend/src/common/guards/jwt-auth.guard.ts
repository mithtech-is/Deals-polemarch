import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

    const request = this.getRequest(context);

    // Allow server-to-server calls authenticated via X-Webhook-Secret
    // (e.g. Medusa creating a Calcula company after product creation).
    const webhookSecret = request.headers?.['x-webhook-secret'] as string | undefined;
    const expectedSecret = process.env.CALCULA_WEBHOOK_SECRET;
    if (webhookSecret && expectedSecret && webhookSecret === expectedSecret) {
      request.user = { sub: 'webhook', username: 'webhook', role: 'ADMIN' };
      return true;
    }

    const authHeader = request.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET ?? 'change-me' });
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
