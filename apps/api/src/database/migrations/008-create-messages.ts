import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMessages008 implements MigrationInterface {
  name = 'CreateMessages008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'conversation_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'session_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'message_id', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'type',
            type: 'enum',
            enum: ['text', 'image', 'video', 'document', 'audio', 'location', 'contact', 'sticker'],
            default: "'text'",
          },
          { name: 'content', type: 'text', isNullable: true },
          { name: 'media_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'from_me', type: 'boolean', isNullable: false },
          { name: 'timestamp', type: 'datetime', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
            default: "'PENDING'",
          },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['conversation_id'],
            referencedTableName: 'conversations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
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
      'messages',
      new TableIndex({ name: 'IDX_MSG_CONVERSATION', columnNames: ['conversation_id'] }),
    );
    await queryRunner.createIndex(
      'messages',
      new TableIndex({ name: 'IDX_MSG_SESSION', columnNames: ['session_id'] }),
    );
    await queryRunner.createIndex(
      'messages',
      new TableIndex({ name: 'IDX_MSG_TIMESTAMP', columnNames: ['timestamp'] }),
    );
    await queryRunner.createIndex(
      'messages',
      new TableIndex({ name: 'IDX_MSG_SESSION_TS', columnNames: ['session_id', 'timestamp'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages');
  }
}
