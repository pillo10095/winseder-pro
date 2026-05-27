import { randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(user: { id: string; email: string; role: string; companyId: string }): string {
    return this.nestJwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      {
        secret: this.getSecret(),
        expiresIn: this.getAccessExpirationSeconds(),
      },
    );
  }

  async generateRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = this.nestJwtService.sign(
      {
        sub: userId,
        jti,
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpirationSeconds(),
      },
    );

    return { token, jti };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.nestJwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getSecret(),
      });
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
    try {
      return await this.nestJwtService.verifyAsync<{ sub: string; jti: string }>(token, {
        secret: this.getRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as JwtPayload;
    } catch {
      return null;
    }
  }

  getSecret(): string {
    return this.configService.getOrThrow<string>('JWT_SECRET');
  }

  getRefreshSecret(): string {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  getAccessExpirationSeconds(): number {
    const expiration = this.configService.get<string>('JWT_EXPIRATION', '15m');
    return this.parseExpirationToSeconds(expiration);
  }

  getRefreshExpirationSeconds(): number {
    const expiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    return this.parseExpirationToSeconds(expiration);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 7 * 24 * 60 * 60;
    }
  }
}
