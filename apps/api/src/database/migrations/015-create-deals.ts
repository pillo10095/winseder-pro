import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947964886 implements MigrationInterface {
  name = 'Migration1779947964886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'deals',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'pipeline_stage_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'contact_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'name', type: 'varchar', length: '200', isNullable: false },
          { name: 'value', type: 'decimal', precision: 12, scale: 2, default: 0 },
          { name: 'company_name', type: 'varchar', length: '200', isNullable: true },
          { name: 'probability', type: 'int', default: 0 },
          { name: 'close_date', type: 'datetime', isNullable: true },
          { name: 'assigned_to', type: 'varchar', length: '36', isNullable: true },
          { name: 'won_lost_reason', type: 'text', isNullable: true },
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
            columnNames: ['pipeline_stage_id'],
            referencedTableName: 'pipeline_stages',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    await queryRunner.createIndex('deals', new TableIndex({
      name: 'IDX_DEALS_COMPANY_STAGE',
      columnNames: ['company_id', 'pipeline_stage_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deals');
  }
}
