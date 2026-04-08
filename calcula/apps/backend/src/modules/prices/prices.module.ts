import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { SnapshotsModule } from '../snapshots/snapshots.module';
import { PricesController } from './prices.controller';
import { PricesResolver } from './prices.resolver';
import { PricesService } from './prices.service';

@Module({
  imports: [CompaniesModule, SnapshotsModule],
  providers: [PricesService, PricesResolver],
  controllers: [PricesController],
  exports: [PricesService]
})
export class PricesModule {}
