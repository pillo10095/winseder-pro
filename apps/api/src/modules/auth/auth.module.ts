import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtTokenService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { Permission } from './entities/permission.entity';
import { User } from './entities/user.entity';
import { Company } from '../tenancy/entities/company.entity';
import { Plan } from '../tenancy/entities/plan.entity';
import { Subscription } from '../tenancy/entities/subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Permission, Company, Plan, Subscription]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION', '24h') as `${number}${'s' | 'm' | 'h' | 'd'}` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    RefreshTokenService,
    TokenBlacklistService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtModule, JwtTokenService, RefreshTokenService, TokenBlacklistService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
