import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTemplates1715000000019 implements MigrationInterface {
  name = 'CreateTemplates1715000000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'templates',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'body', type: 'text', isNullable: false },
          { name: 'variables', type: 'json', isNullable: true },
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

    await queryRunner.createIndex('templates', new TableIndex({
      name: 'IDX_TEMPLATES_COMPANY',
      columnNames: ['company_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('templates');
  }
}
