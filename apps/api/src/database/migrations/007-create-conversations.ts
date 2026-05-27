import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateConversations007 implements MigrationInterface {
  name = 'CreateConversations007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conversations',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'session_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'contact_jid', type: 'varchar', length: '100', isNullable: false },
          { name: 'contact_name', type: 'varchar', length: '255', isNullable: true },
          { name: 'last_message_at', type: 'datetime', isNullable: true },
          { name: 'unread_count', type: 'int', default: 0 },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['session_id'],
            referencedTableName: 'whatsapp_sessions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({ name: 'IDX_CONV_SESSION', columnNames: ['session_id'] }),
    );
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({ name: 'IDX_CONV_LAST_MSG', columnNames: ['last_message_at'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conversations');
  }
}
