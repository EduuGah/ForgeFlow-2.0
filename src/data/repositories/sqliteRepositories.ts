import type {
  AchievementRepository,
  ChallengeParticipantRepository,
  ChallengeRepository,
  CompetitionParticipantRepository,
  CompetitionRepository,
  CompetitionResultRepository,
  ExerciseFavoriteRepository,
  ExerciseRepository,
  FriendshipRepository,
  GoalProgressEventRepository,
  GoalRepository,
  HydrationEntryRepository,
  HydrationGoalRepository,
  ListAchievementsParams,
  ListExerciseFavoritesParams,
  ListExercisesParams,
  ListGoalProgressEventsParams,
  ListGoalsParams,
  ListHydrationEntriesParams,
  ListMealsParams,
  ListMediaParams,
  ListNotificationsParams,
  ListPersonalRecordsParams,
  ListSessionExercisesParams,
  ListTrainingSetsParams,
  ListWorkoutSessionsParams,
  ListWorkoutTemplatesParams,
  ListFriendshipsParams,
  MealRepository,
  MediaRepository,
  MediaUploadRepository,
  NotificationPreferencesRepository,
  NotificationRepository,
  PersonalRecordRepository,
  PushDeviceRepository,
  RepositoryProvider,
  RepositoryTransactionRunner,
  SessionExerciseRepository,
  SyncOperationRepository,
  SyncStateRepository,
  SocialProfileRepository,
  TrainingSetRepository,
  WorkoutRepository,
  WorkoutSessionRepository,
  UserBlockRepository,
} from '../../application/ports/repositories';
import type { Achievement } from '../../domain/achievements/entities';
import type { Goal, GoalProgressEvent } from '../../domain/goals/entities';
import type {
  HydrationEntry,
  HydrationGoal,
} from '../../domain/hydration/entities';
import type { Media, MediaUpload } from '../../domain/media/entities';
import type {
  Notification,
  NotificationPreferences,
  PushDeviceRegistration,
} from '../../domain/notifications/entities';
import type { Meal } from '../../domain/nutrition/entities';
import type { EntityId } from '../../domain/shared/types';
import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  Challenge,
  ChallengeParticipant,
  Competition,
  CompetitionParticipant,
  CompetitionResult,
  Friendship,
  FriendshipStatus,
  SocialProfile,
  UserBlock,
} from '../../domain/social/entities';
import type {
  Exercise,
  ExerciseFavorite,
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import type { SQLiteMigrationConnection } from '../migrations/sqliteMigrationExecutor';

type Row = Record<string, unknown>;

class SQLiteForgeFlowRepository
  implements
    AchievementRepository,
    ChallengeParticipantRepository,
    ChallengeRepository,
    CompetitionParticipantRepository,
    CompetitionRepository,
    CompetitionResultRepository,
    ExerciseFavoriteRepository,
    ExerciseRepository,
    FriendshipRepository,
    GoalProgressEventRepository,
    GoalRepository,
    HydrationEntryRepository,
    HydrationGoalRepository,
    MealRepository,
    MediaRepository,
    MediaUploadRepository,
    NotificationPreferencesRepository,
    NotificationRepository,
    PersonalRecordRepository,
    PushDeviceRepository,
    RepositoryTransactionRunner,
    SessionExerciseRepository,
    SyncOperationRepository,
    SyncStateRepository,
    SocialProfileRepository,
    TrainingSetRepository,
    WorkoutRepository,
    WorkoutSessionRepository,
    UserBlockRepository
{
  constructor(private readonly database: SQLiteMigrationConnection) {}

  runInTransaction<T>(work: () => Promise<T>) {
    return this.database.withTransactionAsync(work);
  }

  async countPendingSyncOperations() {
    const rows = await this.rows(
      "SELECT COUNT(*) AS count FROM sync_operations WHERE status = 'pending'",
    );
    return numberValue(rows[0]?.count);
  }

  async enqueueSyncOperation(operation: SyncOperation) {
    await this.save(
      'sync_operations',
      {
        attempt_count: operation.attemptCount,
        created_at: operation.createdAt,
        entity_id: operation.entityId,
        entity_type: operation.entityType,
        last_attempt_at: operation.lastAttemptAt,
        last_error: operation.lastError,
        operation_id: operation.operationId,
        operation_type: operation.operationType,
        payload_json: JSON.stringify(operation.payload),
        status: operation.status,
      },
      ['operation_id'],
    );
  }

  async findActiveWorkoutSession(userId: EntityId) {
    const sessions = await this.listWorkoutSessions({
      limit: 1,
      statuses: ['active'],
      userId,
    });
    return sessions[0] ?? null;
  }

  async findChallengeById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM challenges WHERE id = ?', [id])).map(
        toChallenge,
      ),
    );
  }

  async listChallenges(
    params: import('../../application/ports/repositories').ListChallengesParams = {},
  ) {
    const values: unknown[] = [];
    let sql = 'SELECT * FROM challenges';
    if (params.statuses?.length) {
      sql += ` WHERE status IN (${params.statuses.map(() => '?').join(', ')})`;
      values.push(...params.statuses);
    }
    sql += ' ORDER BY created_at DESC';
    return (await this.rows(sql, values)).map(toChallenge);
  }

  async findChallengeParticipant(challengeId: EntityId, userId: EntityId) {
    return first(
      (
        await this.rows(
          'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?',
          [challengeId, userId],
        )
      ).map(toChallengeParticipant),
    );
  }

  async listChallengeParticipants(challengeId: EntityId) {
    return (
      await this.rows(
        'SELECT * FROM challenge_participants WHERE challenge_id = ? ORDER BY joined_at ASC',
        [challengeId],
      )
    ).map(toChallengeParticipant);
  }

  async findCompetitionById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM competitions WHERE id = ?', [id])).map(
        toCompetition,
      ),
    );
  }

  async listCompetitions() {
    return (
      await this.rows('SELECT * FROM competitions ORDER BY created_at DESC')
    ).map(toCompetition);
  }

  async findCompetitionParticipant(competitionId: EntityId, userId: EntityId) {
    return first(
      (
        await this.rows(
          'SELECT * FROM competition_participants WHERE competition_id = ? AND user_id = ?',
          [competitionId, userId],
        )
      ).map(toCompetitionParticipant),
    );
  }

  async listCompetitionParticipants(competitionId: EntityId) {
    return (
      await this.rows(
        'SELECT * FROM competition_participants WHERE competition_id = ? ORDER BY joined_at ASC',
        [competitionId],
      )
    ).map(toCompetitionParticipant);
  }

  async findCompetitionResult(competitionId: EntityId) {
    return first(
      (
        await this.rows(
          'SELECT * FROM competition_results WHERE competition_id = ?',
          [competitionId],
        )
      ).map(toCompetitionResult),
    );
  }

  async findExerciseById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM exercises WHERE id = ?', [id])).map(
        toExercise,
      ),
    );
  }

  async findExerciseFavorite(userId: EntityId, exerciseId: EntityId) {
    return first(
      (
        await this.rows(
          'SELECT * FROM exercise_favorites WHERE user_id = ? AND exercise_id = ?',
          [userId, exerciseId],
        )
      ).map(toExerciseFavorite),
    );
  }

  async findSocialProfileByUserId(userId: EntityId) {
    return first(
      (
        await this.rows('SELECT * FROM social_profiles WHERE user_id = ?', [
          userId,
        ])
      ).map(toSocialProfile),
    );
  }

  async searchSocialProfiles(input: {
    excludeUserId: EntityId;
    query: string;
  }) {
    const query = `%${input.query.trim().toLocaleLowerCase('pt-BR')}%`;
    return (
      await this.rows(
        `SELECT * FROM social_profiles
         WHERE user_id <> ?
           AND (LOWER(display_name) LIKE ? OR LOWER(username) LIKE ?)
         ORDER BY display_name COLLATE NOCASE ASC`,
        [input.excludeUserId, query, query],
      )
    ).map(toSocialProfile);
  }

  async findFriendshipById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM friendships WHERE id = ?', [id])).map(
        toFriendship,
      ),
    );
  }

  async findFriendshipBetween(firstUserId: EntityId, secondUserId: EntityId) {
    return first(
      (
        await this.rows(
          `SELECT * FROM friendships
           WHERE (requester_user_id = ? AND addressee_user_id = ?)
              OR (requester_user_id = ? AND addressee_user_id = ?)
           ORDER BY updated_at DESC LIMIT 1`,
          [firstUserId, secondUserId, secondUserId, firstUserId],
        )
      ).map(toFriendship),
    );
  }

  async listFriendships(params: ListFriendshipsParams) {
    const values: unknown[] = [params.userId, params.userId];
    let sql = `SELECT * FROM friendships
      WHERE (requester_user_id = ? OR addressee_user_id = ?)`;
    if (params.statuses?.length) {
      sql += ` AND status IN (${params.statuses.map(() => '?').join(', ')})`;
      values.push(...params.statuses);
    }
    sql += ' ORDER BY updated_at DESC';
    return (await this.rows(sql, values)).map(toFriendship);
  }

  async findUserBlock(blockerUserId: EntityId, blockedUserId: EntityId) {
    return first(
      (
        await this.rows(
          `SELECT * FROM user_blocks
           WHERE blocker_user_id = ? AND blocked_user_id = ?`,
          [blockerUserId, blockedUserId],
        )
      ).map(toUserBlock),
    );
  }

  async listUserBlocks(userId: EntityId) {
    return (
      await this.rows(
        `SELECT * FROM user_blocks
         WHERE blocker_user_id = ? OR blocked_user_id = ?`,
        [userId, userId],
      )
    ).map(toUserBlock);
  }

  async findGoalById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM goals WHERE id = ?', [id])).map(toGoal),
    );
  }

  async findHydrationEntryById(id: EntityId) {
    return first(
      (
        await this.rows('SELECT * FROM hydration_entries WHERE id = ?', [id])
      ).map(toHydrationEntry),
    );
  }

  async findHydrationGoalByUserId(userId: EntityId, includeDeleted = false) {
    const goals = (
      await this.rows('SELECT * FROM hydration_goals WHERE user_id = ?', [
        userId,
      ])
    ).map(toHydrationGoal);
    return (
      goals.find((goal) => includeDeleted || goal.deletedAt === null) ?? null
    );
  }

  async findMealById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM meals WHERE id = ?', [id])).map(toMeal),
    );
  }

  async findMediaById(id: EntityId) {
    return first(
      (await this.rows('SELECT * FROM media WHERE id = ?', [id])).map(toMedia),
    );
  }

  async findMediaUploadByMediaId(mediaId: EntityId) {
    return first(
      (
        await this.rows('SELECT * FROM media_upload_queue WHERE media_id = ?', [
          mediaId,
        ])
      ).map(toMediaUpload),
    );
  }

  async findNotificationPreferences(userId: EntityId) {
    return first(
      (
        await this.rows(
          'SELECT * FROM notification_preferences WHERE user_id = ?',
          [userId],
        )
      ).map(toNotificationPreferences),
    );
  }

  async findWorkoutTemplateById(id: EntityId) {
    const workout = first(
      await this.rows('SELECT * FROM workouts WHERE id = ?', [id]),
    );
    return workout ? this.toWorkoutTemplate(workout) : null;
  }

  async listExercises(params: ListExercisesParams = {}) {
    return (
      await this.rows('SELECT * FROM exercises ORDER BY name COLLATE NOCASE')
    )
      .map(toExercise)
      .filter(
        (exercise) => params.includeDeleted || exercise.deletedAt === null,
      )
      .filter((exercise) =>
        params.userId
          ? exercise.isSystem || exercise.ownerUserId === params.userId
          : true,
      )
      .filter((exercise) =>
        params.equipment ? exercise.equipment === params.equipment : true,
      )
      .filter((exercise) =>
        params.primaryMuscleGroup
          ? exercise.primaryMuscleGroup === params.primaryMuscleGroup
          : true,
      )
      .filter((exercise) =>
        params.query
          ? `${exercise.name} ${exercise.description ?? ''}`
              .toLocaleLowerCase('pt-BR')
              .includes(params.query.trim().toLocaleLowerCase('pt-BR'))
          : true,
      );
  }

  async listAchievements(params: ListAchievementsParams) {
    return (
      await this.rows(
        'SELECT * FROM achievements WHERE user_id = ? ORDER BY achieved_at DESC',
        [params.userId],
      )
    )
      .map(toAchievement)
      .filter((item) =>
        params.achievementTypes
          ? params.achievementTypes.includes(item.achievementType)
          : true,
      );
  }

  async listExerciseFavorites(params: ListExerciseFavoritesParams) {
    return (
      await this.rows('SELECT * FROM exercise_favorites WHERE user_id = ?', [
        params.userId,
      ])
    )
      .map(toExerciseFavorite)
      .filter((favorite) =>
        params.exerciseIds
          ? params.exerciseIds.includes(favorite.exerciseId)
          : true,
      );
  }

  async listGoals(params: ListGoalsParams) {
    return (
      await this.rows(
        'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
        [params.userId],
      )
    )
      .map(toGoal)
      .filter((goal) => params.includeDeleted || goal.deletedAt === null)
      .filter((goal) =>
        params.statuses ? params.statuses.includes(goal.status) : true,
      );
  }

  async listGoalProgressEvents(params: ListGoalProgressEventsParams) {
    if (params.goalIds?.length === 0) return [];
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (params.goalId) {
      conditions.push('goal_id = ?');
      values.push(params.goalId);
    }
    if (params.goalIds) {
      conditions.push(`goal_id IN (${placeholders(params.goalIds.length)})`);
      values.push(...params.goalIds);
    }
    return (
      await this.rows(
        `SELECT * FROM goal_progress_events${whereClause(conditions)} ORDER BY recorded_at ASC`,
        values,
      )
    ).map(toGoalProgressEvent);
  }

  async listPendingSyncOperations(limit?: number) {
    return (
      await this.rows(
        `SELECT * FROM sync_operations WHERE status = 'pending' ORDER BY created_at ASC${typeof limit === 'number' ? ' LIMIT ?' : ''}`,
        typeof limit === 'number' ? [limit] : [],
      )
    ).map(toSyncOperation);
  }

  async listPersonalRecords(params: ListPersonalRecordsParams) {
    if (params.sourceSetIds?.length === 0) return [];
    const conditions = ['user_id = ?'];
    const values: unknown[] = [params.userId];
    if (params.exerciseId) {
      conditions.push('exercise_id = ?');
      values.push(params.exerciseId);
    }
    if (params.recordType) {
      conditions.push('record_type = ?');
      values.push(params.recordType);
    }
    if (params.sourceSetIds) {
      conditions.push(
        `source_set_id IN (${placeholders(params.sourceSetIds.length)})`,
      );
      values.push(...params.sourceSetIds);
    }
    if (params.achievedFrom) {
      conditions.push('achieved_at >= ?');
      values.push(params.achievedFrom);
    }
    if (params.achievedTo) {
      conditions.push('achieved_at <= ?');
      values.push(params.achievedTo);
    }
    return (
      await this.rows(
        `SELECT * FROM personal_records${whereClause(conditions)} ORDER BY achieved_at ASC`,
        values,
      )
    ).map(toPersonalRecord);
  }

  async listPushDevices(userId: EntityId) {
    return (
      await this.rows('SELECT * FROM push_devices WHERE user_id = ?', [userId])
    ).map(toPushDevice);
  }

  async listNotifications(params: ListNotificationsParams) {
    return (
      await this.rows(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [params.userId],
      )
    )
      .map(toNotification)
      .filter((item) => (params.id ? item.id === params.id : true))
      .filter((item) =>
        params.dedupeKey ? item.dedupeKey === params.dedupeKey : true,
      );
  }

  async listMeals(params: ListMealsParams) {
    return (
      await this.rows(
        'SELECT * FROM meals WHERE user_id = ? ORDER BY consumed_at DESC',
        [params.userId],
      )
    )
      .map(toMeal)
      .filter((meal) => params.includeDeleted || meal.deletedAt === null)
      .filter((meal) => (params.from ? meal.consumedAt >= params.from : true))
      .filter((meal) => (params.to ? meal.consumedAt <= params.to : true));
  }

  async listHydrationEntries(params: ListHydrationEntriesParams) {
    return (
      await this.rows(
        'SELECT * FROM hydration_entries WHERE user_id = ? ORDER BY recorded_at DESC',
        [params.userId],
      )
    )
      .map(toHydrationEntry)
      .filter((entry) => params.includeDeleted || entry.deletedAt === null)
      .filter((entry) => (params.from ? entry.recordedAt >= params.from : true))
      .filter((entry) => (params.to ? entry.recordedAt <= params.to : true));
  }

  async listMedia(params: ListMediaParams) {
    return (
      await this.rows(
        'SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC',
        [params.userId],
      )
    )
      .map(toMedia)
      .filter((media) => params.includeDeleted || media.deletedAt === null)
      .filter((media) => (params.ids ? params.ids.includes(media.id) : true));
  }

  async listReadyMediaUploads(input: { limit: number; now: string }) {
    return (
      await this.rows(
        "SELECT * FROM media_upload_queue WHERE status IN ('pending', 'failed') AND next_attempt_at <= ? ORDER BY next_attempt_at ASC LIMIT ?",
        [input.now, input.limit],
      )
    ).map(toMediaUpload);
  }

  async listSessionExercises(params: ListSessionExercisesParams) {
    const conditions = ['session_id = ?'];
    const values: unknown[] = [params.sessionId];
    if (!params.includeDeleted) conditions.push('deleted_at IS NULL');
    return (
      await this.rows(
        `SELECT * FROM session_exercises${whereClause(conditions)} ORDER BY position ASC`,
        values,
      )
    ).map(toSessionExercise);
  }

  async listTrainingSets(params: ListTrainingSetsParams) {
    if (params.sessionExerciseIds?.length === 0) return [];
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (!params.includeDeleted) conditions.push('deleted_at IS NULL');
    if (params.sessionExerciseId) {
      conditions.push('session_exercise_id = ?');
      values.push(params.sessionExerciseId);
    }
    if (params.sessionExerciseIds) {
      conditions.push(
        `session_exercise_id IN (${placeholders(params.sessionExerciseIds.length)})`,
      );
      values.push(...params.sessionExerciseIds);
    }
    return (
      await this.rows(
        `SELECT * FROM sets${whereClause(conditions)} ORDER BY set_number ASC`,
        values,
      )
    ).map(toTrainingSet);
  }

  async listWorkoutSessions(params: ListWorkoutSessionsParams) {
    if (params.statuses?.length === 0) return [];
    const conditions = ['user_id = ?'];
    const values: unknown[] = [params.userId];
    if (!params.includeDeleted) conditions.push('deleted_at IS NULL');
    if (params.statuses) {
      conditions.push(`status IN (${placeholders(params.statuses.length)})`);
      values.push(...params.statuses);
    }
    if (params.completedFrom) {
      conditions.push('completed_at >= ?');
      values.push(params.completedFrom);
    }
    if (params.completedTo) {
      conditions.push('completed_at <= ?');
      values.push(params.completedTo);
    }
    let pagination = '';
    if (typeof params.limit === 'number') {
      pagination = ' LIMIT ? OFFSET ?';
      values.push(params.limit, params.offset ?? 0);
    } else if (typeof params.offset === 'number') {
      pagination = ' LIMIT -1 OFFSET ?';
      values.push(params.offset);
    }
    return (
      await this.rows(
        `SELECT * FROM workout_sessions${whereClause(conditions)} ORDER BY started_at DESC${pagination}`,
        values,
      )
    ).map(toWorkoutSession);
  }

  async listWorkoutTemplates(
    userId: EntityId,
    params: ListWorkoutTemplatesParams = {},
  ) {
    const rows = (
      await this.rows(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
        [userId],
      )
    )
      .filter(
        (row) =>
          params.includeDeleted || nullableString(row.deleted_at) === null,
      )
      .filter(
        (row) => params.includeArchived || !booleanValue(row.is_archived),
      );
    return Promise.all(rows.map((row) => this.toWorkoutTemplate(row)));
  }

  async getSyncState(scope: string, key: string) {
    return first(
      (
        await this.rows(
          'SELECT * FROM sync_state WHERE scope = ? AND key = ?',
          [scope, key],
        )
      ).map(toSyncState),
    );
  }

  async markSyncOperationAttempted(operationId: EntityId, attemptedAt: string) {
    await this.database.runAsync(
      `UPDATE sync_operations SET attempt_count = attempt_count + 1,
       last_attempt_at = ?, last_error = NULL WHERE operation_id = ?`,
      [attemptedAt, operationId],
    );
  }

  async markSyncOperationCompleted(operationId: EntityId) {
    await this.database.runAsync(
      "UPDATE sync_operations SET status = 'completed', last_error = NULL WHERE operation_id = ?",
      [operationId],
    );
  }

  async markSyncOperationFailed(
    operationId: EntityId,
    error: string,
    attemptedAt: string,
  ) {
    await this.database.runAsync(
      `UPDATE sync_operations SET status = 'failed', attempt_count = attempt_count + 1,
       last_attempt_at = ?, last_error = ? WHERE operation_id = ?`,
      [attemptedAt, error, operationId],
    );
  }

  async deleteExerciseFavorite(id: EntityId) {
    await this.database.runAsync(
      'DELETE FROM exercise_favorites WHERE id = ?',
      [id],
    );
  }

  saveExercise(exercise: Exercise) {
    return this.save('exercises', {
      created_at: exercise.createdAt,
      deleted_at: exercise.deletedAt,
      description: exercise.description,
      equipment: exercise.equipment,
      id: exercise.id,
      is_system: exercise.isSystem ? 1 : 0,
      name: exercise.name,
      owner_user_id: exercise.ownerUserId,
      primary_muscle_group: exercise.primaryMuscleGroup,
      secondary_muscle_groups: JSON.stringify(exercise.secondaryMuscleGroups),
      updated_at: exercise.updatedAt,
    });
  }

  saveAchievement(item: Achievement) {
    return this.save('achievements', {
      achieved_at: item.achievedAt,
      achievement_type: item.achievementType,
      created_at: item.createdAt,
      id: item.id,
      metadata_json: JSON.stringify(item.metadata),
      user_id: item.userId,
    });
  }

  saveExerciseFavorite(item: ExerciseFavorite) {
    return this.save('exercise_favorites', {
      created_at: item.createdAt,
      exercise_id: item.exerciseId,
      id: item.id,
      user_id: item.userId,
    });
  }

  saveGoal(item: Goal) {
    return this.save('goals', {
      baseline_value: item.baselineValue,
      completed_at: item.completedAt,
      created_at: item.createdAt,
      deadline: item.deadline,
      deleted_at: item.deletedAt,
      exercise_id: item.exerciseId,
      id: item.id,
      metric: item.metric,
      status: item.status,
      target_value: item.targetValue,
      title: item.title,
      type: item.type,
      updated_at: item.updatedAt,
      user_id: item.userId,
    });
  }

  saveGoalProgressEvent(item: GoalProgressEvent) {
    return this.save('goal_progress_events', {
      goal_id: item.goalId,
      id: item.id,
      measured_value: item.measuredValue,
      progress_percent: item.progressPercent,
      recorded_at: item.recordedAt,
      source_id: item.sourceId,
      source_type: item.sourceType,
    });
  }

  savePersonalRecord(item: PersonalRecord) {
    return this.save('personal_records', {
      achieved_at: item.achievedAt,
      context_weight_kg: item.contextWeightKg,
      created_at: item.createdAt,
      exercise_id: item.exerciseId,
      id: item.id,
      record_type: item.recordType,
      source_set_id: item.sourceSetId,
      updated_at: item.updatedAt,
      user_id: item.userId,
      value: item.value,
    });
  }

  savePushDevice(item: PushDeviceRegistration) {
    return this.save('push_devices', {
      created_at: item.createdAt,
      device_push_token: item.devicePushToken,
      disabled_at: item.disabledAt,
      expo_push_token: item.expoPushToken,
      id: item.id,
      platform: item.platform,
      updated_at: item.updatedAt,
      user_id: item.userId,
    });
  }

  saveNotification(item: Notification) {
    return this.save('notifications', {
      archived_at: item.archivedAt,
      body: item.body,
      created_at: item.createdAt,
      data_json: item.data ? JSON.stringify(item.data) : null,
      dedupe_key: item.dedupeKey,
      delivery_status: item.deliveryStatus,
      expires_at: item.expiresAt,
      id: item.id,
      read_at: item.readAt,
      scheduled_for: item.scheduledFor,
      title: item.title,
      type: item.type,
      user_id: item.userId,
    });
  }

  saveMeal(item: Meal) {
    return this.save('meals', {
      carbs_g: item.carbsG,
      consumed_at: item.consumedAt,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      fat_g: item.fatG,
      id: item.id,
      kcal: item.kcal,
      meal_type: item.mealType,
      notes: item.notes,
      photo_id: item.photoId,
      protein_g: item.proteinG,
      updated_at: item.updatedAt,
      user_id: item.userId,
    });
  }

  saveHydrationEntry(item: HydrationEntry) {
    return this.save('hydration_entries', {
      amount_ml: item.amountMl,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      id: item.id,
      recorded_at: item.recordedAt,
      updated_at: item.updatedAt,
      user_id: item.userId,
    });
  }

  saveHydrationGoal(item: HydrationGoal) {
    return this.save('hydration_goals', {
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      id: item.id,
      target_ml: item.targetMl,
      updated_at: item.updatedAt,
      user_id: item.userId,
    });
  }

  saveMedia(item: Media) {
    return this.save('media', {
      checksum: item.checksum,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      id: item.id,
      local_uri: item.localUri,
      mime_type: item.mimeType,
      remote_url: item.remoteUrl,
      size_bytes: item.sizeBytes,
      updated_at: item.updatedAt,
      upload_status: item.uploadStatus,
      user_id: item.userId,
    });
  }

  saveMediaUpload(item: MediaUpload) {
    return this.save('media_upload_queue', {
      attempt_count: item.attemptCount,
      created_at: item.createdAt,
      id: item.id,
      last_attempt_at: item.lastAttemptAt,
      last_error: item.lastError,
      media_id: item.mediaId,
      next_attempt_at: item.nextAttemptAt,
      status: item.status,
      updated_at: item.updatedAt,
    });
  }

  saveNotificationPreferences(item: NotificationPreferences) {
    return this.save('notification_preferences', {
      achievements_enabled: flag(item.achievementsEnabled),
      created_at: item.createdAt,
      frequency_mode: item.frequencyMode,
      goals_enabled: flag(item.goalsEnabled),
      hydration_enabled: flag(item.hydrationEnabled),
      id: item.id,
      inactivity_enabled: flag(item.inactivityEnabled),
      nutrition_enabled: flag(item.nutritionEnabled),
      progress_enabled: flag(item.progressEnabled),
      prs_enabled: flag(item.personalRecordsEnabled),
      push_enabled: flag(item.pushEnabled),
      quiet_hours_end: item.quietHoursEnd,
      quiet_hours_start: item.quietHoursStart,
      reports_enabled: flag(item.reportsEnabled),
      timezone_offset_minutes: item.timezoneOffsetMinutes,
      updated_at: item.updatedAt,
      user_id: item.userId,
      workouts_enabled: flag(item.workoutsEnabled),
    });
  }

  saveSessionExercise(item: SessionExercise) {
    return this.save('session_exercises', {
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      exercise_id: item.exerciseId,
      id: item.id,
      position: item.position,
      session_id: item.sessionId,
      updated_at: item.updatedAt,
    });
  }

  saveTrainingSet(item: TrainingSet) {
    return this.save('sets', {
      completed_at: item.completedAt,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      id: item.id,
      notes: item.notes,
      repetitions: item.repetitions,
      rest_seconds: item.restSeconds,
      session_exercise_id: item.sessionExerciseId,
      set_number: item.setNumber,
      set_type: item.setType,
      updated_at: item.updatedAt,
      weight_kg: item.weightKg,
    });
  }

  saveSyncState(item: SyncState) {
    return this.save(
      'sync_state',
      {
        key: item.key,
        last_error: item.lastError,
        last_success_at: item.lastSuccessAt,
        scope: item.scope,
        server_cursor: item.serverCursor,
      },
      ['scope', 'key'],
    );
  }

  saveWorkoutSession(item: WorkoutSession) {
    return this.save('workout_sessions', {
      completed_at: item.completedAt,
      created_at: item.createdAt,
      deleted_at: item.deletedAt,
      duration_seconds: item.durationSeconds,
      id: item.id,
      notes: item.notes,
      started_at: item.startedAt,
      status: item.status,
      updated_at: item.updatedAt,
      user_id: item.userId,
      workout_id: item.workoutId,
    });
  }

  async saveWorkoutTemplate(item: WorkoutTemplate) {
    await this.database.withTransactionAsync(async () => {
      await this.save('workouts', {
        created_at: item.createdAt,
        deleted_at: item.deletedAt,
        description: item.description,
        id: item.id,
        is_archived: flag(item.isArchived),
        name: item.name,
        sort_order: item.sortOrder,
        updated_at: item.updatedAt,
        user_id: item.userId,
      });
      await this.database.runAsync(
        'DELETE FROM workout_exercises WHERE workout_id = ?',
        [item.id],
      );
      for (const exercise of item.exercises)
        await this.saveWorkoutExercise(exercise);
    });
  }

  async saveSocialProfile(profile: SocialProfile) {
    await this.save(
      'social_profiles',
      {
        avatar_url: profile.avatarUrl,
        bio: profile.bio,
        display_name: profile.displayName,
        is_private: profile.isPrivate ? 1 : 0,
        ranking_opt_in: profile.rankingOptIn ? 1 : 0,
        shares_workout_stats: profile.sharesWorkoutStats ? 1 : 0,
        updated_at: profile.updatedAt,
        user_id: profile.userId,
        username: profile.username,
      },
      ['user_id'],
    );
  }

  async saveChallenge(challenge: Challenge) {
    await this.save('challenges', {
      created_at: challenge.createdAt,
      creator_user_id: challenge.creatorUserId,
      ends_at: challenge.endsAt,
      id: challenge.id,
      metric: challenge.metric,
      starts_at: challenge.startsAt,
      status: challenge.status,
      title: challenge.title,
      updated_at: challenge.updatedAt,
    });
  }

  async saveChallengeParticipant(participant: ChallengeParticipant) {
    await this.save(
      'challenge_participants',
      {
        challenge_id: participant.challengeId,
        id: participant.id,
        joined_at: participant.joinedAt,
        left_at: participant.leftAt,
        status: participant.status,
        updated_at: participant.updatedAt,
        user_id: participant.userId,
      },
      ['challenge_id', 'user_id'],
    );
  }

  async saveCompetition(competition: Competition) {
    await this.save('competitions', {
      created_at: competition.createdAt,
      creator_user_id: competition.creatorUserId,
      ends_at: competition.endsAt,
      id: competition.id,
      metric: competition.metric,
      registration_ends_at: competition.registrationEndsAt,
      rules_version: competition.rulesVersion,
      starts_at: competition.startsAt,
      status: competition.status,
      title: competition.title,
      updated_at: competition.updatedAt,
    });
  }

  async saveCompetitionParticipant(participant: CompetitionParticipant) {
    await this.save(
      'competition_participants',
      {
        competition_id: participant.competitionId,
        id: participant.id,
        joined_at: participant.joinedAt,
        left_at: participant.leftAt,
        status: participant.status,
        updated_at: participant.updatedAt,
        user_id: participant.userId,
      },
      ['competition_id', 'user_id'],
    );
  }

  async saveCompetitionResult(result: CompetitionResult) {
    await this.save(
      'competition_results',
      {
        competition_id: result.competitionId,
        finalized_at: result.finalizedAt,
        id: result.id,
        rules_version: result.rulesVersion,
        standings_json: JSON.stringify(result.standings),
        updated_at: result.updatedAt,
      },
      ['competition_id'],
    );
  }

  async saveFriendship(friendship: Friendship) {
    await this.save(
      'friendships',
      {
        addressee_user_id: friendship.addresseeUserId,
        created_at: friendship.createdAt,
        id: friendship.id,
        requester_user_id: friendship.requesterUserId,
        status: friendship.status,
        updated_at: friendship.updatedAt,
      },
      ['id'],
    );
  }

  async saveUserBlock(block: UserBlock) {
    await this.save(
      'user_blocks',
      {
        blocked_user_id: block.blockedUserId,
        blocker_user_id: block.blockerUserId,
        created_at: block.createdAt,
        deleted_at: block.deletedAt,
        id: block.id,
        updated_at: block.updatedAt,
      },
      ['id'],
    );
  }

  private async saveWorkoutExercise(item: WorkoutExercise) {
    await this.save('workout_exercises', {
      created_at: item.createdAt,
      default_rest_seconds: item.defaultRestSeconds,
      deleted_at: item.deletedAt,
      exercise_id: item.exerciseId,
      id: item.id,
      notes: item.notes,
      position: item.position,
      target_reps_max: item.targetRepsMax,
      target_reps_min: item.targetRepsMin,
      target_sets: item.targetSets,
      target_weight_kg: item.targetWeightKg,
      updated_at: item.updatedAt,
      workout_id: item.workoutId,
    });
  }

  private async toWorkoutTemplate(row: Row): Promise<WorkoutTemplate> {
    const exercises = (
      await this.rows(
        'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position ASC',
        [stringValue(row.id)],
      )
    ).map(toWorkoutExercise);
    return {
      createdAt: stringValue(row.created_at),
      deletedAt: nullableString(row.deleted_at),
      description: nullableString(row.description),
      exercises,
      id: stringValue(row.id),
      isArchived: booleanValue(row.is_archived),
      name: stringValue(row.name),
      sortOrder: numberValue(row.sort_order),
      updatedAt: stringValue(row.updated_at),
      userId: stringValue(row.user_id),
    };
  }

  private rows(sql: string, params: readonly unknown[] = []) {
    return this.database.getAllAsync<Row>(sql, params);
  }

  private async save(
    table: string,
    values: Record<string, unknown>,
    conflictColumns: string[] = ['id'],
  ) {
    const columns = Object.keys(values);
    const updates = columns
      .filter((column) => !conflictColumns.includes(column))
      .map((column) => `${column} = excluded.${column}`)
      .join(', ');
    await this.database.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})
       ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updates}`,
      columns.map((column) => values[column]),
    );
  }
}

export function createSQLiteRepositories(
  database: SQLiteMigrationConnection,
): RepositoryProvider {
  const repository = new SQLiteForgeFlowRepository(database);
  return {
    achievements: repository,
    challengeParticipants: repository,
    challenges: repository,
    competitionParticipants: repository,
    competitionResults: repository,
    competitions: repository,
    exerciseFavorites: repository,
    exercises: repository,
    friendships: repository,
    goals: repository,
    goalProgressEvents: repository,
    hydrationEntries: repository,
    hydrationGoals: repository,
    meals: repository,
    media: repository,
    mediaUploads: repository,
    notificationPreferences: repository,
    notifications: repository,
    personalRecords: repository,
    pushDevices: repository,
    sessionExercises: repository,
    sets: repository,
    syncOperations: repository,
    syncState: repository,
    socialProfiles: repository,
    transaction: repository,
    userBlocks: repository,
    workoutSessions: repository,
    workouts: repository,
  };
}

function toExercise(row: Row): Exercise {
  return {
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    description: nullableString(row.description),
    equipment: nullableString(row.equipment),
    id: stringValue(row.id),
    isSystem: booleanValue(row.is_system),
    name: stringValue(row.name),
    ownerUserId: nullableString(row.owner_user_id),
    primaryMuscleGroup: stringValue(row.primary_muscle_group),
    secondaryMuscleGroups: jsonValue<string[]>(row.secondary_muscle_groups, []),
    updatedAt: stringValue(row.updated_at),
  };
}

function toChallenge(row: Row): Challenge {
  return {
    createdAt: stringValue(row.created_at),
    creatorUserId: stringValue(row.creator_user_id),
    endsAt: stringValue(row.ends_at),
    id: stringValue(row.id),
    metric: stringValue(row.metric) as Challenge['metric'],
    startsAt: stringValue(row.starts_at),
    status: stringValue(row.status) as Challenge['status'],
    title: stringValue(row.title),
    updatedAt: stringValue(row.updated_at),
  };
}

function toChallengeParticipant(row: Row): ChallengeParticipant {
  return {
    challengeId: stringValue(row.challenge_id),
    id: stringValue(row.id),
    joinedAt: stringValue(row.joined_at),
    leftAt: nullableString(row.left_at),
    status: stringValue(row.status) as ChallengeParticipant['status'],
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toCompetition(row: Row): Competition {
  return {
    createdAt: stringValue(row.created_at),
    creatorUserId: stringValue(row.creator_user_id),
    endsAt: stringValue(row.ends_at),
    id: stringValue(row.id),
    metric: stringValue(row.metric) as Competition['metric'],
    registrationEndsAt: stringValue(row.registration_ends_at),
    rulesVersion: numberValue(row.rules_version),
    startsAt: stringValue(row.starts_at),
    status: stringValue(row.status) as Competition['status'],
    title: stringValue(row.title),
    updatedAt: stringValue(row.updated_at),
  };
}

function toCompetitionParticipant(row: Row): CompetitionParticipant {
  return {
    competitionId: stringValue(row.competition_id),
    id: stringValue(row.id),
    joinedAt: stringValue(row.joined_at),
    leftAt: nullableString(row.left_at),
    status: stringValue(row.status) as CompetitionParticipant['status'],
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toCompetitionResult(row: Row): CompetitionResult {
  return {
    competitionId: stringValue(row.competition_id),
    finalizedAt: stringValue(row.finalized_at),
    id: stringValue(row.id),
    rulesVersion: numberValue(row.rules_version),
    standings: jsonValue(row.standings_json, []),
    updatedAt: stringValue(row.updated_at),
  };
}

function toSocialProfile(row: Row): SocialProfile {
  return {
    avatarUrl: nullableString(row.avatar_url),
    bio: nullableString(row.bio),
    displayName: stringValue(row.display_name),
    isPrivate: booleanValue(row.is_private),
    rankingOptIn: booleanValue(row.ranking_opt_in),
    sharesWorkoutStats: booleanValue(row.shares_workout_stats),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
    username: stringValue(row.username),
  };
}

function toFriendship(row: Row): Friendship {
  return {
    addresseeUserId: stringValue(row.addressee_user_id),
    createdAt: stringValue(row.created_at),
    id: stringValue(row.id),
    requesterUserId: stringValue(row.requester_user_id),
    status: stringValue(row.status) as FriendshipStatus,
    updatedAt: stringValue(row.updated_at),
  };
}

function toUserBlock(row: Row): UserBlock {
  return {
    blockedUserId: stringValue(row.blocked_user_id),
    blockerUserId: stringValue(row.blocker_user_id),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    id: stringValue(row.id),
    updatedAt: stringValue(row.updated_at),
  };
}

function toExerciseFavorite(row: Row): ExerciseFavorite {
  return {
    createdAt: stringValue(row.created_at),
    exerciseId: stringValue(row.exercise_id),
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
  };
}

function toWorkoutExercise(row: Row): WorkoutExercise {
  return {
    createdAt: stringValue(row.created_at),
    defaultRestSeconds: nullableNumber(row.default_rest_seconds),
    deletedAt: nullableString(row.deleted_at),
    exerciseId: stringValue(row.exercise_id),
    id: stringValue(row.id),
    notes: nullableString(row.notes),
    position: numberValue(row.position),
    targetRepsMax: nullableNumber(row.target_reps_max),
    targetRepsMin: nullableNumber(row.target_reps_min),
    targetSets: nullableNumber(row.target_sets),
    targetWeightKg: nullableNumber(row.target_weight_kg),
    updatedAt: stringValue(row.updated_at),
    workoutId: stringValue(row.workout_id),
  };
}

function toWorkoutSession(row: Row): WorkoutSession {
  return {
    completedAt: nullableString(row.completed_at),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    durationSeconds: nullableNumber(row.duration_seconds),
    id: stringValue(row.id),
    notes: nullableString(row.notes),
    startedAt: stringValue(row.started_at),
    status: stringValue(row.status) as WorkoutSession['status'],
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
    workoutId: nullableString(row.workout_id),
  };
}

function toSessionExercise(row: Row): SessionExercise {
  return {
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    exerciseId: stringValue(row.exercise_id),
    id: stringValue(row.id),
    position: numberValue(row.position),
    sessionId: stringValue(row.session_id),
    updatedAt: stringValue(row.updated_at),
  };
}

function toTrainingSet(row: Row): TrainingSet {
  return {
    completedAt: nullableString(row.completed_at),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    id: stringValue(row.id),
    notes: nullableString(row.notes),
    repetitions: numberValue(row.repetitions),
    restSeconds: nullableNumber(row.rest_seconds),
    sessionExerciseId: stringValue(row.session_exercise_id),
    setNumber: numberValue(row.set_number),
    setType: stringValue(row.set_type) as TrainingSet['setType'],
    updatedAt: stringValue(row.updated_at),
    weightKg: numberValue(row.weight_kg),
  };
}

function toPersonalRecord(row: Row): PersonalRecord {
  return {
    achievedAt: stringValue(row.achieved_at),
    contextWeightKg: nullableNumber(row.context_weight_kg),
    createdAt: stringValue(row.created_at),
    exerciseId: stringValue(row.exercise_id),
    id: stringValue(row.id),
    recordType: stringValue(row.record_type) as PersonalRecord['recordType'],
    sourceSetId: stringValue(row.source_set_id),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
    value: numberValue(row.value),
  };
}

function toGoal(row: Row): Goal {
  return {
    baselineValue: nullableNumber(row.baseline_value),
    completedAt: nullableString(row.completed_at),
    createdAt: stringValue(row.created_at),
    deadline: nullableString(row.deadline),
    deletedAt: nullableString(row.deleted_at),
    exerciseId: nullableString(row.exercise_id),
    id: stringValue(row.id),
    metric: stringValue(row.metric) as Goal['metric'],
    status: stringValue(row.status) as Goal['status'],
    targetValue: numberValue(row.target_value),
    title: stringValue(row.title),
    type: stringValue(row.type) as Goal['type'],
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toGoalProgressEvent(row: Row): GoalProgressEvent {
  return {
    goalId: stringValue(row.goal_id),
    id: stringValue(row.id),
    measuredValue: numberValue(row.measured_value),
    progressPercent: numberValue(row.progress_percent),
    recordedAt: stringValue(row.recorded_at),
    sourceId: nullableString(row.source_id),
    sourceType: stringValue(row.source_type) as GoalProgressEvent['sourceType'],
  };
}

function toAchievement(row: Row): Achievement {
  return {
    achievedAt: stringValue(row.achieved_at),
    achievementType: stringValue(
      row.achievement_type,
    ) as Achievement['achievementType'],
    createdAt: stringValue(row.created_at),
    id: stringValue(row.id),
    metadata: jsonValue(row.metadata_json, {}),
    userId: stringValue(row.user_id),
  };
}

function toNotification(row: Row): Notification {
  return {
    archivedAt: nullableString(row.archived_at),
    body: stringValue(row.body),
    createdAt: stringValue(row.created_at),
    data: nullableJsonValue(row.data_json),
    dedupeKey: stringValue(row.dedupe_key),
    deliveryStatus: stringValue(
      row.delivery_status,
    ) as Notification['deliveryStatus'],
    expiresAt: nullableString(row.expires_at),
    id: stringValue(row.id),
    readAt: nullableString(row.read_at),
    scheduledFor: stringValue(row.scheduled_for),
    title: stringValue(row.title),
    type: stringValue(row.type) as Notification['type'],
    userId: stringValue(row.user_id),
  };
}

function toNotificationPreferences(row: Row): NotificationPreferences {
  return {
    achievementsEnabled: booleanValue(row.achievements_enabled),
    createdAt: stringValue(row.created_at),
    frequencyMode: stringValue(
      row.frequency_mode,
    ) as NotificationPreferences['frequencyMode'],
    goalsEnabled: booleanValue(row.goals_enabled),
    hydrationEnabled: booleanValue(row.hydration_enabled),
    id: stringValue(row.id),
    inactivityEnabled: booleanValue(row.inactivity_enabled),
    nutritionEnabled: booleanValue(row.nutrition_enabled),
    personalRecordsEnabled: booleanValue(row.prs_enabled),
    progressEnabled: booleanValue(row.progress_enabled),
    pushEnabled: booleanValue(row.push_enabled),
    quietHoursEnd: nullableString(row.quiet_hours_end),
    quietHoursStart: nullableString(row.quiet_hours_start),
    reportsEnabled: booleanValue(row.reports_enabled),
    timezoneOffsetMinutes: numberValue(row.timezone_offset_minutes),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
    workoutsEnabled: booleanValue(row.workouts_enabled),
  };
}

function toPushDevice(row: Row): PushDeviceRegistration {
  return {
    createdAt: stringValue(row.created_at),
    devicePushToken: nullableString(row.device_push_token),
    disabledAt: nullableString(row.disabled_at),
    expoPushToken: stringValue(row.expo_push_token),
    id: stringValue(row.id),
    platform: stringValue(row.platform) as PushDeviceRegistration['platform'],
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toMeal(row: Row): Meal {
  return {
    carbsG: nullableNumber(row.carbs_g),
    consumedAt: stringValue(row.consumed_at),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    fatG: nullableNumber(row.fat_g),
    id: stringValue(row.id),
    kcal: numberValue(row.kcal),
    mealType: stringValue(row.meal_type) as Meal['mealType'],
    notes: nullableString(row.notes),
    photoId: nullableString(row.photo_id),
    proteinG: nullableNumber(row.protein_g),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toHydrationEntry(row: Row): HydrationEntry {
  return {
    amountMl: numberValue(row.amount_ml),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    id: stringValue(row.id),
    recordedAt: stringValue(row.recorded_at),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toHydrationGoal(row: Row): HydrationGoal {
  return {
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    id: stringValue(row.id),
    targetMl: numberValue(row.target_ml),
    updatedAt: stringValue(row.updated_at),
    userId: stringValue(row.user_id),
  };
}

function toMedia(row: Row): Media {
  return {
    checksum: nullableString(row.checksum),
    createdAt: stringValue(row.created_at),
    deletedAt: nullableString(row.deleted_at),
    id: stringValue(row.id),
    localUri: nullableString(row.local_uri),
    mimeType: stringValue(row.mime_type),
    remoteUrl: nullableString(row.remote_url),
    sizeBytes: nullableNumber(row.size_bytes),
    updatedAt: stringValue(row.updated_at),
    uploadStatus: stringValue(row.upload_status) as Media['uploadStatus'],
    userId: stringValue(row.user_id),
  };
}

function toMediaUpload(row: Row): MediaUpload {
  return {
    attemptCount: numberValue(row.attempt_count),
    createdAt: stringValue(row.created_at),
    id: stringValue(row.id),
    lastAttemptAt: nullableString(row.last_attempt_at),
    lastError: nullableString(row.last_error),
    mediaId: stringValue(row.media_id),
    nextAttemptAt: stringValue(row.next_attempt_at),
    status: stringValue(row.status) as MediaUpload['status'],
    updatedAt: stringValue(row.updated_at),
  };
}

function toSyncOperation(row: Row): SyncOperation {
  return {
    attemptCount: numberValue(row.attempt_count),
    createdAt: stringValue(row.created_at),
    entityId: stringValue(row.entity_id),
    entityType: stringValue(row.entity_type) as SyncOperation['entityType'],
    lastAttemptAt: nullableString(row.last_attempt_at),
    lastError: nullableString(row.last_error),
    operationId: stringValue(row.operation_id),
    operationType: stringValue(
      row.operation_type,
    ) as SyncOperation['operationType'],
    payload: jsonValue(row.payload_json, {}),
    status: stringValue(row.status) as SyncOperation['status'],
  };
}

function toSyncState(row: Row): SyncState {
  return {
    key: stringValue(row.key),
    lastError: nullableString(row.last_error),
    lastSuccessAt: nullableString(row.last_success_at),
    scope: stringValue(row.scope),
    serverCursor: nullableString(row.server_cursor),
  };
}

function first<T>(items: T[]) {
  return items[0] ?? null;
}

function placeholders(count: number) {
  return Array.from({ length: count }, () => '?').join(', ');
}

function whereClause(conditions: string[]) {
  return conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
}

function flag(value: boolean) {
  return value ? 1 : 0;
}

function booleanValue(value: unknown) {
  return value === true || value === 1;
}

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function nullableNumber(value: unknown) {
  return value === null || value === undefined ? null : numberValue(value);
}

function stringValue(value: unknown) {
  return String(value ?? '');
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function nullableJsonValue(value: unknown) {
  return value === null || value === undefined
    ? null
    : jsonValue<Record<string, number | string>>(value, {});
}
