import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(__dirname, '../../src/database/migrations');

describe('Database Migrations', () => {
  const expectedMigrations = [
    '001-create-users.ts',
    '002-create-permissions.ts',
    '003-create-companies.ts',
    '004-create-plans.ts',
    '005-create-subscriptions.ts',
    '006-create-whatsapp-sessions.ts',
    '007-create-conversations.ts',
    '008-create-messages.ts',
    '009-create-media.ts',
    '010-create-automation-rules.ts',
    '011-alter-conversations-add-assignment.ts',
    '012-create-conversation-notes.ts',
    '013-create-webhook-configs.ts',
    '014-create-pipeline-stages.ts',
    '015-create-deals.ts',
    '016-create-activities.ts',
    '017-create-contacts.ts',
    '018-add-default-probability-to-pipeline-stages.ts',
    '019-create-templates.ts',
    '020-create-campaigns.ts',
    '021-create-campaign-contacts.ts',
    '022-create-imports-log.ts',
    '023-create-ai.ts',
    '024-create-audit-logs.ts',
  ];

  describe.each(expectedMigrations)('%s', (filename) => {
    const filePath = resolve(MIGRATIONS_DIR, filename);

    it('should exist', () => {
      expect(existsSync(filePath)).toBe(true);
    });

    it('should have up method', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('async up(queryRunner: QueryRunner)');
    });

    it('should have down method', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('async down(queryRunner: QueryRunner)');
    });

    it('should import MigrationInterface and QueryRunner from typeorm', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/import\s*\{[^}]*MigrationInterface[^}]*\}\s*from\s+['"]typeorm['"]/);
      expect(content).toMatch(/import\s*\{[^}]*QueryRunner[^}]*\}\s*from\s+['"]typeorm['"]/);
    });

    it('should have a class named after the migration', () => {
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/export class \w+ implements MigrationInterface/);
    });
  });

  it('should not have extra migration files', () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.ts'));
    for (const file of files) {
      expect(expectedMigrations).toContain(file);
    }
  });
});

describe('Seed Files', () => {
  const SEEDS_DIR = resolve(__dirname, '../../src/seeds');

  it('seed.admin.ts should exist', () => {
    expect(existsSync(resolve(SEEDS_DIR, 'seed.admin.ts'))).toBe(true);
  });

  it('seed.plans.ts should exist', () => {
    expect(existsSync(resolve(SEEDS_DIR, 'seed.plans.ts'))).toBe(true);
  });

  it('seed.admin.ts should create subscription', () => {
    const content = readFileSync(resolve(SEEDS_DIR, 'seed.admin.ts'), 'utf-8');
    expect(content).toContain('Subscription');
    expect(content).toContain('enterprisePlan');
  });

  it('seed.plans.ts should have description field', () => {
    const content = readFileSync(resolve(SEEDS_DIR, 'seed.plans.ts'), 'utf-8');
    expect(content).toContain('description');
  });

  it('seed.plans.ts should have 4 plans', () => {
    const content = readFileSync(resolve(SEEDS_DIR, 'seed.plans.ts'), 'utf-8');
    const matches = content.match(/name:\s*'/g);
    expect(matches?.length).toBe(4);
  });
});

describe('run-migrations.ts', () => {
  const filePath = resolve(__dirname, '../../src/database/run-migrations.ts');

  it('should exist', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('should load migrations from dist/database/migrations/*.js', () => {
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('dist/database/migrations/*.js');
  });

  it('should use DataSource from typeorm', () => {
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/import\s*\{[^}]*DataSource[^}]*\}\s*from\s+['"]typeorm['"]/);
  });
});
