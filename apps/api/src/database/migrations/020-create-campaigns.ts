import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947969886 implements MigrationInterface {
  name = 'Migration1779947969886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaigns',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'template_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'draft'" },
          { name: 'scheduled_at', type: 'datetime', isNullable: true },
          { name: 'sent_count', type: 'int', default: 0 },
          { name: 'delivered_count', type: 'int', default: 0 },
          { name: 'read_count', type: 'int', default: 0 },
          { name: 'failed_count', type: 'int', default: 0 },
          { name: 'total_count', type: 'int', default: 0 },
          { name: 'completed_at', type: 'datetime', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['company_id'],
            referencedTableName: 'companies',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['template_id'],
            referencedTableName: 'templates',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    await queryRunner.createIndex('campaigns', new TableIndex({
      name: 'IDX_CAMPAIGNS_COMPANY',
      columnNames: ['company_id'],
    }));

    await queryRunner.createIndex('campaigns', new TableIndex({
      name: 'IDX_CAMPAIGNS_STATUS',
      columnNames: ['status'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaigns');
  }
}
