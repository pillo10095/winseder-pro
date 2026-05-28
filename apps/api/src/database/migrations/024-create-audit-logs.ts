import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuditLogs1715000000024 implements MigrationInterface {
  name = 'CreateAuditLogs1715000000024';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'actor_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'actor_email',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'actor_role',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'company_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'target_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'target_type',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
            comment: 'JSON string',
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'idx_audit_action',
            columnNames: ['action'],
          },
          {
            name: 'idx_audit_company',
            columnNames: ['company_id'],
          },
          {
            name: 'idx_audit_actor',
            columnNames: ['actor_id'],
          },
          {
            name: 'idx_audit_created',
            columnNames: ['created_at'],
          },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('audit_logs');
  }
}
