import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';

describe('personal records migrations', () => {
  it('adds equivalent local and server personal record storage', () => {
    const local = localMigrations.find(
      (migration) => migration.id === '0004_personal_records',
    );
    const server = serverMigrations.find(
      (migration) => migration.id === '0004_personal_records',
    );
    expect(local?.statements.join('\n')).toContain('estimated_1rm');
    expect(local?.statements.join('\n')).toContain('context_weight_kg');
    expect(server?.statements.join('\n')).toContain(
      'personal_records_source_metric_unique',
    );
  });
});
