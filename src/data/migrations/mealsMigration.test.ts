import { localMealsMigration, serverMealsMigration } from './mealsMigration';

describe('meal migrations', () => {
  it('creates offline and server nutrition journals with validation indexes', () => {
    for (const migration of [localMealsMigration, serverMealsMigration]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0011_meals');
      expect(sql).toContain('CREATE TABLE meals');
      expect(sql).toContain('meal_type');
      expect(sql).toContain('consumed_at');
      expect(sql).toContain('kcal');
      expect(sql).toContain('protein_g');
      expect(sql).toContain('carbs_g');
      expect(sql).toContain('fat_g');
      expect(sql).toContain('idx_meals_user_consumed');
      expect(sql).toContain('idx_meals_user_updated');
    }
  });
});
