import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration025CreateLabels implements MigrationInterface {
  name = 'Migration025CreateLabels';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'labels',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'name', type: 'varchar', length: '100', isNullable: false },
          { name: 'color', type: 'varchar', length: '7', default: "'#6B7280'" },
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

    await queryRunner.createIndex('labels', new TableIndex({
      name: 'IDX_LABELS_COMPANY',
      columnNames: ['company_id'],
    }));

    await queryRunner.createTable(
      new Table({
        name: 'contact_labels',
        columns: [
          { name: 'contact_id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'label_id', type: 'varchar', length: '36', isPrimary: true },
        ],
        foreignKeys: [
          {
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['label_id'],
            referencedTableName: 'labels',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('contact_labels');
    await queryRunner.dropTable('labels');
  }
}
