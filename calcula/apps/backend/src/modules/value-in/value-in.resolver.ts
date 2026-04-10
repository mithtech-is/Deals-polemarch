import { UseGuards } from '@nestjs/common';
import { Args, Field, InputType, Mutation, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole, ScaleUnit, StatementType } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ValueInService } from './value-in.service';

@ObjectType()
class OkModel {
  @Field() ok!: boolean;
}

@ObjectType()
class ResolvedValueInModel {
  @Field() periodId!: string;
  @Field() statementType!: string;
  @Field() currency!: string;
  @Field() scale!: string;
  @Field() source!: string;
  @Field() missing!: boolean;
}

@ObjectType()
class CurrencyRateModel {
  @Field() id!: string;
  @Field() fromCcy!: string;
  @Field() toCcy!: string;
  @Field() rate!: number;
  @Field() asOf!: string;
  @Field(() => String, { nullable: true }) source!: string | null;
}

@InputType()
class UpsertCurrencyRateInput {
  @Field() fromCcy!: string;
  @Field() toCcy!: string;
  @Field() rate!: number;
  @Field() asOf!: string;
  @Field(() => String, { nullable: true }) source?: string | null;
}

@Resolver()
export class ValueInResolver {
  constructor(private readonly svc: ValueInService) {}

  // ── Queries ─────────────────────────────────────────────────
  @Query(() => [ResolvedValueInModel])
  async periodsValueIn(
    @Args({ name: 'periodIds', type: () => [String] }) periodIds: string[],
    @Args('statementType', { type: () => String }) statementType: StatementType,
  ) {
    const out: Array<{ periodId: string; statementType: string; currency: string; scale: string; source: string; missing: boolean }> = [];
    for (const periodId of periodIds) {
      try {
        const r = await this.svc.resolveForPeriod(periodId, statementType);
        out.push({ periodId, statementType, currency: r.currency, scale: r.scale, source: r.source, missing: r.missing });
      } catch {
        /* skip missing */
      }
    }
    return out;
  }

  @Query(() => [CurrencyRateModel])
  async currencyRates() {
    const rows = await this.svc.listCurrencyRates();
    return rows.map((r) => ({
      id: r.id,
      fromCcy: r.fromCcy,
      toCcy: r.toCcy,
      rate: Number(r.rate),
      asOf: r.asOf.toISOString(),
      source: r.source,
    }));
  }

  // ── Mutations ───────────────────────────────────────────────
  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => OkModel)
  setCompanyValueInDefaults(
    @Args('companyId') companyId: string,
    @Args('currency') currency: string,
    @Args('scale', { type: () => String }) scale: ScaleUnit,
  ) {
    return this.svc.setCompanyDefaults(companyId, currency, scale);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => OkModel)
  setPeriodValueIn(
    @Args('periodId') periodId: string,
    @Args('currency', { type: () => String, nullable: true }) currency: string | null,
    @Args('scale', { type: () => String, nullable: true }) scale: ScaleUnit | null,
  ) {
    return this.svc.setPeriodValueIn(periodId, currency, scale);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => OkModel)
  setStatementValueIn(
    @Args('periodId') periodId: string,
    @Args('statementType', { type: () => String }) statementType: StatementType,
    @Args('currency', { type: () => String, nullable: true }) currency: string | null,
    @Args('scale', { type: () => String, nullable: true }) scale: ScaleUnit | null,
  ) {
    return this.svc.setStatementValueIn(periodId, statementType, currency, scale);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => CurrencyRateModel)
  async upsertCurrencyRate(@Args('input') input: UpsertCurrencyRateInput) {
    const r = await this.svc.upsertCurrencyRate(input);
    return {
      id: r.id,
      fromCcy: r.fromCcy,
      toCcy: r.toCcy,
      rate: Number(r.rate),
      asOf: r.asOf.toISOString(),
      source: r.source,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => OkModel)
  async deleteCurrencyRate(@Args('id') id: string) {
    await this.svc.deleteCurrencyRate(id);
    return { ok: true };
  }
}
