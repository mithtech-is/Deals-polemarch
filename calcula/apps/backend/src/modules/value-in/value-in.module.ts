import { Module } from '@nestjs/common';
import { ValueInResolver } from './value-in.resolver';
import { ValueInService } from './value-in.service';

@Module({
  providers: [ValueInService, ValueInResolver],
  exports: [ValueInService],
})
export class ValueInModule {}
