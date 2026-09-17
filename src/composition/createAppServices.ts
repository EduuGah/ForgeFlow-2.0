import {
  login,
  logout,
  registerAccount,
  restoreSession,
} from '../application/useCases/authenticate';
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
  listGoals,
  pauseGoal,
  resumeGoal,
  updateGoal,
  type CreateGoalInput,
  type UpdateGoalInput,
} from '../application/useCases/goalEngine';
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

  return {
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
      create: (input: Omit<CreateGoalInput, 'userId'>) =>
        createGoal(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies,
        ),
      list: () =>
        listGoals(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies.repositories,
        ),
      pause: (goalId: string) =>
        pauseGoal({ goalId, userId: LOCAL_PREVIEW_USER_ID }, goalDependencies),
      resume: (goalId: string) =>
        resumeGoal({ goalId, userId: LOCAL_PREVIEW_USER_ID }, goalDependencies),
      update: (input: Omit<UpdateGoalInput, 'userId'>) =>
        updateGoal(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          goalDependencies,
        ),
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
      complete: (sessionId: string) =>
        completeActiveWorkout(
          { userId: LOCAL_PREVIEW_USER_ID, sessionId },
          workoutExecutionDependencies,
        ),
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
