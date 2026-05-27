import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AlterConversationsAddAssignment011 implements MigrationInterface {
  name = 'AlterConversationsAddAssignment011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'assigned_to',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['OPEN', 'PENDING', 'CLOSED'],
        default: "'OPEN'",
      }),
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['assigned_to'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({ name: 'IDX_CONV_ASSIGNED', columnNames: ['assigned_to'] }),
    );

    await queryRunner.createIndex(
      'conversations',
      new TableIndex({ name: 'IDX_CONV_STATUS', columnNames: ['status'] }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversations');
    const fk = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('assigned_to') !== -1);
    if (fk) await queryRunner.dropForeignKey('conversations', fk);

    await queryRunner.dropColumn('conversations', 'assigned_to');
    await queryRunner.dropColumn('conversations', 'status');
  }
}
