import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Session, SessionStatus } from '../entities/session.entity';

@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<Session[]> {
    return this.find({ where: { company_id: companyId }, order: { created_at: 'DESC' } });
  }

  async findActiveByCompanyId(companyId: string): Promise<Session | null> {
    return this.findOne({
      where: { company_id: companyId, status: SessionStatus.CONNECTED },
    });
  }

  async findByStatus(status: SessionStatus): Promise<Session[]> {
    return this.find({ where: { status } });
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<Session | null> {
    return this.findOne({ where: { id, company_id: companyId } });
  }
}
