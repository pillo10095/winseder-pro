import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class Migration1779947967886 implements MigrationInterface {
  name = 'Migration1779947967886';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'pipeline_stages',
      new TableColumn({
        name: 'default_probability',
        type: 'int',
        default: 0,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('pipeline_stages', 'default_probability');
  }
}
