import {
  login,
  logout,
  registerAccount,
  restoreSession,
} from '../application/useCases/authenticate';
import {
  evaluateAchievements,
  listAchievementCatalog,
} from '../application/useCases/achievements';
import {
  createUserExercise,
  listExerciseLibrary,
  toggleExerciseFavorite,
  type CreateUserExerciseInput,
  type ListExerciseLibraryParams,
} from '../application/useCases/exerciseLibrary';
import { getHomeOverview } from '../application/useCases/getHomeOverview';
import {
  cancelGoal,
  createGoal,
  pauseGoal,
  resumeGoal,
  updateGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
} from '../application/useCases/goalEngine';
import {
  listGoalProgress,
  recordManualGoalProgress,
  refreshActiveGoalProgress,
} from '../application/useCases/goalProgress';
import { getTrainingAnalytics } from '../application/useCases/trainingAnalytics';
import type { AnalyticsPeriod } from '../domain/training/analytics';
import {
  archiveWorkoutTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  listWorkoutTemplateSummaries,
  updateWorkoutTemplate,
  type WorkoutTemplateInput,
} from '../application/useCases/workoutCrud';
import {
  abandonActiveWorkout,
  completeActiveWorkout,
  getActiveWorkout,
  listCompletedWorkouts,
  logWorkoutSet,
  startWorkoutSession,
  type LogWorkoutSetInput,
} from '../application/useCases/workoutExecution';
import { InMemoryAuthRemoteGateway } from '../data/auth/inMemoryAuthGateway';
import { MemorySecureSessionStorage } from '../data/auth/memorySecureSessionStorage';
import { createInMemoryRepositories } from '../data/repositories/inMemoryRepositories';
import { systemExercises } from '../data/seeds/systemExercises';

const LOCAL_PREVIEW_USER_ID = 'local-preview-user';

export function createAppServices() {
  const authRemote = new InMemoryAuthRemoteGateway();
  const authStorage = new MemorySecureSessionStorage();
  const repositories = createInMemoryRepositories({
    exercises: systemExercises,
  });
  const authDependencies = {
    remote: authRemote,
    storage: authStorage,
  };
  const exerciseLibraryRepositories = {
    exerciseFavorites: repositories.exerciseFavorites,
    exercises: repositories.exercises,
    syncOperations: repositories.syncOperations,
  };
  const workoutCrudDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      exercises: repositories.exercises,
      syncOperations: repositories.syncOperations,
      workouts: repositories.workouts,
    },
  };
  const workoutExecutionDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      exercises: repositories.exercises,
      personalRecords: repositories.personalRecords,
      sessionExercises: repositories.sessionExercises,
      sets: repositories.sets,
      syncOperations: repositories.syncOperations,
      workoutSessions: repositories.workoutSessions,
      workouts: repositories.workouts,
    },
  };
  const goalDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      exercises: repositories.exercises,
      goals: repositories.goals,
      personalRecords: repositories.personalRecords,
      sessionExercises: repositories.sessionExercises,
      sets: repositories.sets,
      syncOperations: repositories.syncOperations,
      workoutSessions: repositories.workoutSessions,
    },
  };
  const goalProgressDependencies = {
    ...goalDependencies,
    repositories: {
      ...goalDependencies.repositories,
      goalProgressEvents: repositories.goalProgressEvents,
    },
  };
  const achievementDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      achievements: repositories.achievements,
      goals: repositories.goals,
      personalRecords: repositories.personalRecords,
      sessionExercises: repositories.sessionExercises,
      sets: repositories.sets,
      syncOperations: repositories.syncOperations,
      workoutSessions: repositories.workoutSessions,
    },
  };

  const refreshAchievements = () =>
    evaluateAchievements(
      { userId: LOCAL_PREVIEW_USER_ID },
      achievementDependencies,
    );

  return {
    achievements: {
      list: async () => {
        await refreshAchievements();
        return listAchievementCatalog(
          { userId: LOCAL_PREVIEW_USER_ID },
          repositories,
        );
      },
    },
    auth: {
      login: (email: string, password: string) =>
        login({ email, password }, authDependencies),
      logout: () => logout(authDependencies),
      register: (displayName: string, email: string, password: string) =>
        registerAccount({ displayName, email, password }, authDependencies),
      restoreSession: () => restoreSession(authDependencies),
    },
    currentUserId: LOCAL_PREVIEW_USER_ID,
    analytics: {
      get: (period: AnalyticsPeriod) =>
        getTrainingAnalytics(
          { period, userId: LOCAL_PREVIEW_USER_ID },
          {
            exercises: repositories.exercises,
            personalRecords: repositories.personalRecords,
            sessionExercises: repositories.sessionExercises,
            sets: repositories.sets,
            workoutSessions: repositories.workoutSessions,
          },
        ),
    },
    exerciseLibrary: {
      create: (input: Omit<CreateUserExerciseInput, 'userId'>) =>
        createUserExercise(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          {
            clock: () => new Date().toISOString(),
            generateId: createLocalUuid,
            repositories: exerciseLibraryRepositories,
          },
        ),
      list: (params: Omit<ListExerciseLibraryParams, 'userId'> = {}) =>
        listExerciseLibrary(
          { ...params, userId: LOCAL_PREVIEW_USER_ID },
          exerciseLibraryRepositories,
        ),
      toggleFavorite: (exerciseId: string) =>
        toggleExerciseFavorite(
          { exerciseId, userId: LOCAL_PREVIEW_USER_ID },
          {
            clock: () => new Date().toISOString(),
            generateId: createLocalUuid,
            repositories: exerciseLibraryRepositories,
          },
        ),
    },
    goals: {
      cancel: (goalId: string) =>
        cancelGoal({ goalId, userId: LOCAL_PREVIEW_USER_ID }, goalDependencies),
      create: async (input: Omit<CreateGoalInput, 'userId'>) => {
        const goal = await createGoal(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies,
        );
        await refreshActiveGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        return goal;
      },
      list: async () => {
        await refreshActiveGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        await refreshAchievements();
        return listGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies.repositories,
        );
      },
      pause: (goalId: string) =>
        pauseGoal({ goalId, userId: LOCAL_PREVIEW_USER_ID }, goalDependencies),
      recordProgress: async (goalId: string, measuredValue: number) => {
        const progress = await recordManualGoalProgress(
          { goalId, measuredValue, userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        await refreshAchievements();
        return progress;
      },
      resume: async (goalId: string) => {
        const goal = await resumeGoal(
          { goalId, userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies,
        );
        await refreshActiveGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        return goal;
      },
      update: async (input: Omit<UpdateGoalInput, 'userId'>) => {
        const goal = await updateGoal(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies,
        );
        await refreshActiveGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        return goal;
      },
    },
    homeOverview: {
      get: () =>
        getHomeOverview(
          { userId: LOCAL_PREVIEW_USER_ID },
          {
            goals: repositories.goals,
            syncOperations: repositories.syncOperations,
            workoutSessions: repositories.workoutSessions,
            workouts: repositories.workouts,
          },
        ),
    },
    workouts: {
      archive: (workoutId: string, isArchived: boolean) =>
        archiveWorkoutTemplate(
          {
            isArchived,
            userId: LOCAL_PREVIEW_USER_ID,
            workoutId,
          },
          workoutCrudDependencies,
        ),
      create: (input: WorkoutTemplateInput) =>
        createWorkoutTemplate(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          workoutCrudDependencies,
        ),
      delete: (workoutId: string) =>
        deleteWorkoutTemplate(
          { userId: LOCAL_PREVIEW_USER_ID, workoutId },
          workoutCrudDependencies,
        ),
      duplicate: (workoutId: string) =>
        duplicateWorkoutTemplate(
          { userId: LOCAL_PREVIEW_USER_ID, workoutId },
          workoutCrudDependencies,
        ),
      list: (includeArchived = false) =>
        listWorkoutTemplateSummaries(
          { includeArchived, userId: LOCAL_PREVIEW_USER_ID },
          workoutCrudDependencies.repositories,
        ),
      update: (workoutId: string, input: WorkoutTemplateInput) =>
        updateWorkoutTemplate(
          { ...input, userId: LOCAL_PREVIEW_USER_ID, workoutId },
          workoutCrudDependencies,
        ),
    },
    workoutExecution: {
      complete: async (sessionId: string) => {
        const workout = await completeActiveWorkout(
          { userId: LOCAL_PREVIEW_USER_ID, sessionId },
          workoutExecutionDependencies,
        );
        await refreshActiveGoalProgress(
          {
            sourceId: sessionId,
            sourceType: 'workout_completion',
            userId: LOCAL_PREVIEW_USER_ID,
          },
          goalProgressDependencies,
        );
        await refreshAchievements();
        return workout;
      },
      history: () =>
        listCompletedWorkouts(
          { userId: LOCAL_PREVIEW_USER_ID },
          workoutExecutionDependencies.repositories,
        ),
      abandonActive: () =>
        abandonActiveWorkout(
          { userId: LOCAL_PREVIEW_USER_ID },
          workoutExecutionDependencies,
        ),
      getActive: () =>
        getActiveWorkout(
          { userId: LOCAL_PREVIEW_USER_ID },
          workoutExecutionDependencies.repositories,
        ),
      logSet: (input: Omit<LogWorkoutSetInput, 'userId'>) =>
        logWorkoutSet(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          workoutExecutionDependencies,
        ),
      start: (workoutId: string) =>
        startWorkoutSession(
          { userId: LOCAL_PREVIEW_USER_ID, workoutId },
          workoutExecutionDependencies,
        ),
    },
  };
}

export type AppServices = ReturnType<typeof createAppServices>;

function createLocalUuid() {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = char === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });
}
