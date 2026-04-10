import { Module } from '@nestjs/common';
import { IndustryClassificationController } from './industry-classification.controller';
import { IndustryClassificationService } from './industry-classification.service';

@Module({
  providers: [IndustryClassificationService],
  controllers: [IndustryClassificationController],
  exports: [IndustryClassificationService]
})
export class IndustryClassificationModule {}
