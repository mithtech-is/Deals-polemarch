import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  NewsEventModel,
  PushEventBulkResult,
  PushEventResult,
  UpsertNewsEventBulkInput,
  UpsertNewsEventInput
} from './dto/news-event.dto';
import { NewsEventsService } from './news-events.service';

@Resolver(() => NewsEventModel)
export class NewsEventsResolver {
  constructor(private readonly newsEventsService: NewsEventsService) {}

  @Query(() => [NewsEventModel])
  companyNewsEvents(@Args('companyId') companyId: string) {
    return this.newsEventsService.listByCompany(companyId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => NewsEventModel)
  upsertNewsEvent(@Args('input') input: UpsertNewsEventInput) {
    return this.newsEventsService.upsert(input);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => [NewsEventModel])
  upsertNewsEventBulk(@Args('input') input: UpsertNewsEventBulkInput) {
    return this.newsEventsService.upsertBulk(input.companyId, input.rows);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => Boolean)
  deleteNewsEvent(@Args('id') id: string) {
    return this.newsEventsService.delete(id);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => PushEventResult)
  pushNewsEventToPriceHistory(@Args('eventId', { type: () => ID }) eventId: string) {
    return this.newsEventsService.pushToPriceHistory(eventId);
  }

  @UseGuards(RolesGuard)
  @Roles(PlatformRole.ADMIN)
  @Mutation(() => PushEventBulkResult)
  pushNewsEventsToPriceHistoryBulk(
    @Args('eventIds', { type: () => [ID] }) eventIds: string[]
  ) {
    return this.newsEventsService.pushBulkToPriceHistory(eventIds);
  }
}
