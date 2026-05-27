import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePipelineStages014 implements MigrationInterface {
  name = 'CreatePipelineStages014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pipeline_stages',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'color', type: 'varchar', length: '7', default: "'#6B7280'" },
          { name: 'sort_order', type: 'int', default: 0 },
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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pipeline_stages');
  }
}
