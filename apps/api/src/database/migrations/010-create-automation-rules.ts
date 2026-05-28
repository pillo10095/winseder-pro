import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947959886 implements MigrationInterface {
  name = 'Migration1779947959886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'automation_rules',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'conditions', type: 'json', isNullable: false },
          { name: 'actions', type: 'json', isNullable: false },
          { name: 'priority', type: 'int', default: 0 },
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
        ],
      }),
    );

    await queryRunner.createIndex(
      'automation_rules',
      new TableIndex({ name: 'IDX_AR_COMPANY', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'automation_rules',
      new TableIndex({ name: 'IDX_AR_ACTIVE', columnNames: ['is_active'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('automation_rules');
  }
}
