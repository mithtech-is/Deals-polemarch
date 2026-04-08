import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { AuthController } from './auth.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [AuthService, AuthResolver],
  controllers: [AuthController],
  exports: [JwtModule, AuthService]
})
export class AuthModule {}
