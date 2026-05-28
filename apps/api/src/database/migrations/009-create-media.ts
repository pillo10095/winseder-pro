import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947958886 implements MigrationInterface {
  name = 'Migration1779947958886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'media',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'message_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'session_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'original_url', type: 'varchar', length: '500', isNullable: true },
          { name: 'storage_key', type: 'varchar', length: '500', isNullable: false },
          { name: 'mime_type', type: 'varchar', length: '100', isNullable: false },
          { name: 'file_size', type: 'int', isNullable: false },
          { name: 'thumbnail_key', type: 'varchar', length: '500', isNullable: true },
          { name: 'width', type: 'int', isNullable: true },
          { name: 'height', type: 'int', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['message_id'],
            referencedTableName: 'messages',
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
      'media',
      new TableIndex({ name: 'IDX_MEDIA_MESSAGE', columnNames: ['message_id'] }),
    );
    await queryRunner.createIndex(
      'media',
      new TableIndex({ name: 'IDX_MEDIA_SESSION', columnNames: ['session_id'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('media');
  }
}
