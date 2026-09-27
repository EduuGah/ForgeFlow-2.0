import type { EntityId, ISODateTimeString } from '../shared/types';

export type MealType =
  'breakfast' | 'dinner' | 'lunch' | 'other' | 'snack' | 'supper';

export type Meal = {
  carbsG: number | null;
  consumedAt: ISODateTimeString;
  createdAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
  fatG: number | null;
  id: EntityId;
  kcal: number;
  mealType: MealType;
  notes: string | null;
  photoId: EntityId | null;
  proteinG: number | null;
  updatedAt: ISODateTimeString;
  userId: EntityId;
};

export type NutritionTotals = {
  carbsG: number;
  fatG: number;
  kcal: number;
  mealCount: number;
  proteinG: number;
};
