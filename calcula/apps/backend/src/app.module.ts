import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { APP_GUARD } from '@nestjs/core';
import { Request } from 'express';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { PeriodsModule } from './modules/periods/periods.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PricesModule } from './modules/prices/prices.module';
import { SnapshotsModule } from './modules/snapshots/snapshots.module';
import { NewsEventsModule } from './modules/news-events/news-events.module';
import { EditorialModule } from './modules/editorial/editorial.module';
import { ProfileModule } from './modules/profile/profile.module';
import { IndustryClassificationModule } from './modules/industry-classification/industry-classification.module';
import { ValueInModule } from './modules/value-in/value-in.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      context: ({ req }: { req: Request }) => ({ req })
    }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    PeriodsModule,
    TaxonomyModule,
    FinancialsModule,
    AnalyticsModule,
    PricesModule,
    SnapshotsModule,
    NewsEventsModule,
    EditorialModule,
    ProfileModule,
    IndustryClassificationModule,
    ValueInModule,
    SiteSettingsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AppModule {}
