import type { RepositoryProvider } from '../ports/repositories';
import type {
  Meal,
  MealType,
  NutritionTotals,
} from '../../domain/nutrition/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type {
  SyncOperation,
  SyncOperationType,
} from '../../domain/sync/entities';

type NutritionRepositories = Pick<
  RepositoryProvider,
  'meals' | 'syncOperations'
>;

export type NutritionJournalDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: NutritionRepositories;
};

export type CreateMealInput = {
  carbsG?: number | null;
  consumedAt: ISODateTimeString;
  fatG?: number | null;
  kcal: number;
  mealType: MealType;
  notes?: string | null;
  proteinG?: number | null;
  userId: EntityId;
};

export class NutritionInputError extends Error {}

export async function createMeal(
  input: CreateMealInput,
  dependencies: NutritionJournalDependencies,
) {
  validateTimestamp(input.consumedAt);
  const now = dependencies.clock();
  const meal: Meal = {
    carbsG: optionalNutrient(input.carbsG, 'Carboidratos'),
    consumedAt: input.consumedAt,
    createdAt: now,
    deletedAt: null,
    fatG: optionalNutrient(input.fatG, 'Gordura'),
    id: dependencies.generateId(),
    kcal: requiredKcal(input.kcal),
    mealType: input.mealType,
    notes: normalizeNotes(input.notes),
    photoId: null,
    proteinG: optionalNutrient(input.proteinG, 'Proteina'),
    updatedAt: now,
    userId: input.userId,
  };
  await dependencies.repositories.meals.saveMeal(meal);
  await queueMeal(meal, 'upsert', dependencies);
  return meal;
}

export async function deleteMeal(
  input: { mealId: EntityId; userId: EntityId },
  dependencies: NutritionJournalDependencies,
) {
  const existing = await dependencies.repositories.meals.findMealById(
    input.mealId,
  );
  if (!existing || existing.userId !== input.userId || existing.deletedAt) {
    throw new Error('Meal not found.');
  }
  const now = dependencies.clock();
  const meal: Meal = { ...existing, deletedAt: now, updatedAt: now };
  await dependencies.repositories.meals.saveMeal(meal);
  await queueMeal(meal, 'delete', dependencies);
  return meal;
}

export async function listNutritionJournal(
  input: {
    from?: ISODateTimeString;
    to?: ISODateTimeString;
    userId: EntityId;
  },
  repositories: NutritionRepositories,
) {
  const meals = await repositories.meals.listMeals(input);
  const totals: NutritionTotals = meals.reduce(
    (summary, meal) => ({
      carbsG: summary.carbsG + (meal.carbsG ?? 0),
      fatG: summary.fatG + (meal.fatG ?? 0),
      kcal: summary.kcal + meal.kcal,
      mealCount: summary.mealCount + 1,
      proteinG: summary.proteinG + (meal.proteinG ?? 0),
    }),
    { carbsG: 0, fatG: 0, kcal: 0, mealCount: 0, proteinG: 0 },
  );
  return { meals, totals };
}

function requiredKcal(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new NutritionInputError('Informe um valor de kcal maior que zero.');
  }
  return value;
}

function optionalNutrient(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new NutritionInputError(`${label} deve ser zero ou maior.`);
  }
  return value;
}

function validateTimestamp(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    throw new NutritionInputError('Informe uma data e horario validos.');
  }
}

function normalizeNotes(value: string | null | undefined) {
  const notes = value?.trim();
  return notes ? notes : null;
}

async function queueMeal(
  meal: Meal,
  operationType: SyncOperationType,
  dependencies: NutritionJournalDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: meal.id,
    entityType: 'meal',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType,
    payload: { ...meal },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
