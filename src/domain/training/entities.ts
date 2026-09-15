import type {
  EntityId,
  ISODateTimeString,
  SoftDeletableEntity,
  TimestampedEntity,
  UserOwnedEntity,
} from '../shared/types';

export type SetType = 'warmup' | 'working';

export type WorkoutSessionStatus = 'active' | 'completed' | 'abandoned';

export type Exercise = TimestampedEntity &
  SoftDeletableEntity & {
    description: string | null;
    equipment: string | null;
    isSystem: boolean;
    name: string;
    ownerUserId: EntityId | null;
    primaryMuscleGroup: string;
    secondaryMuscleGroups: string[];
  };

export type ExerciseFavorite = {
  createdAt: ISODateTimeString;
  exerciseId: EntityId;
  id: EntityId;
  userId: EntityId;
};

export type WorkoutExercise = TimestampedEntity &
  SoftDeletableEntity & {
    defaultRestSeconds: number | null;
    exerciseId: EntityId;
    notes: string | null;
    position: number;
    targetRepsMax: number | null;
    targetRepsMin: number | null;
    targetSets: number | null;
    targetWeightKg: number | null;
    workoutId: EntityId;
  };

export type WorkoutTemplate = TimestampedEntity &
  SoftDeletableEntity &
  UserOwnedEntity & {
    description: string | null;
    exercises: WorkoutExercise[];
    isArchived: boolean;
    name: string;
    sortOrder: number;
  };

export type WorkoutSession = TimestampedEntity &
  SoftDeletableEntity &
  UserOwnedEntity & {
    completedAt: ISODateTimeString | null;
    durationSeconds: number | null;
    notes: string | null;
    startedAt: ISODateTimeString;
    status: WorkoutSessionStatus;
    workoutId: EntityId | null;
  };

export type SessionExercise = TimestampedEntity &
  SoftDeletableEntity & {
    exerciseId: EntityId;
    position: number;
    sessionId: EntityId;
  };

export type TrainingSet = TimestampedEntity &
  SoftDeletableEntity & {
    completedAt: ISODateTimeString | null;
    notes: string | null;
    repetitions: number;
    restSeconds: number | null;
    sessionExerciseId: EntityId;
    setNumber: number;
    setType: SetType;
    weightKg: number;
  };
