import { Module } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { TaxonomyResolver } from './taxonomy.resolver';

@Module({
  providers: [TaxonomyService, TaxonomyResolver],
  exports: [TaxonomyService]
})
export class TaxonomyModule {}
