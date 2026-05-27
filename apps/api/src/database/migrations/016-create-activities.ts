import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateActivities016 implements MigrationInterface {
  name = 'CreateActivities016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'activities',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'contact_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'deal_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'type', type: 'varchar', length: '20', isNullable: false },
          { name: 'description', type: 'text', isNullable: false },
          { name: 'logged_by', type: 'varchar', length: '36', isNullable: false },
          { name: 'activity_date', type: 'datetime', isNullable: false },
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
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['deal_id'],
            referencedTableName: 'deals',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    await queryRunner.createIndex('activities', new TableIndex({
      name: 'IDX_ACTIVITIES_CONTACT',
      columnNames: ['contact_id'],
    }));

    await queryRunner.createIndex('activities', new TableIndex({
      name: 'IDX_ACTIVITIES_DEAL',
      columnNames: ['deal_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('activities');
  }
}
