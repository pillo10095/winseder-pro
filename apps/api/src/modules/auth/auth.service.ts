import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from './entities/user.entity';
import { JwtTokenService } from './services/jwt.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { Company } from '../tenancy/entities/company.entity';
import { Plan } from '../tenancy/entities/plan.entity';
import { Subscription, SubscriptionStatus } from '../tenancy/entities/subscription.entity';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly jwtTokenService: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string; user: Partial<User> }> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['company'],
    });

    if (!user || !verifyPassword(dto.password, user.password_hash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    const access_token = this.jwtTokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    });

    const { token: refresh_token, jti } =
      await this.jwtTokenService.generateRefreshToken(user.id);

    await this.refreshTokenService.storeRefreshToken(
      jti,
      user.id,
      this.jwtTokenService.getRefreshExpirationSeconds(),
    );

    await this.userRepo.update(user.id, { last_login_at: new Date() });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ access_token: string; refresh_token: string; user: Partial<User> }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const companySlug = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    const company = this.companyRepo.create({
      name: dto.name,
      slug: companySlug,
      is_active: true,
    });
    const savedCompany = await this.companyRepo.save(company);

    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password_hash: hashPassword(dto.password),
      role: dto.role ?? UserRole.AGENT,
      company_id: savedCompany.id,
      is_active: true,
    });
    const savedUser = await this.userRepo.save(user);

    const freePlan = await this.planRepo.findOne({ where: { code: 'free' } });
    if (freePlan) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const subscription = this.subscriptionRepo.create({
        company_id: savedCompany.id,
        plan_id: freePlan.id,
        status: SubscriptionStatus.TRIAL,
        trial_ends_at: trialEndsAt,
        starts_at: new Date(),
      });
      await this.subscriptionRepo.save(subscription);
    }

    const access_token = this.jwtTokenService.generateAccessToken({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      companyId: savedUser.company_id,
    });

    const { token: refresh_token, jti } =
      await this.jwtTokenService.generateRefreshToken(savedUser.id);

    await this.refreshTokenService.storeRefreshToken(
      jti,
      savedUser.id,
      this.jwtTokenService.getRefreshExpirationSeconds(),
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = await this.jwtTokenService.verifyRefreshToken(dto.refresh_token);

    const stored = await this.refreshTokenService.validateRefreshToken(payload.jti);
    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido o revocado');
    }

    await this.refreshTokenService.revokeRefreshToken(payload.jti);

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Usuario no encontrado o desactivado');
    }

    const access_token = this.jwtTokenService.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    });

    const { token: refresh_token, jti } =
      await this.jwtTokenService.generateRefreshToken(user.id);

    await this.refreshTokenService.storeRefreshToken(
      jti,
      user.id,
      this.jwtTokenService.getRefreshExpirationSeconds(),
    );

    return { access_token, refresh_token };
  }

  async logout(token: string): Promise<void> {
    const decoded = this.jwtTokenService.decodeToken(token);

    if (decoded && decoded.jti) {
      const ttl = decoded.exp && decoded.iat
        ? decoded.exp - decoded.iat
        : this.jwtTokenService.getAccessExpirationSeconds();
      await this.tokenBlacklistService.blacklistToken(decoded.jti, ttl);
    }

    if (decoded && decoded.sub) {
      await this.refreshTokenService.revokeAllUserTokens(decoded.sub);
    }
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['company'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

export { hashPassword, verifyPassword };
