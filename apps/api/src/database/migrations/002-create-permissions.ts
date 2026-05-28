import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class Migration1779947951886 implements MigrationInterface {
  name = 'Migration1779947951886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'resource',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'idx_permissions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'permissions',
      new TableIndex({
        name: 'idx_permissions_unique',
        columnNames: ['user_id', 'resource', 'action'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'permissions',
      new TableForeignKey({
        name: 'fk_permissions_user_id',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('permissions', 'fk_permissions_user_id');
    await queryRunner.dropIndex('permissions', 'idx_permissions_unique');
    await queryRunner.dropIndex('permissions', 'idx_permissions_user_id');
    await queryRunner.dropTable('permissions');
  }
}
