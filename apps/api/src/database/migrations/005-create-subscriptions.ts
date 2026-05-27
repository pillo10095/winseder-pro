import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSubscriptions005 implements MigrationInterface {
  name = 'CreateSubscriptions005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'subscriptions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'company_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'plan_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['trial', 'active', 'paused', 'cancelled', 'expired'],
            default: "'trial'",
            isNullable: false,
          },
          {
            name: 'trial_ends_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'starts_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'ends_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
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
      'subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_company_id',
        columnNames: ['company_id'],
      }),
    );

    await queryRunner.createIndex(
      'subscriptions',
      new TableIndex({
        name: 'idx_subscriptions_plan_id',
        columnNames: ['plan_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'fk_subscriptions_company_id',
        columnNames: ['company_id'],
        referencedTableName: 'companies',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'subscriptions',
      new TableForeignKey({
        name: 'fk_subscriptions_plan_id',
        columnNames: ['plan_id'],
        referencedTableName: 'plans',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('subscriptions', 'fk_subscriptions_plan_id');
    await queryRunner.dropForeignKey('subscriptions', 'fk_subscriptions_company_id');
    await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_plan_id');
    await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_company_id');
    await queryRunner.dropTable('subscriptions');
  }
}
