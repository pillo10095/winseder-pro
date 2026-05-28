import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947970886 implements MigrationInterface {
  name = 'Migration1779947970886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'campaign_contacts',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'campaign_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'contact_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
          { name: 'sent_at', type: 'datetime', isNullable: true },
          { name: 'delivered_at', type: 'datetime', isNullable: true },
          { name: 'read_at', type: 'datetime', isNullable: true },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['campaign_id'],
            referencedTableName: 'campaigns',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createIndex('campaign_contacts', new TableIndex({
      name: 'IDX_CAMP_CONTACTS_CAMPAIGN',
      columnNames: ['campaign_id'],
    }));

    await queryRunner.createIndex('campaign_contacts', new TableIndex({
      name: 'IDX_CAMP_CONTACTS_CONTACT',
      columnNames: ['contact_id'],
    }));

    await queryRunner.createIndex('campaign_contacts', new TableIndex({
      name: 'IDX_CAMP_CONTACTS_STATUS',
      columnNames: ['status'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('campaign_contacts');
  }
}
