import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { Goal, GoalProgressEvent } from '../../domain/goals/entities';
import type {
  HydrationEntry,
  HydrationGoal,
} from '../../domain/hydration/entities';
import type { Meal } from '../../domain/nutrition/entities';
import type {
  Exercise,
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import { buildConsolidatedReport } from './consolidatedReport';
import { getTrainingAnalytics } from './trainingAnalytics';

const userId = 'user-1';
const now = '2026-09-28T12:00:00.000Z';
const period = {
  from: '2026-09-01T03:00:00.000Z',
  to: '2026-10-01T02:59:59.999Z',
};

describe('consolidated report', () => {
  it('reuses dashboard analytics and consolidates real domain data', async () => {
    const repositories = createInMemoryRepositories(seed);
    const report = await buildConsolidatedReport(
      { period, timezoneOffsetMinutes: -180, userId },
      { clock: () => now, repositories },
    );
    const dashboard = await getTrainingAnalytics(
      { period, userId },
      repositories,
    );

    expect(report.training).toEqual(dashboard);
    expect(report.training.summary).toMatchObject({
      personalRecordCount: 1,
      volume: 640,
      workoutCount: 1,
    });
    expect(report.goals).toMatchObject({
      activeCount: 1,
      behindCount: 0,
      completedCount: 0,
      totalCount: 1,
    });
    expect(report.nutrition).toMatchObject({
      daily: [
        {
          carbsG: 50,
          date: '2026-09-09',
          fatG: 15,
          kcal: 600,
          mealCount: 1,
          proteinG: 40,
        },
      ],
      totals: { carbsG: 50, fatG: 15, kcal: 600, mealCount: 1, proteinG: 40 },
    });
    expect(report.hydration).toMatchObject({
      daily: [{ date: '2026-09-09', totalMl: 2000 }],
      goalDaysReached: 1,
      targetMl: 2000,
      totalMl: 2000,
    });
    expect(report.bodyWeight).toEqual({ entries: [], status: 'unavailable' });
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it('returns a complete empty report and rejects invalid periods', async () => {
    const repositories = createInMemoryRepositories();
    const report = await buildConsolidatedReport(
      { period, timezoneOffsetMinutes: -180, userId },
      { clock: () => now, repositories },
    );

    expect(report).toMatchObject({
      goals: { totalCount: 0 },
      hydration: { goalDaysReached: null, totalMl: 0 },
      nutrition: { totals: { kcal: 0, mealCount: 0 } },
      schemaVersion: 1,
      training: { summary: { workoutCount: 0 } },
    });
    await expect(
      buildConsolidatedReport(
        {
          period: { from: period.to, to: period.from },
          timezoneOffsetMinutes: -180,
          userId,
        },
        { clock: () => now, repositories },
      ),
    ).rejects.toThrow('periodo valido');
  });
});

const exercise: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: null,
  equipment: 'Barra',
  id: 'bench',
  isSystem: true,
  name: 'Supino reto',
  ownerUserId: null,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Triceps'],
  updatedAt: now,
};

const session: WorkoutSession = {
  completedAt: '2026-09-10T12:00:00.000Z',
  createdAt: now,
  deletedAt: null,
  durationSeconds: 3600,
  id: 'session-1',
  notes: null,
  startedAt: '2026-09-10T11:00:00.000Z',
  status: 'completed',
  updatedAt: now,
  userId,
  workoutId: null,
};

const sessionExercise: SessionExercise = {
  createdAt: now,
  deletedAt: null,
  exerciseId: exercise.id,
  id: 'session-exercise-1',
  position: 1,
  sessionId: session.id,
  updatedAt: now,
};

const trainingSet: TrainingSet = {
  completedAt: session.completedAt!,
  createdAt: now,
  deletedAt: null,
  id: 'set-1',
  notes: null,
  repetitions: 8,
  restSeconds: 90,
  sessionExerciseId: sessionExercise.id,
  setNumber: 1,
  setType: 'working',
  updatedAt: now,
  weightKg: 80,
};

const personalRecord: PersonalRecord = {
  achievedAt: session.completedAt!,
  contextWeightKg: null,
  createdAt: now,
  exerciseId: exercise.id,
  id: 'record-1',
  recordType: 'weight',
  sourceSetId: trainingSet.id,
  updatedAt: now,
  userId,
  value: 80,
};

const goal: Goal = {
  baselineValue: 0,
  completedAt: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  deadline: null,
  deletedAt: null,
  exerciseId: null,
  id: 'goal-1',
  metric: 'workout_count',
  status: 'active',
  targetValue: 10,
  title: 'Treinar dez vezes',
  type: 'monthly_workout_count',
  updatedAt: now,
  userId,
};

const goalProgress: GoalProgressEvent = {
  goalId: goal.id,
  id: 'goal-progress-1',
  measuredValue: 1,
  progressPercent: 10,
  recordedAt: now,
  sourceId: session.id,
  sourceType: 'workout_completion',
};

const meal: Meal = {
  carbsG: 50,
  consumedAt: '2026-09-10T02:00:00.000Z',
  createdAt: now,
  deletedAt: null,
  fatG: 15,
  id: 'meal-1',
  kcal: 600,
  mealType: 'dinner',
  notes: null,
  photoId: null,
  proteinG: 40,
  updatedAt: now,
  userId,
};

const hydrationGoal: HydrationGoal = {
  createdAt: now,
  deletedAt: null,
  id: 'hydration-goal-1',
  targetMl: 2000,
  updatedAt: now,
  userId,
};

const hydrationEntry: HydrationEntry = {
  amountMl: 2000,
  createdAt: now,
  deletedAt: null,
  id: 'hydration-1',
  recordedAt: '2026-09-10T02:30:00.000Z',
  updatedAt: now,
  userId,
};

const seed = {
  exercises: [exercise],
  goalProgressEvents: [goalProgress],
  goals: [goal],
  hydrationEntries: [hydrationEntry],
  hydrationGoals: [hydrationGoal],
  meals: [meal],
  personalRecords: [personalRecord],
  sessionExercises: [sessionExercise],
  trainingSets: [trainingSet],
  workoutSessions: [session],
};
