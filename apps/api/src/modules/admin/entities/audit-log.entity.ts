import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DISABLED = 'user.disabled',
  COMPANY_CREATED = 'company.created',
  COMPANY_UPDATED = 'company.updated',
  COMPANY_DISABLED = 'company.disabled',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  PLAN_CREATED = 'plan.created',
  PLAN_UPDATED = 'plan.updated',
  PLAN_DISABLED = 'plan.disabled',
  SESSION_PAUSED = 'session.paused',
  SESSION_RESUMED = 'session.resumed',
  BILLING_INVOICE_CREATED = 'billing.invoice.created',
  BILLING_PAYMENT_SUCCEEDED = 'billing.payment.succeeded',
  BILLING_PAYMENT_FAILED = 'billing.payment.failed',
  SETTINGS_UPDATED = 'settings.updated',
  SYSTEM_CONFIG_CHANGED = 'system.config.changed',
  EXPORT_DATA = 'export.data',
  IMPORT_DATA = 'import.data',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50 })
  action!: string;

  @Column({ nullable: true })
  actor_id!: string;

  @Column({ nullable: true })
  actor_email!: string;

  @Column({ nullable: true })
  actor_role!: string;

  @Column({ nullable: true })
  company_id!: string;

  @Column({ nullable: true })
  target_id!: string;

  @Column({ nullable: true })
  target_type!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('simple-json', { nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata!: Record<string, any>;

  @Column({ length: 45, nullable: true })
  ip_address!: string;

  @CreateDateColumn()
  created_at!: Date;
}
