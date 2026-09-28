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
import {
  cancelLocalNotification,
  disablePushDevices,
  registerPushDevice,
  scheduleLocalNotification,
} from '../application/useCases/notificationDelivery';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from '../application/useCases/notificationPreferences';
import {
  createMeal,
  deleteMeal,
  listNutritionJournal,
  type CreateMealInput,
} from '../application/useCases/nutritionJournal';
import { buildConsolidatedReport } from '../application/useCases/consolidatedReport';
import type { ReportPeriod } from '../domain/reports/entities';
import { RestTimerController } from '../application/useCases/restTimer';
import {
  buildStructuredAiExport,
  shareStructuredAiExport,
} from '../application/useCases/structuredAiExport';
import {
  deleteHydrationEntry,
  getHydrationReminderContext,
  listHydrationHistory,
  recordHydration,
  setHydrationGoal,
} from '../application/useCases/hydrationTracking';
import {
  attachMealPhoto,
  listMealPhotos,
  processMediaUploadQueue,
  retryMediaUpload,
} from '../application/useCases/mealPhotos';
import type { MealPhotoSource } from '../application/ports/media';
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
import { ExpoNotificationGateway } from '../data/notifications/expoNotificationGateway';
import { ExpoMealPhotoGateway } from '../data/media/expoMealPhotoGateway';
import { InMemoryMediaUploadGateway } from '../data/media/inMemoryMediaUploadGateway';
import { PlatformStructuredExportGateway } from '../data/export/platformStructuredExportGateway';
import { createInMemoryRepositories } from '../data/repositories/inMemoryRepositories';
import { systemExercises } from '../data/seeds/systemExercises';
import { LOCAL_PREVIEW_USER_ID } from '../config/localPreview';
import type { RepositoryProvider } from '../application/ports/repositories';

export function createAppServices(repositoryProvider?: RepositoryProvider) {
  const authRemote = new InMemoryAuthRemoteGateway();
  const authStorage = new MemorySecureSessionStorage();
  const repositories =
    repositoryProvider ??
    createInMemoryRepositories({
      exercises: systemExercises,
    });
  const notificationGateway = new ExpoNotificationGateway();
  const mealPhotoGateway = new ExpoMealPhotoGateway();
  const mediaUploadGateway = new InMemoryMediaUploadGateway();
  const structuredExportGateway = new PlatformStructuredExportGateway();
  const restTimerController = new RestTimerController({
    clock: () => new Date().toISOString(),
    notifications: notificationGateway,
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
      transaction: repositories.transaction,
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
      transaction: repositories.transaction,
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
  const notificationDeliveryDependencies = {
    clock: () => new Date().toISOString(),
    gateway: notificationGateway,
    generateId: createLocalUuid,
    repositories: {
      notifications: repositories.notifications,
      pushDevices: repositories.pushDevices,
      syncOperations: repositories.syncOperations,
    },
  };
  const notificationPreferencesDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      notificationPreferences: repositories.notificationPreferences,
      syncOperations: repositories.syncOperations,
    },
  };
  const nutritionDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      meals: repositories.meals,
      syncOperations: repositories.syncOperations,
    },
  };
  const hydrationDependencies = {
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      hydrationEntries: repositories.hydrationEntries,
      hydrationGoals: repositories.hydrationGoals,
      syncOperations: repositories.syncOperations,
    },
  };
  const mealPhotoDependencies = {
    captureGateway: mealPhotoGateway,
    clock: () => new Date().toISOString(),
    generateId: createLocalUuid,
    repositories: {
      meals: repositories.meals,
      media: repositories.media,
      mediaUploads: repositories.mediaUploads,
      syncOperations: repositories.syncOperations,
    },
    uploadGateway: mediaUploadGateway,
  };
  const reportDependencies = {
    clock: () => new Date().toISOString(),
    repositories: {
      exercises: repositories.exercises,
      goalProgressEvents: repositories.goalProgressEvents,
      goals: repositories.goals,
      hydrationEntries: repositories.hydrationEntries,
      hydrationGoals: repositories.hydrationGoals,
      meals: repositories.meals,
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
    notificationDelivery: {
      cancel: (notificationId: string) =>
        cancelLocalNotification(
          { notificationId, userId: LOCAL_PREVIEW_USER_ID },
          notificationDeliveryDependencies,
        ),
      registerDevice: (requestPermission = false) =>
        registerPushDevice(
          { requestPermission, userId: LOCAL_PREVIEW_USER_ID },
          notificationDeliveryDependencies,
        ),
      schedule: (notificationId: string) =>
        scheduleLocalNotification(
          { notificationId, userId: LOCAL_PREVIEW_USER_ID },
          notificationDeliveryDependencies,
        ),
      subscribeToResponses: (listener: (url: string) => void) =>
        notificationGateway.subscribeToResponses(listener),
    },
    notificationPreferences: {
      get: () =>
        getNotificationPreferences(
          {
            timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
            userId: LOCAL_PREVIEW_USER_ID,
          },
          notificationPreferencesDependencies,
        ),
      update: async (
        input: Omit<UpdateNotificationPreferencesInput, 'userId'>,
      ) => {
        const updated = await updateNotificationPreferences(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          notificationPreferencesDependencies,
        );
        if (!updated.pushEnabled) {
          await disablePushDevices(
            { userId: LOCAL_PREVIEW_USER_ID },
            notificationDeliveryDependencies,
          );
        }
        return updated;
      },
    },
    hydration: {
      delete: (entryId: string) =>
        deleteHydrationEntry(
          { entryId, userId: LOCAL_PREVIEW_USER_ID },
          hydrationDependencies,
        ),
      list: (range: { from?: string; to?: string } = {}) =>
        listHydrationHistory(
          { ...range, userId: LOCAL_PREVIEW_USER_ID },
          hydrationDependencies.repositories,
        ),
      record: (input: { amountMl: number; recordedAt: string }) =>
        recordHydration(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          hydrationDependencies,
        ),
      reminderContext: (range: { from: string; to: string }) =>
        getHydrationReminderContext(
          { ...range, userId: LOCAL_PREVIEW_USER_ID },
          hydrationDependencies.repositories,
        ),
      setGoal: (targetMl: number | null) =>
        setHydrationGoal(
          { targetMl, userId: LOCAL_PREVIEW_USER_ID },
          hydrationDependencies,
        ),
    },
    nutrition: {
      create: (input: Omit<CreateMealInput, 'userId'>) =>
        createMeal(
          { ...input, userId: LOCAL_PREVIEW_USER_ID },
          nutritionDependencies,
        ),
      delete: (mealId: string) =>
        deleteMeal(
          { mealId, userId: LOCAL_PREVIEW_USER_ID },
          nutritionDependencies,
        ),
      list: (range: { from?: string; to?: string } = {}) =>
        listNutritionJournal(
          { ...range, userId: LOCAL_PREVIEW_USER_ID },
          nutritionDependencies.repositories,
        ),
    },
    reports: {
      buildAiExport: buildStructuredAiExport,
      generate: async (period: ReportPeriod) => {
        await refreshActiveGoalProgress(
          { userId: LOCAL_PREVIEW_USER_ID },
          goalProgressDependencies,
        );
        return buildConsolidatedReport(
          {
            period,
            timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
            userId: LOCAL_PREVIEW_USER_ID,
          },
          reportDependencies,
        );
      },
      shareAiExport: (document: ReturnType<typeof buildStructuredAiExport>) =>
        shareStructuredAiExport(document, structuredExportGateway),
    },
    restTimer: {
      addSeconds: (seconds: number) => restTimerController.addSeconds(seconds),
      cancel: () => restTimerController.cancel(),
      get: () => restTimerController.getSnapshot(),
      pause: () => restTimerController.pause(),
      resume: () => restTimerController.resume(),
      start: (input: { durationSeconds: number; exerciseName: string }) =>
        restTimerController.start(input),
    },
    mealPhotos: {
      attach: async (mealId: string, source: MealPhotoSource) => {
        const result = await attachMealPhoto(
          { mealId, source, userId: LOCAL_PREVIEW_USER_ID },
          mealPhotoDependencies,
        );
        if (result.status === 'attached') {
          try {
            await processMediaUploadQueue({ limit: 1 }, mealPhotoDependencies);
          } catch {
            // The local attachment is already durable; the queue can retry later.
          }
        }
        return result;
      },
      list: (mediaIds: string[]) =>
        listMealPhotos(
          { mediaIds, userId: LOCAL_PREVIEW_USER_ID },
          mealPhotoDependencies.repositories,
        ),
      retry: (mediaId: string) =>
        retryMediaUpload(
          { mediaId, userId: LOCAL_PREVIEW_USER_ID },
          mealPhotoDependencies,
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
      history: (page: { limit?: number; offset?: number } = {}) =>
        listCompletedWorkouts(
          { ...page, userId: LOCAL_PREVIEW_USER_ID },
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
