import type { EntityId, ISODateTimeString } from '../shared/types';

export type AchievementType =
  | 'estimated_1rm_growth_10'
  | 'estimated_1rm_growth_25'
  | 'estimated_1rm_growth_5'
  | 'first_personal_record'
  | 'first_workout'
  | 'goals_completed_1'
  | 'goals_completed_10'
  | 'goals_completed_5'
  | 'volume_10000_kg'
  | 'volume_100000_kg'
  | 'volume_500000_kg'
  | 'volume_50000_kg'
  | 'workout_count_10'
  | 'workout_count_100'
  | 'workout_count_25'
  | 'workout_count_50'
  | 'workout_streak_12_weeks'
  | 'workout_streak_3_weeks'
  | 'workout_streak_7_weeks';

export type Achievement = {
  achievedAt: ISODateTimeString;
  achievementType: AchievementType;
  createdAt: ISODateTimeString;
  id: EntityId;
  metadata: Record<string, number | string>;
  userId: EntityId;
};
