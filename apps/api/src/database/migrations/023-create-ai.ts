import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class Migration1779947972886 implements MigrationInterface {
  name = 'Migration1779947972886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_agents',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'is_active', type: 'boolean', default: false },
          { name: 'provider', type: 'varchar', length: '50', default: "'openai'" },
          { name: 'model', type: 'varchar', length: '100', default: "'gpt-4o-mini'" },
          { name: 'api_key', type: 'varchar', length: '255', isNullable: true },
          { name: 'base_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'system_prompt', type: 'text', isNullable: true },
          { name: 'temperature', type: 'decimal', precision: 3, scale: 2, default: 0.7 },
          { name: 'max_tokens', type: 'int', default: 500 },
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

    await queryRunner.createIndex('ai_agents', new TableIndex({
      name: 'IDX_AI_AGENTS_COMPANY',
      columnNames: ['company_id'],
    }));

    await queryRunner.createTable(
      new Table({
        name: 'ai_training_docs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'content', type: 'longtext', isNullable: false },
          { name: 'content_type', type: 'varchar', length: '50', default: "'text'" },
          { name: 'chunks', type: 'json', isNullable: true },
          { name: 'created_at', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
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

    await queryRunner.createIndex('ai_training_docs', new TableIndex({
      name: 'IDX_AI_DOCS_COMPANY',
      columnNames: ['company_id'],
    }));

    await queryRunner.createTable(
      new Table({
        name: 'ai_logs',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'agent_id', type: 'varchar', length: '36', isNullable: true },
          { name: 'type', type: 'varchar', length: '50', isNullable: false },
          { name: 'prompt', type: 'text', isNullable: true },
          { name: 'response', type: 'text', isNullable: true },
          { name: 'tokens_used', type: 'int', default: 0 },
          { name: 'duration_ms', type: 'int', default: 0 },
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
            columnNames: ['agent_id'],
            referencedTableName: 'ai_agents',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );

    await queryRunner.createIndex('ai_logs', new TableIndex({
      name: 'IDX_AI_LOGS_COMPANY',
      columnNames: ['company_id'],
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_logs');
    await queryRunner.dropTable('ai_training_docs');
    await queryRunner.dropTable('ai_agents');
  }
}
