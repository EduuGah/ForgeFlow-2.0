export type SetType = 'working' | 'warmup';

export interface SetEntry {
  id: string;
  setNumber: number;
  setType: SetType;
  weightKg: number;
  repetitions: number;
  completed: boolean;
  notes?: string;
  /** Cardio: time and distance take the place of load × reps. */
  durationSeconds?: number;
  distanceKm?: number;
}

export interface ActiveExerciseSession {
  /** Stable identity in the session (drag to reorder). */
  key?: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscleGroup: string;
  equipment: string | null;
  /** Rest started after completing a set of this exercise. */
  restSeconds?: number;
  /** The routine's reps goal for this exercise (e.g. 8–12), when it has one. */
  targetReps?: { min: number; max?: number };
  /** Cardio: the routine's minutes per set. */
  targetMinutes?: number;
  notes?: string;
  sets: SetEntry[];
}

export interface ActiveWorkoutState {
  id: string;
  name: string;
  startedAt: string;
  templateId?: string;
  exercises: ActiveExerciseSession[];
  notes?: string;
  /** Started during a deload week (half the sets). */
  deload?: boolean;
}

/** Extra set markers kept from imports (Hevy/Strong "F" and "D" sets). */
export type SetTag = 'failure' | 'dropset';

export interface CompletedSet {
  type: SetType;
  weightKg: number;
  /** 0 for cardio/timed sets and for failed attempts. */
  repetitions: number;
  tag?: SetTag;
  rpe?: number;
  distanceKm?: number;
  durationSeconds?: number;
}

export interface CompletedExercise {
  /** Missing on workouts recorded before per-set history existed. */
  exerciseId?: string;
  exerciseName: string;
  primaryMuscleGroup?: string;
  setsCount: number;
  bestWeightKg: number;
  totalVolumeKg: number;
  notes?: string;
  /** Exercises sharing an id were done as a superset. */
  supersetId?: string;
  sets?: CompletedSet[];
}

export interface CompletedWorkout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  /** Working-set volume (warm-ups excluded). */
  totalVolumeKg: number;
  /** Completed working sets. */
  totalSets: number;
  totalReps?: number;
  templateId?: string;
  /** Free text about the whole session (Hevy "description"). */
  notes?: string;
  /** Gym where the workout happened. */
  gymId?: string;
  exercises: CompletedExercise[];
  prsAchieved: string[];
}

/** A place where the person trains; workouts point to it with `gymId`. */
export interface Gym {
  id: string;
  name: string;
  createdAt: string;
}

export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  /** Working sets (warm-ups are counted apart). */
  targetSets: number;
  /** Warm-up sets done before the working ones; missing = none. */
  warmupSets?: number;
  targetReps: number;
  /** Top of a rep range (e.g. 8–12, with `targetReps` = 8); missing = fixed. */
  targetRepsMax?: number;
  targetWeightKg?: number;
  /** Cardio: minutes per set (reps and load do not apply). */
  targetMinutes?: number;
  restSeconds: number;
}

export interface WorkoutTemplateItem {
  id: string;
  name: string;
  description: string;
  exercises: TemplateExercise[];
  /** Folder the routine lives in; none = "Sem pasta". */
  folderId?: string;
  /** Position inside its folder (set when the person drags routines). */
  order?: number;
}

/** A named group of routines, e.g. one per gym or training phase. */
export interface RoutineFolder {
  id: string;
  name: string;
  /** Folder this one lives in; none (or a folder that is gone) = top level. */
  parentId?: string;
  /** Position among the folders of the same parent, ascending. */
  order: number;
  createdAt: string;
}

export type PersonalRecordType =
  'weight' | 'volume' | 'repetitions' | 'estimated_1rm';

export interface PersonalRecordItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: PersonalRecordType;
  value: number;
  unit: string;
  /** Legacy display string ("Hoje") or ISO date. Prefer `achievedAt`. */
  date: string;
  achievedAt?: string;
  workoutId?: string;
}

export type GoalType = 'frequency' | 'weight' | 'exercise_weight' | 'custom';

export interface GoalItem {
  id: string;
  title: string;
  type: GoalType;
  currentValue: number;
  targetValue: number;
  unit: string;
  /** ISO date (YYYY-MM-DD) or a legacy free-text date. */
  deadline?: string;
  status: 'active' | 'completed';
  /** Links an exercise-weight goal to the personal records of one exercise. */
  exerciseId?: string;
  /**
   * Where a body-weight or custom goal started. A target below it is a goal
   * that goes down (e.g. losing weight).
   */
  startValue?: number;
  createdAt?: string;
}

export interface HydrationLog {
  id: string;
  amountMl: number;
  /** Legacy HH:MM label. */
  timestamp: string;
  loggedAt?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealItem {
  id: string;
  name: string;
  mealType: MealType;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Legacy HH:MM label. */
  consumedAt: string;
  loggedAt?: string;
}

export interface RestTimerState {
  status: 'idle' | 'running' | 'paused';
  /** Epoch ms when a running timer ends. */
  endsAt: number | null;
  /** Remaining ms captured when paused. */
  remainingMs: number;
  totalSeconds: number;
  label?: string;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  bio: string;
  experience: string;
  weightKg: number;
  heightCm: number;
  mainGoal: string;
  streakWeeks: number;
  /** Profile photo chosen in the app (small JPEG data URL); wins over Google's. */
  photoDataUrl?: string;
}

/** Circumferences in cm, as exported by Hevy. */
export const MEASUREMENT_SITES = [
  'neckCm',
  'shoulderCm',
  'chestCm',
  'leftBicepCm',
  'rightBicepCm',
  'leftForearmCm',
  'rightForearmCm',
  'abdomenCm',
  'waistCm',
  'hipsCm',
  'leftThighCm',
  'rightThighCm',
  'leftCalfCm',
  'rightCalfCm',
] as const;

export type MeasurementSite = (typeof MEASUREMENT_SITES)[number];

export type BodyMeasurement = {
  id: string;
  /** ISO date-time the measurement refers to. */
  measuredAt: string;
  weightKg?: number;
  fatPercent?: number;
  notes?: string;
} & Partial<Record<MeasurementSite, number>>;

export interface NotificationPrefs {
  workoutReminders: boolean;
  restTimerAlerts: boolean;
  hydrationAlerts: boolean;
  weeklyReport: boolean;
  /** Messages, friend requests and routines sent by friends. */
  friendAlerts: boolean;
  /** A notification with the workout's progress while the app is in the background. */
  workoutProgress: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';
