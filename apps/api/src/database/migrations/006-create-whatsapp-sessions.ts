import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWhatsAppSessions006 implements MigrationInterface {
  name = 'CreateWhatsAppSessions006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_sessions',
        columns: [
          { name: 'id', type: 'varchar', length: '36', isPrimary: true },
          { name: 'company_id', type: 'varchar', length: '36', isNullable: false },
          { name: 'session_name', type: 'varchar', length: '100', isNullable: false },
          {
            name: 'status',
            type: 'enum',
            enum: ['DISCONNECTED', 'CONNECTING', 'QR_CODE', 'CONNECTED', 'EXPIRED'],
            default: "'DISCONNECTED'",
          },
          { name: 'phone_number', type: 'varchar', length: '20', isNullable: true },
          { name: 'auth_state', type: 'text', isNullable: true },
          { name: 'last_seen', type: 'datetime', isNullable: true },
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

    await queryRunner.createIndex(
      'whatsapp_sessions',
      new TableIndex({ name: 'IDX_WS_COMPANY', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'whatsapp_sessions',
      new TableIndex({ name: 'IDX_WS_STATUS', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'whatsapp_sessions',
      new TableIndex({ name: 'IDX_WS_LAST_SEEN', columnNames: ['last_seen'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('whatsapp_sessions');
  }
}
