import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesResolver } from './companies.resolver';
import { CompaniesController } from './companies.controller';
import { WebhookService } from '../../common/services/webhook.service';

@Module({
  providers: [CompaniesService, CompaniesResolver, WebhookService],
  controllers: [CompaniesController],
  exports: [CompaniesService, WebhookService]
})
export class CompaniesModule {}
