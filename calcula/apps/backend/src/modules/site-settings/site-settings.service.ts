import { Injectable } from '@nestjs/common';
import { ScaleUnit } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotsService } from '../snapshots/snapshots.service';

/**
 * Supported site-wide scale settings. "auto" means the snapshot builder
 * picks the best readable scale per statement (legacy behaviour). Any
 * concrete ScaleUnit forces every statement to that scale site-wide.
 */
export type SiteDisplayScale = 'auto' | ScaleUnit;

export type SiteSettingsPayload = {
  defaultCurrency: string;
  defaultScale: SiteDisplayScale;
};

const KEY_CURRENCY = 'default_currency';
const KEY_SCALE = 'default_scale';

const DEFAULTS: SiteSettingsPayload = {
  defaultCurrency: 'INR',
  defaultScale: 'auto'
};

function isScaleUnit(v: string): v is ScaleUnit {
  return v === 'units' || v === 'thousands' || v === 'lakhs' || v === 'crores' || v === 'millions' || v === 'billions';
}

function parseScale(v: string | null | undefined): SiteDisplayScale {
  if (!v) return 'auto';
  if (v === 'auto') return 'auto';
  if (isScaleUnit(v)) return v;
  return 'auto';
}

/**
 * Reads/writes site-wide settings stored in the `site_settings` key-value
 * table. The snapshots module consults these values when building each
 * company's snapshot so changes ripple out to Medusa on the next write.
 *
 * `get()` is cached in-process for 5 seconds so that hot paths (the
 * snapshot builder, read by every snapshot request) don't hit the DB on
 * every call.
 */
@Injectable()
export class SiteSettingsService {
  private cached: { expiresAt: number; payload: SiteSettingsPayload } | null = null;
  private static readonly TTL_MS = 5000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotsService: SnapshotsService
  ) {}

  async get(): Promise<SiteSettingsPayload> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.payload;
    }
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [KEY_CURRENCY, KEY_SCALE] } }
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const payload: SiteSettingsPayload = {
      defaultCurrency: (map.get(KEY_CURRENCY) || DEFAULTS.defaultCurrency).toUpperCase(),
      defaultScale: parseScale(map.get(KEY_SCALE))
    };
    this.cached = { expiresAt: Date.now() + SiteSettingsService.TTL_MS, payload };
    return payload;
  }

  /** Synchronous snapshot read — used by hot paths that already cached the row. */
  getCached(): SiteSettingsPayload | null {
    return this.cached && this.cached.expiresAt > Date.now() ? this.cached.payload : null;
  }

  async update(next: Partial<SiteSettingsPayload>): Promise<SiteSettingsPayload> {
    const updates: Array<Promise<unknown>> = [];
    if (typeof next.defaultCurrency === 'string' && next.defaultCurrency.trim()) {
      const code = next.defaultCurrency.trim().toUpperCase();
      updates.push(
        this.prisma.siteSetting.upsert({
          where: { key: KEY_CURRENCY },
          update: { value: code },
          create: { key: KEY_CURRENCY, value: code }
        })
      );
    }
    if (typeof next.defaultScale === 'string') {
      const scale = next.defaultScale;
      if (scale === 'auto' || isScaleUnit(scale)) {
        updates.push(
          this.prisma.siteSetting.upsert({
            where: { key: KEY_SCALE },
            update: { value: scale },
            create: { key: KEY_SCALE, value: scale }
          })
        );
      }
    }
    await Promise.all(updates);
    this.cached = null;
    // Invalidate every cached snapshot so downstream rebuilds pick up the
    // new default currency / scale on next read. Bumping each company's
    // statementsVersion would also force Medusa to refetch; we keep that
    // optional for now — the drift cron on Medusa will catch up.
    this.snapshotsService.invalidateAll();
    return this.get();
  }
}
