export type SetType = 'working' | 'warmup';

export interface SetEntry {
  id: string;
  setNumber: number;
  setType: SetType;
  weightKg: number;
  repetitions: number;
  completed: boolean;
  notes?: string;
}

export interface ActiveExerciseSession {
  exerciseId: string;
  exerciseName: string;
  primaryMuscleGroup: string;
  equipment: string | null;
  /** Rest started after completing a set of this exercise. */
  restSeconds?: number;
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
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
  restSeconds: number;
}

export interface WorkoutTemplateItem {
  id: string;
  name: string;
  description: string;
  exercises: TemplateExercise[];
  /** Folder the routine lives in; none = "Outras rotinas". */
  folderId?: string;
}

/** A named group of routines, e.g. one per gym or training phase. */
export interface RoutineFolder {
  id: string;
  name: string;
  /** Position on the Routines tab, ascending. */
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
}

export type SyncStatus = 'idle' | 'syncing' | 'error';
