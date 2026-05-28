import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtTokenService } from '../services/jwt.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const payload = await this.jwtTokenService.verifyToken(token);

    const jti = payload.jti ?? this.tokenBlacklistService.extractJtiFromToken(token);
    const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(jti);

    if (isBlacklisted) {
      throw new UnauthorizedException('Token revocado');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
    };

    // Set companyId directly on request for controllers that use it
    request.companyId = payload.companyId;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
