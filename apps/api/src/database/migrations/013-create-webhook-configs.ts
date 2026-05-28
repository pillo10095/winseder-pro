import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947962886 implements MigrationInterface {
  name = 'Migration1779947962886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_configs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'url', type: 'varchar', length: '500', isNullable: false },
          { name: 'events', type: 'json', isNullable: false },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'secret', type: 'varchar', length: '100', isNullable: true },
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
      'webhook_configs',
      new TableIndex({ name: 'IDX_WC_COMPANY', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'webhook_configs',
      new TableIndex({ name: 'IDX_WC_ACTIVE', columnNames: ['is_active'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_configs');
  }
}
