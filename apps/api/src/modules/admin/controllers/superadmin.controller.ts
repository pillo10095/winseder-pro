import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { UserRole } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SuperAdminService } from '../services/superadmin.service';
import { AuditLogService } from '../services/audit-log.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SuperAdminController {
  constructor(
    private readonly superAdmin: SuperAdminService,
    private readonly auditLog: AuditLogService,
  ) {}

  /* ───── Stats ───── */

  @Get('stats')
  async getStats() {
    const stats = await this.superAdmin.getSystemStats();
    return { data: stats };
  }

  /* ───── Companies ───── */

  @Get('companies')
  async listCompanies(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('is_active') isActive?: string,
  ) {
    const result = await this.superAdmin.listCompanies({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { data: result };
  }

  @Get('companies/:companyId')
  async getCompany(@Param('companyId') companyId: string) {
    const detail = await this.superAdmin.getCompanyDetail(companyId);
    return { data: detail };
  }

  @Put('companies/:companyId/toggle')
  async toggleCompany(
    @Param('companyId') companyId: string,
    @Body() body: { is_active: boolean },
    @Req() req: Request,
  ) {
    const result = await this.superAdmin.toggleCompany(
      companyId,
      body.is_active,
      req.user!.id,
    );
    return { data: result };
  }

  /* ───── Users ───── */

  @Get('users')
  async listUsers(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('company_id') companyId?: string,
    @Query('role') role?: UserRole,
  ) {
    const result = await this.superAdmin.listUsers({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      companyId,
      role,
    });
    return { data: result };
  }

  @Put('users/:userId/toggle')
  async toggleUser(
    @Param('userId') userId: string,
    @Body() body: { is_active: boolean },
    @Req() req: Request,
  ) {
    const result = await this.superAdmin.toggleUser(
      userId,
      body.is_active,
      req.user!.id,
    );
    return { data: result };
  }

  /* ───── Audit Log ───── */

  @Get('audit-log')
  async getAuditLog(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('company_id') companyId?: string,
    @Query('actor_id') actorId?: string,
  ) {
    const result = await this.auditLog.findAll({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      action,
      companyId,
      actorId,
    });
    return { data: result };
  }

  @Get('audit-log/stats')
  async getAuditStats(@Query('days') days?: string) {
    const stats = await this.auditLog.getStats(days ? parseInt(days, 10) : 30);
    return { data: stats };
  }
}
