import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guards an endpoint behind a shared `X-Webhook-Secret` header.
 * Used for machine-to-machine calls from Medusa → Calcula.
 * Secret is read from env CALCULA_WEBHOOK_SECRET; if unset, the guard rejects.
 */
@Injectable()
export class WebhookSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.CALCULA_WEBHOOK_SECRET;
    if (!expected) {
      throw new UnauthorizedException('Webhook secret not configured on server');
    }
    const req = context.switchToHttp().getRequest<Request>();
    const provided = (req.headers['x-webhook-secret'] as string | undefined) ?? '';
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid webhook secret');
    }
    return true;
  }
}
