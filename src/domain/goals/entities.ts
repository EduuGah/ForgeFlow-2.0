import type {
  EntityId,
  ISODateTimeString,
  SoftDeletableEntity,
  TimestampedEntity,
  UserOwnedEntity,
} from '../shared/types';

export type GoalType =
  | 'body_weight'
  | 'custom'
  | 'exercise_repetitions'
  | 'exercise_volume'
  | 'exercise_weight'
  | 'monthly_workout_count'
  | 'pr_achievement'
  | 'total_volume'
  | 'workout_frequency';

export type GoalStatus =
  | 'active'
  | 'behind'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'on_track'
  | 'paused';

export type GoalMetric =
  | 'body_weight_kg'
  | 'custom_value'
  | 'personal_record_count'
  | 'repetitions'
  | 'volume_kg'
  | 'weight_kg'
  | 'workout_count'
  | 'workout_frequency_per_week';

export type Goal = TimestampedEntity &
  SoftDeletableEntity &
  UserOwnedEntity & {
    baselineValue: number | null;
    completedAt: ISODateTimeString | null;
    deadline: ISODateTimeString | null;
    exerciseId: EntityId | null;
    metric: GoalMetric;
    status: GoalStatus;
    targetValue: number;
    title: string;
    type: GoalType;
  };

export type GoalProgressSource =
  'analytics_refresh' | 'manual' | 'workout_completion';

export type GoalProgressEvent = {
  goalId: EntityId;
  id: EntityId;
  measuredValue: number;
  progressPercent: number;
  recordedAt: ISODateTimeString;
  sourceId: EntityId | null;
  sourceType: GoalProgressSource;
};
