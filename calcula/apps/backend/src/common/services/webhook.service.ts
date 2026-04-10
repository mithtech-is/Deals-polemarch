import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Notifies Medusa that a company's data has changed. The payload is a tiny
 * version envelope — no statements, no ratios, no trends. Medusa decides
 * whether to pull the full snapshots by comparing these version numbers
 * with its local cache.
 *
 * Medusa's own reconciliation cron covers the case where this push fails or
 * was never fired in the first place (see `/api/companies/versions-since`).
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncToMedusa(companyId: string): Promise<void> {
    const webhookUrl = process.env.MEDUSA_WEBHOOK_URL;
    // IMPORTANT: this is a SINGLE shared secret used in both directions
    // (Calcula↔Medusa). Medusa's /webhooks/calcula route verifies against
    // process.env.CALCULA_WEBHOOK_SECRET, so we must send the same env var
    // here. Historically this read MEDUSA_WEBHOOK_SECRET, which was a
    // different name — every real-time webhook got rejected with 401 and
    // the only thing holding sync together was the drift cron.
    // MEDUSA_WEBHOOK_SECRET is still accepted as a fallback to avoid
    // breaking deployments that set it by its old name.
    const webhookSecret =
      process.env.CALCULA_WEBHOOK_SECRET || process.env.MEDUSA_WEBHOOK_SECRET;

    if (!webhookUrl) {
      // WARN (not DEBUG) so operators notice that real-time sync is off —
      // the drift cron still works but there's a 60s delay on every edit.
      this.logger.warn(
        'MEDUSA_WEBHOOK_URL not set — real-time sync to Medusa is DISABLED. ' +
          'Changes will only reach Medusa via its drift cron (~60s).'
      );
      return;
    }

    if (!webhookSecret) {
      this.logger.warn(
        'CALCULA_WEBHOOK_SECRET not set — Medusa will reject this webhook with 401.'
      );
    }

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          isin: true,
          name: true,
          statementsVersion: true,
          priceVersion: true,
          newsVersion: true,
          editorialVersion: true,
          profileVersion: true,
          contentUpdatedAt: true
        }
      });
      if (!company) {
        this.logger.warn(`Company ${companyId} not found, skipping webhook`);
        return;
      }

      const payload = {
        isin: company.isin,
        company_id: company.id,
        company_name: company.name,
        statements_version: company.statementsVersion,
        price_version: company.priceVersion,
        news_version: company.newsVersion,
        editorial_version: company.editorialVersion,
        profile_version: company.profileVersion,
        content_updated_at: company.contentUpdatedAt.toISOString()
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'X-Webhook-Secret': webhookSecret } : {})
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(`Medusa webhook returned ${response.status}: ${await response.text()}`);
      } else {
        this.logger.log(
          `Notified Medusa of ${company.isin} ` +
            `(v_s=${company.statementsVersion} v_p=${company.priceVersion} ` +
            `v_n=${company.newsVersion} v_e=${company.editorialVersion})`
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to sync company ${companyId} to Medusa: ${error.message}`);
    }
  }
}
