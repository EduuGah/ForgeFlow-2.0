import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  createMeal,
  deleteMeal,
  listNutritionJournal,
} from './nutritionJournal';

const now = '2026-09-27T18:00:00.000Z';

describe('nutrition journal', () => {
  it('records a meal locally with optional macros and queues synchronization', async () => {
    const dependencies = createDependencies();
    const meal = await createMeal(
      {
        consumedAt: '2026-09-27T15:30:00.000Z',
        kcal: 620,
        mealType: 'lunch',
        notes: '  Refeicao pos-treino  ',
        proteinG: 42,
        userId: 'user-1',
      },
      dependencies,
    );

    expect(meal).toMatchObject({
      carbsG: null,
      fatG: null,
      kcal: 620,
      notes: 'Refeicao pos-treino',
      proteinG: 42,
    });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it('lists a date range newest first and calculates totals', async () => {
    const dependencies = createDependencies();
    await createMeal(
      {
        carbsG: 50,
        consumedAt: '2026-09-27T12:00:00.000Z',
        fatG: 12,
        kcal: 500,
        mealType: 'lunch',
        proteinG: 35,
        userId: 'user-1',
      },
      dependencies,
    );
    await createMeal(
      {
        consumedAt: '2026-09-27T20:00:00.000Z',
        kcal: 300,
        mealType: 'snack',
        userId: 'user-1',
      },
      dependencies,
    );

    await expect(
      listNutritionJournal(
        {
          from: '2026-09-27T00:00:00.000Z',
          to: '2026-09-27T23:59:59.999Z',
          userId: 'user-1',
        },
        dependencies.repositories,
      ),
    ).resolves.toMatchObject({
      meals: [
        { consumedAt: '2026-09-27T20:00:00.000Z' },
        { consumedAt: '2026-09-27T12:00:00.000Z' },
      ],
      totals: {
        carbsG: 50,
        fatG: 12,
        kcal: 800,
        mealCount: 2,
        proteinG: 35,
      },
    });
  });

  it('validates nutritional values and preserves a deletion tombstone', async () => {
    const dependencies = createDependencies();
    await expect(
      createMeal(
        {
          consumedAt: now,
          kcal: 0,
          mealType: 'other',
          userId: 'user-1',
        },
        dependencies,
      ),
    ).rejects.toThrow('maior que zero');
    const meal = await createMeal(
      {
        consumedAt: now,
        kcal: 180,
        mealType: 'snack',
        userId: 'user-1',
      },
      dependencies,
    );
    await deleteMeal({ mealId: meal.id, userId: 'user-1' }, dependencies);

    await expect(
      dependencies.repositories.meals.listMeals({ userId: 'user-1' }),
    ).resolves.toEqual([]);
    await expect(
      dependencies.repositories.meals.findMealById(meal.id),
    ).resolves.toMatchObject({ deletedAt: now });
  });
});

function createDependencies() {
  let sequence = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories(),
  };
}
