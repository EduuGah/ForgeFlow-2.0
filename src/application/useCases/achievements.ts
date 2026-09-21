import {
  achievementCatalog,
  type AchievementDefinition,
} from '../../domain/achievements/catalog';
import type { Achievement } from '../../domain/achievements/entities';
import {
  achievementMetricValue,
  getBestEstimatedOneRepMaxGrowth,
  getLongestWeeklyWorkoutStreak,
  type AchievementMetrics,
} from '../../domain/achievements/rules';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import { calculateCompletedWorkoutVolume } from '../../domain/training/metrics';
import type { RepositoryProvider } from '../ports/repositories';

type AchievementRepositories = Pick<
  RepositoryProvider,
  | 'achievements'
  | 'goals'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
  | 'syncOperations'
  | 'workoutSessions'
>;

export type AchievementDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: AchievementRepositories;
};

export type AchievementCatalogItem = {
  achievement: Achievement | null;
  definition: AchievementDefinition;
};

export async function evaluateAchievements(
  input: { userId: EntityId },
  dependencies: AchievementDependencies,
) {
  const [existing, metrics] = await Promise.all([
    dependencies.repositories.achievements.listAchievements(input),
    collectAchievementMetrics(input.userId, dependencies.repositories),
  ]);
  const unlockedTypes = new Set(
    existing.map((achievement) => achievement.achievementType),
  );
  const unlocked: Achievement[] = [];

  for (const definition of achievementCatalog) {
    const metricValue = achievementMetricValue(definition.metric, metrics);
    if (
      unlockedTypes.has(definition.type) ||
      metricValue < definition.threshold
    ) {
      continue;
    }

    const now = dependencies.clock();
    const growth = metrics.estimatedOneRepMaxGrowth;
    const achievement: Achievement = {
      achievedAt: now,
      achievementType: definition.type,
      createdAt: now,
      id: dependencies.generateId(),
      metadata: {
        metricValue,
        threshold: definition.threshold,
        ...(definition.metric === 'estimated_1rm_growth_percent' && growth
          ? {
              baseline: growth.baseline,
              current: growth.current,
              exerciseId: growth.exerciseId,
            }
          : {}),
      },
      userId: input.userId,
    };
    await queueAchievementSync(achievement, dependencies);
    await dependencies.repositories.achievements.saveAchievement(achievement);
    unlocked.push(achievement);
    unlockedTypes.add(definition.type);
  }

  return unlocked;
}

export async function listAchievementCatalog(
  input: { userId: EntityId },
  repositories: Pick<RepositoryProvider, 'achievements'>,
): Promise<AchievementCatalogItem[]> {
  const achievements = await repositories.achievements.listAchievements(input);
  const byType = new Map(
    achievements.map((achievement) => [
      achievement.achievementType,
      achievement,
    ]),
  );

  return achievementCatalog
    .map((definition) => ({
      achievement: byType.get(definition.type) ?? null,
      definition,
    }))
    .sort((left, right) => {
      const unlockedDifference =
        Number(Boolean(right.achievement)) - Number(Boolean(left.achievement));
      return (
        unlockedDifference ||
        left.definition.threshold - right.definition.threshold
      );
    });
}

async function collectAchievementMetrics(
  userId: EntityId,
  repositories: AchievementRepositories,
): Promise<AchievementMetrics> {
  const [sessions, goals, personalRecords] = await Promise.all([
    repositories.workoutSessions.listWorkoutSessions({ userId }),
    repositories.goals.listGoals({ userId }),
    repositories.personalRecords.listPersonalRecords({ userId }),
  ]);
  const completedSessions = sessions.filter(
    (session) => session.status === 'completed' && session.completedAt,
  );
  const sessionExercises = (
    await Promise.all(
      completedSessions.map((session) =>
        repositories.sessionExercises.listSessionExercises({
          sessionId: session.id,
        }),
      ),
    )
  ).flat();
  const sets = await repositories.sets.listTrainingSets({
    sessionExerciseIds: sessionExercises.map((exercise) => exercise.id),
  });

  return {
    completedGoalCount: goals.filter((goal) => goal.status === 'completed')
      .length,
    estimatedOneRepMaxGrowth: getBestEstimatedOneRepMaxGrowth(personalRecords),
    personalRecordCount: personalRecords.length,
    trainingVolumeKg: calculateCompletedWorkoutVolume(sets),
    weeklyStreak: getLongestWeeklyWorkoutStreak(
      completedSessions.flatMap((session) =>
        session.completedAt ? [session.completedAt] : [],
      ),
    ),
    workoutCount: completedSessions.length,
  };
}

async function queueAchievementSync(
  achievement: Achievement,
  dependencies: AchievementDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: achievement.id,
    entityType: 'achievement',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: { ...achievement },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
