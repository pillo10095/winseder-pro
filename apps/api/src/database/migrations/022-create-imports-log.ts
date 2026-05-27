import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateImportsLog022 implements MigrationInterface {
  name = 'CreateImportsLog022';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'imports_log',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'campaign_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'file_name', type: 'varchar', length: '255', isNullable: false },
          { name: 'file_size', type: 'int', isNullable: true },
          { name: 'total_rows', type: 'int', default: 0 },
          { name: 'imported_rows', type: 'int', default: 0 },
          { name: 'failed_rows', type: 'int', default: 0 },
          { name: 'errors', type: 'json', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['company_id'],
            referencedTableName: 'companies',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['campaign_id'],
            referencedTableName: 'campaigns',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    await queryRunner.createIndex('imports_log', new TableIndex({
      name: 'IDX_IMPORTS_COMPANY',
      columnNames: ['company_id'],
    }));

    await queryRunner.createIndex('imports_log', new TableIndex({
      name: 'IDX_IMPORTS_CAMPAIGN',
      columnNames: ['campaign_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('imports_log');
  }
}
