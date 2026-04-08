import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NewsEventModel, UpsertNewsEventInput } from './dto/news-event.dto';
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
  @Mutation(() => Boolean)
  deleteNewsEvent(@Args('id') id: string) {
    return this.newsEventsService.delete(id);
  }
}
