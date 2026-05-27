import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePlans004 implements MigrationInterface {
  name = 'CreatePlans004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'plans',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price_mxn',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'max_contacts',
            type: 'int',
            default: 100,
            isNullable: false,
          },
          {
            name: 'max_whatsapp_sessions',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'max_campaigns_per_month',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'features',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'plans',
      new TableIndex({
        name: 'idx_plans_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('plans', 'idx_plans_code');
    await queryRunner.dropTable('plans');
  }
}
