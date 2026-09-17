import type { EntityId } from '../../domain/shared/types';
import {
  calculateTrainingAnalytics,
  type AnalyticsPeriod,
  type AnalyticsSet,
} from '../../domain/training/analytics';
import type { RepositoryProvider } from '../ports/repositories';

type TrainingAnalyticsRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
  | 'workoutSessions'
>;

export async function getTrainingAnalytics(
  input: { period: AnalyticsPeriod; userId: EntityId },
  repositories: TrainingAnalyticsRepositories,
) {
  const sessions = (
    await repositories.workoutSessions.listWorkoutSessions({
      userId: input.userId,
    })
  ).filter(
    (session) => session.status === 'completed' && session.completedAt !== null,
  );
  const sessionExerciseGroups = await Promise.all(
    sessions.map((session) =>
      repositories.sessionExercises.listSessionExercises({
        sessionId: session.id,
      }),
    ),
  );
  const sessionExercises = sessionExerciseGroups.flat();
  const trainingSetGroups = await Promise.all(
    sessionExercises.map((sessionExercise) =>
      repositories.sets.listTrainingSets({
        sessionExerciseId: sessionExercise.id,
      }),
    ),
  );
  const exercises = await repositories.exercises.listExercises({
    includeDeleted: true,
    userId: input.userId,
  });
  const namesById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const analyticsSets: AnalyticsSet[] = sessionExercises.flatMap(
    (sessionExercise, index) => {
      const session = sessionById.get(sessionExercise.sessionId);
      const completedAt = session?.completedAt;
      if (!completedAt) return [];

      return trainingSetGroups[index].map((set) => ({
        exerciseId: sessionExercise.exerciseId,
        exerciseName:
          namesById.get(sessionExercise.exerciseId) ?? 'Exercicio removido',
        performedAt: completedAt,
        set,
      }));
    },
  );
  const personalRecords =
    await repositories.personalRecords.listPersonalRecords({
      userId: input.userId,
    });

  return calculateTrainingAnalytics({
    period: input.period,
    personalRecords,
    sessions: sessions.map((session) => ({
      completedAt: session.completedAt!,
      durationSeconds: session.durationSeconds ?? 0,
      id: session.id,
    })),
    sets: analyticsSets,
  });
}
