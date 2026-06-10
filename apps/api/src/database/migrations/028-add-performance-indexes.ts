import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class Migration028AddPerformanceIndexes implements MigrationInterface {
  name = 'Migration028AddPerformanceIndexes';

  async up(queryRunner: QueryRunner): Promise<void> {
    // pipeline_stages: index on company_id (queried by every tenant request)
    const pipelineStagesTable = await queryRunner.getTable('pipeline_stages');
    if (pipelineStagesTable) {
      const hasIdx = pipelineStagesTable.indices.some(
        (i) => i.columnNames.indexOf('company_id') !== -1,
      );
      if (!hasIdx) {
        await queryRunner.createIndex(
          'pipeline_stages',
          new TableIndex({
            name: 'IDX_PS_COMPANY',
            columnNames: ['company_id'],
          }),
        );
      }
    }

    // conversations: composite index on (session_id, contact_jid)
    const conversationsTable = await queryRunner.getTable('conversations');
    if (conversationsTable) {
      const hasSessionJidIdx = conversationsTable.indices.some(
        (i) =>
          i.columnNames.includes('session_id') &&
          i.columnNames.includes('contact_jid'),
      );
      if (!hasSessionJidIdx) {
        await queryRunner.createIndex(
          'conversations',
          new TableIndex({
            name: 'IDX_CONV_SESSION_JID',
            columnNames: ['session_id', 'contact_jid'],
          }),
        );
      }
    }

    // automation_rules: index on event column
    const automationRulesTable = await queryRunner.getTable('automation_rules');
    if (automationRulesTable) {
      const hasEventIdx = automationRulesTable.indices.some(
        (i) => i.columnNames.indexOf('event') !== -1,
      );
      if (!hasEventIdx) {
        await queryRunner.createIndex(
          'automation_rules',
          new TableIndex({
            name: 'IDX_AR_EVENT',
            columnNames: ['event'],
          }),
        );
      }
    }

    // whatsapp_label_mappings: composite index on (enabled, company_id)
    const labelMappingsTable = await queryRunner.getTable('whatsapp_label_mappings');
    if (labelMappingsTable) {
      const hasEnabledIdx = labelMappingsTable.indices.some(
        (i) =>
          i.columnNames.includes('enabled') &&
          i.columnNames.includes('company_id'),
      );
      if (!hasEnabledIdx) {
        await queryRunner.createIndex(
          'whatsapp_label_mappings',
          new TableIndex({
            name: 'IDX_WLM_ENABLED_COMPANY',
            columnNames: ['enabled', 'company_id'],
          }),
        );
      }
    }

    // contacts: FULLTEXT index for name, email, company_name (LIKE optimization)
    const contactsTable = await queryRunner.getTable('contacts');
    if (contactsTable) {
      const hasFulltext = contactsTable.indices.some(
        (i) => i.isFulltext,
      );
      if (!hasFulltext) {
        await queryRunner.query(
          'CREATE FULLTEXT INDEX IDX_CONTACTS_FULLTEXT_SEARCH ON contacts (name, email, company_name)',
        );
      }
    }

    // webhook_configs: composite index on (is_active, events) to optimize findActiveByEvent
    const webhookConfigsTable = await queryRunner.getTable('webhook_configs');
    if (webhookConfigsTable) {
      const hasActiveEventsIdx = webhookConfigsTable.indices.some(
        (i) =>
          i.columnNames.includes('is_active') &&
          i.columnNames.includes('events'),
      );
      if (!hasActiveEventsIdx) {
        await queryRunner.createIndex(
          'webhook_configs',
          new TableIndex({
            name: 'IDX_WC_ACTIVE_EVENTS',
            columnNames: ['is_active', 'events'],
          }),
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const indices = [
      'IDX_PS_COMPANY',
      'IDX_CONV_SESSION_JID',
      'IDX_AR_EVENT',
      'IDX_WLM_ENABLED_COMPANY',
      'IDX_WC_ACTIVE_EVENTS',
    ];
    for (const idxName of indices) {
      await queryRunner.dropIndex('pipeline_stages', idxName).catch((err: unknown) => {
        console.warn(`[Migration 028] Failed to drop index ${idxName}:`, (err as Error).message);
      });
    }
    await queryRunner
      .query('DROP INDEX IDX_CONTACTS_FULLTEXT_SEARCH ON contacts')
      .catch((err: unknown) => {
        console.warn('[Migration 028] Failed to drop fulltext index:', (err as Error).message);
      });
  }
}
