import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDefaultProbabilityToPipelineStages018 implements MigrationInterface {
  name = 'AddDefaultProbabilityToPipelineStages018';

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
