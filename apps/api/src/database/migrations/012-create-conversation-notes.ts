import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947961886 implements MigrationInterface {
  name = 'Migration1779947961886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'conversation_notes',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'conversation_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'author_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'content', type: 'text', isNullable: false },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
        ],
        foreignKeys: [
          {
            columnNames: ['conversation_id'],
            referencedTableName: 'conversations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['author_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'conversation_notes',
      new TableIndex({ name: 'IDX_CN_CONVERSATION', columnNames: ['conversation_id'] }),
    );
    await queryRunner.createIndex(
      'conversation_notes',
      new TableIndex({ name: 'IDX_CN_AUTHOR', columnNames: ['author_id'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('conversation_notes');
  }
}
