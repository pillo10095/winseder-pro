import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class Migration1779947976886 implements MigrationInterface {
  name = 'Migration1779947976886';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Deals → contacts FK (moved from 015)
    await this.addFkIfNotExists(queryRunner, 'deals', 'contact_id', 'contacts');

    // Activities → contacts FK (moved from 016)
    await this.addFkIfNotExists(queryRunner, 'activities', 'contact_id', 'contacts');

    // contact_labels → contacts FK (moved from 025) with CASCADE
    const contactLabelsTable = await queryRunner.getTable('contact_labels');
    if (contactLabelsTable) {
      const exists = contactLabelsTable.foreignKeys.some(
        (fk) =>
          fk.columnNames.indexOf('contact_id') !== -1 &&
          fk.referencedTableName === 'contacts',
      );
      if (!exists) {
        await queryRunner.createForeignKey(
          'contact_labels',
          new TableForeignKey({
            columnNames: ['contact_id'],
            referencedTableName: 'contacts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        );
      }
    }
  }

  private async addFkIfNotExists(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
    referencedTableName: string,
  ): Promise<void> {
    const table = await queryRunner.getTable(tableName);
    if (!table) return;

    const exists = table.foreignKeys.some(
      (fk) =>
        fk.columnNames.indexOf(columnName) !== -1 &&
        fk.referencedTableName === referencedTableName,
    );
    if (!exists) {
      await queryRunner.createForeignKey(
        tableName,
        new TableForeignKey({
          columnNames: [columnName],
          referencedTableName,
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ['contact_labels', 'activities', 'deals']) {
      const table = await queryRunner.getTable(tableName);
      if (!table) continue;
      for (const fk of table.foreignKeys) {
        if (fk.columnNames.indexOf('contact_id') !== -1) {
          await queryRunner.dropForeignKey(tableName, fk);
        }
      }
    }
  }
}
