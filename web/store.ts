import { useSyncExternalStore } from 'react';
import { systemExercises } from '../src/data/seeds/systemExercises';
import type { Exercise } from '../src/domain/training/entities';
import {
  loginWithGoogle,
  logoutSupabase,
  onAuthStateChanged,
  supabaseSetDocument,
  supabaseDeleteDocument,
  supabaseFetchCollection,
  supabaseSetProfile,
  supabaseGetProfile,
  type AppUser,
} from './supabase';
import { uid } from './lib/id';
import {
  IDLE_REST_TIMER,
  adjustRest,
  normalizeRestTimer,
  startRest,
  toggleRestPause,
} from './lib/rest';
import {
  buildCompletedWorkout,
  computeStreakWeeks,
  dedupeRecords,
  describeRecord,
  detectPersonalRecords,
  goalCurrentValue,
  hydrationDate,
  mealDate,
  mergeById,
  previousSetsFor,
  repairExerciseRefs,
  replayRecords,
  sortByCompletedDesc,
} from './lib/training';
import { removeUntouchedSamples } from './lib/samples';
import {
  moveFolder,
  nextFolderOrder,
  placeRoutine,
  reorderFolder,
  sortFolders,
} from './lib/folders';
import { suggestGymId } from './lib/gyms';
import type { ImportPlan, MeasurementPlan } from './lib/importCsv';
import type {
  ActiveExerciseSession,
  ActiveWorkoutState,
  BodyMeasurement,
  CompletedWorkout,
  GoalItem,
  Gym,
  HydrationLog,
  MealItem,
  NotificationPrefs,
  PersonalRecordItem,
  RestTimerState,
  RoutineFolder,
  SetEntry,
  SetType,
  SyncStatus,
  WorkoutTemplateItem,
  UserProfile,
} from './lib/types';

export type {
  ActiveExerciseSession,
  ActiveWorkoutState,
  CompletedWorkout,
  GoalItem,
  HydrationLog,
  MealItem,
  PersonalRecordItem,
  RestTimerState,
  SetEntry,
  WorkoutTemplateItem,
} from './lib/types';

const DEFAULT_REST_SECONDS = 90;

/* ------------------------------------------------------------------ */
/* State shape                                                         */
/* ------------------------------------------------------------------ */

type RemoteCollection =
  | 'templates'
  | 'history'
  | 'prs'
  | 'goals'
  | 'hydration'
  | 'meals'
  | 'custom_exercises'
  | 'measurements'
  | 'folders'
  | 'gyms';

interface PersistedData {
  templates: WorkoutTemplateItem[];
  /** Routine folders, in display order. */
  folders: RoutineFolder[];
  /** Places where the person trains, by name. */
  gyms: Gym[];
  history: CompletedWorkout[];
  prs: PersonalRecordItem[];
  goals: GoalItem[];
  hydrationTargetMl: number;
  hydrationLogs: HydrationLog[];
  nutritionTargetKcal: number;
  nutritionTargetProtein: number;
  nutritionTargetCarbs: number;
  nutritionTargetFat: number;
  meals: MealItem[];
  /** Body measurements, newest first. */
  measurements: BodyMeasurement[];
  activeWorkout: ActiveWorkoutState | null;
  favorites: string[];
  customExercises: Exercise[];
  userProfile: UserProfile;
  notificationPrefs: NotificationPrefs;
  restTimer: RestTimerState;
  social: { joinedChallenges: string[]; acceptedFriends: string[] };
  /** Deletions not yet confirmed by the server; keeps sync from resurrecting them. */
  pendingDeletes: string[];
  lastSyncedAt: string | null;
}

interface RuntimeState {
  currentUser: AppUser | null;
  isAuthLoading: boolean;
  isSyncingWithFirestore: boolean;
  syncStatus: SyncStatus;
  isOnline: boolean;
  hasOnboarded: boolean;
  /** Error from a redirect sign-in, shown once after the page reloads. */
  loginError: unknown;
}

export type AppState = PersistedData & RuntimeState;

const ONBOARDING_KEY = 'forgeflow_v2_welcome_done';

function storageKey(userId: string | null | undefined): string {
  return userId ? `forgeflow_v2_user_${userId}` : 'forgeflow_v2_guest';
}

function defaultProfile(user: AppUser | null): UserProfile {
  return {
    name: user?.displayName || (user ? 'Atleta ForgeFlow' : 'Atleta'),
    username: user?.email ? user.email.split('@')[0] : 'atleta',
    email: user?.email || '',
    bio: '',
    // Unknown until the person fills them in (0 / '' = not informed).
    experience: '',
    weightKg: 0,
    heightCm: 0,
    mainGoal: '',
    streakWeeks: 0,
    // Present (empty) so a photo saved on another device is read on sync.
    photoDataUrl: '',
  };
}

function defaultData(user: AppUser | null): PersistedData {
  return {
    // Every account starts empty: no sample routines, goals or favorites.
    templates: [],
    folders: [],
    gyms: [],
    history: [],
    prs: [],
    goals: [],
    hydrationTargetMl: 2500,
    hydrationLogs: [],
    nutritionTargetKcal: 2300,
    nutritionTargetProtein: 160,
    nutritionTargetCarbs: 240,
    nutritionTargetFat: 70,
    meals: [],
    measurements: [],
    activeWorkout: null,
    favorites: [],
    customExercises: [],
    userProfile: defaultProfile(user),
    notificationPrefs: {
      workoutReminders: true,
      restTimerAlerts: true,
      hydrationAlerts: true,
      weeklyReport: true,
    },
    restTimer: IDLE_REST_TIMER,
    social: { joinedChallenges: [], acceptedFriends: [] },
    pendingDeletes: [],
    lastSyncedAt: null,
  };
}

function sortGyms(gyms: Gym[]): Gym[] {
  return [...gyms].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function asArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function measurementDate(item: BodyMeasurement): Date | null {
  const date = new Date(item.measuredAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function byDateDesc<T>(items: T[], getDate: (item: T) => Date | null): T[] {
  return [...items].sort(
    (a, b) => (getDate(b)?.getTime() ?? 0) - (getDate(a)?.getTime() ?? 0),
  );
}

const systemNames = new Map(
  systemExercises.map((exercise) => [exercise.id, exercise.name]),
);

function catalogLookup(customExercises: Exercise[]) {
  const custom = new Map(
    customExercises.map((exercise) => [exercise.id, exercise.name]),
  );
  return (id: string) => systemNames.get(id) ?? custom.get(id);
}

/** Reads and migrates data saved by any previous version of the app. */
function loadData(user: AppUser | null): PersistedData {
  const defaults = defaultData(user);
  let raw: Record<string, unknown> | null = null;
  try {
    const saved = localStorage.getItem(storageKey(user?.uid));
    raw = saved ? (JSON.parse(saved) as Record<string, unknown>) : null;
  } catch {
    raw = null;
  }
  if (!raw) return defaults;

  const social =
    (raw.social as PersistedData['social'] | undefined) ?? defaults.social;
  const customExercises = asArray<Exercise>(raw.customExercises, []);
  const repaired = repairExerciseRefs(
    asArray<WorkoutTemplateItem>(raw.templates, defaults.templates),
    asArray<PersonalRecordItem>(raw.prs, []),
    catalogLookup(customExercises),
  );
  const history = sortByCompletedDesc(
    asArray<CompletedWorkout>(raw.history, []),
  );
  const savedWorkout = (raw.activeWorkout as ActiveWorkoutState | null) ?? null;
  // Sessions saved before exercises had a key get one (drag to reorder).
  const activeWorkout = savedWorkout && {
    ...savedWorkout,
    exercises: savedWorkout.exercises.map((exercise) =>
      exercise.key ? exercise : { ...exercise, key: uid('ex') },
    ),
  };
  const { templates, goals } = removeUntouchedSamples(
    repaired.templates,
    asArray<GoalItem>(raw.goals, defaults.goals),
    history,
    activeWorkout?.templateId,
  );

  return {
    ...defaults,
    templates,
    folders: sortFolders(asArray<RoutineFolder>(raw.folders, [])),
    gyms: sortGyms(asArray<Gym>(raw.gyms, [])),
    history,
    prs: dedupeRecords(repaired.records),
    goals,
    hydrationTargetMl:
      Number(raw.hydrationTargetMl) || defaults.hydrationTargetMl,
    hydrationLogs: byDateDesc(
      asArray<HydrationLog>(raw.hydrationLogs, []),
      hydrationDate,
    ),
    nutritionTargetKcal:
      Number(raw.nutritionTargetKcal) || defaults.nutritionTargetKcal,
    nutritionTargetProtein:
      Number(raw.nutritionTargetProtein) || defaults.nutritionTargetProtein,
    nutritionTargetCarbs:
      Number(raw.nutritionTargetCarbs) || defaults.nutritionTargetCarbs,
    nutritionTargetFat:
      Number(raw.nutritionTargetFat) || defaults.nutritionTargetFat,
    meals: byDateDesc(asArray<MealItem>(raw.meals, []), mealDate),
    measurements: byDateDesc(
      asArray<BodyMeasurement>(raw.measurements, []),
      measurementDate,
    ),
    activeWorkout,
    favorites: asArray<string>(raw.favorites, defaults.favorites),
    customExercises,
    userProfile: {
      ...defaults.userProfile,
      ...((raw.userProfile as Partial<UserProfile>) ?? {}),
    },
    notificationPrefs: {
      ...defaults.notificationPrefs,
      ...((raw.notificationPrefs as Partial<NotificationPrefs>) ?? {}),
    },
    restTimer: normalizeRestTimer(raw.restTimer),
    social: {
      joinedChallenges: asArray<string>(social.joinedChallenges, []),
      acceptedFriends: asArray<string>(social.acceptedFriends, []),
    },
    pendingDeletes: asArray<string>(raw.pendingDeletes, []),
    lastSyncedAt:
      typeof raw.lastSyncedAt === 'string' ? raw.lastSyncedAt : null,
  };
}

function pickPersisted(source: AppState): PersistedData {
  return {
    templates: source.templates,
    folders: source.folders,
    gyms: source.gyms,
    history: source.history,
    prs: source.prs,
    goals: source.goals,
    hydrationTargetMl: source.hydrationTargetMl,
    hydrationLogs: source.hydrationLogs,
    nutritionTargetKcal: source.nutritionTargetKcal,
    nutritionTargetProtein: source.nutritionTargetProtein,
    nutritionTargetCarbs: source.nutritionTargetCarbs,
    nutritionTargetFat: source.nutritionTargetFat,
    meals: source.meals,
    measurements: source.measurements,
    activeWorkout: source.activeWorkout,
    favorites: source.favorites,
    customExercises: source.customExercises,
    userProfile: source.userProfile,
    notificationPrefs: source.notificationPrefs,
    restTimer: source.restTimer,
    social: source.social,
    pendingDeletes: source.pendingDeletes,
    lastSyncedAt: source.lastSyncedAt,
  };
}

function readOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOnboarded(value: boolean) {
  try {
    if (value) localStorage.setItem(ONBOARDING_KEY, '1');
    else localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // Storage unavailable (private mode): onboarding simply shows again.
  }
}

/* ------------------------------------------------------------------ */
/* Store core                                                          */
/* ------------------------------------------------------------------ */

let state: AppState = {
  ...loadData(null),
  currentUser: null,
  isAuthLoading: true,
  isSyncingWithFirestore: false,
  syncStatus: 'idle',
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  hasOnboarded: readOnboarded(),
  loginError: null,
};

const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistNow() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    localStorage.setItem(
      storageKey(state.currentUser?.uid),
      JSON.stringify(pickPersisted(state)),
    );
  } catch (error) {
    console.warn('ForgeFlow: não foi possível salvar localmente.', error);
  }
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 250);
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(
  patch: Partial<AppState>,
  options: { persist?: boolean } = {},
) {
  state = { ...state, ...patch };
  if (options.persist !== false) schedulePersist();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

export function getState(): AppState {
  return state;
}

/* ------------------------------------------------------------------ */
/* Cloud sync (Supabase)                                               */
/* ------------------------------------------------------------------ */

function cleanData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item !== null && typeof item === 'object' ? cleanData(item) : item,
    ) as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const clean: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (entry !== undefined) clean[key] = cleanData(entry);
    }
    return clean as T;
  }
  return value;
}

function markSyncError(error: unknown) {
  console.warn('ForgeFlow sync:', error);
  if (state.syncStatus !== 'error')
    setState({ syncStatus: 'error' }, { persist: false });
}

/** Fire-and-forget cloud write; the local state is already the source of truth. */
function remoteSet(
  path: [RemoteCollection, string] | [],
  data: object,
  _merge = false,
) {
  const user = state.currentUser;
  if (!user) return;
  const payload = cleanData({
    ...data,
    userId: user.uid,
    updatedAt: new Date().toISOString(),
  });
  if (path.length === 0) {
    supabaseSetProfile(user.uid, payload).catch(markSyncError);
  } else {
    supabaseSetDocument(path[0], path[1], user.uid, payload).catch(
      markSyncError,
    );
  }
}

function remoteDelete(collectionName: RemoteCollection, id: string) {
  const user = state.currentUser;
  if (!user) return;
  setState({ pendingDeletes: [...state.pendingDeletes, id] });
  supabaseDeleteDocument(collectionName, id, user.uid)
    .then(() => {
      setState({
        pendingDeletes: state.pendingDeletes.filter(
          (pending) => pending !== id,
        ),
      });
    })
    .catch(markSyncError);
}

async function fetchCollection<T>(
  user: AppUser,
  name: RemoteCollection,
): Promise<T[]> {
  return supabaseFetchCollection<T>(name, user.uid);
}

let syncInFlight: Promise<void> | null = null;

/**
 * Removes sample routines and goals created by earlier versions while they
 * are still untouched, here and in the cloud (a sync would bring them back).
 */
function dropUntouchedSamples() {
  const cleanup = removeUntouchedSamples(
    state.templates,
    state.goals,
    state.history,
    state.activeWorkout?.templateId,
  );
  if (
    cleanup.removedTemplateIds.length === 0 &&
    cleanup.removedGoalIds.length === 0
  )
    return;
  setState({ templates: cleanup.templates, goals: cleanup.goals });
  cleanup.removedTemplateIds.forEach((id) => remoteDelete('templates', id));
  cleanup.removedGoalIds.forEach((id) => remoteDelete('goals', id));
}

function syncFromSupabase(user: AppUser): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = runSync(user).finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

const syncFromFirestore = syncFromSupabase;

async function runSync(user: AppUser) {
  const stillCurrent = () => state.currentUser?.uid === user.uid;
  if (!stillCurrent()) return;
  setState(
    { isSyncingWithFirestore: true, syncStatus: 'syncing' },
    { persist: false },
  );
  let failed = false;

  try {
    const profile = await supabaseGetProfile(user.uid);
    if (!stillCurrent()) return;
    if (profile) {
      setState({
        userProfile: {
          ...state.userProfile,
          ...Object.fromEntries(
            Object.entries(profile).filter(([key]) => key in state.userProfile),
          ),
          name:
            (profile.name as string) ||
            user.displayName ||
            state.userProfile.name,
          email:
            (profile.email as string) || user.email || state.userProfile.email,
        },
      });
    } else {
      remoteSet([], {
        ...state.userProfile,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    failed = true;
    markSyncError(error);
  }

  const deleted = new Set(state.pendingDeletes);

  async function syncList<T extends { id: string }>(
    name: RemoteCollection,
    read: () => T[],
    write: (items: T[]) => Partial<AppState>,
  ) {
    try {
      const remote = await fetchCollection<T>(user, name);
      if (!stillCurrent()) return;
      const { merged, localOnly } = mergeById(read(), remote, deleted);
      setState(write(merged));
      localOnly.forEach((item) => remoteSet([name, item.id], item));
    } catch (error) {
      failed = true;
      markSyncError(error);
    }
  }

  await syncList<Gym>(
    'gyms',
    () => state.gyms,
    (items) => ({ gyms: sortGyms(items) }),
  );
  await syncList<RoutineFolder>(
    'folders',
    () => state.folders,
    (items) => ({ folders: sortFolders(items) }),
  );
  await syncList<WorkoutTemplateItem>(
    'templates',
    () => state.templates,
    (items) => ({ templates: items }),
  );
  await syncList<CompletedWorkout>(
    'history',
    () => state.history,
    (items) => ({ history: sortByCompletedDesc(items) }),
  );
  await syncList<PersonalRecordItem>(
    'prs',
    () => state.prs,
    (items) => ({ prs: dedupeRecords(items) }),
  );
  await syncList<GoalItem>(
    'goals',
    () => state.goals,
    (items) => ({ goals: items }),
  );
  await syncList<HydrationLog>(
    'hydration',
    () => state.hydrationLogs,
    (items) => ({
      hydrationLogs: byDateDesc(items, hydrationDate),
    }),
  );
  await syncList<MealItem>(
    'meals',
    () => state.meals,
    (items) => ({ meals: byDateDesc(items, mealDate) }),
  );
  await syncList<Exercise>(
    'custom_exercises',
    () => state.customExercises,
    (items) => ({ customExercises: items }),
  );
  await syncList<BodyMeasurement>(
    'measurements',
    () => state.measurements,
    (items) => ({ measurements: byDateDesc(items, measurementDate) }),
  );

  if (!stillCurrent()) return;

  // Cloud copies written by older versions may still carry wrong exercise ids.
  const repaired = repairExerciseRefs(
    state.templates,
    state.prs,
    catalogLookup(state.customExercises),
  );
  if (
    repaired.changedTemplates.length > 0 ||
    repaired.changedRecords.length > 0
  ) {
    setState({ templates: repaired.templates, prs: repaired.records });
    repaired.changedTemplates.forEach((template) =>
      remoteSet(['templates', template.id], template),
    );
    repaired.changedRecords.forEach((record) =>
      remoteSet(['prs', record.id], record),
    );
  }

  if (!failed) dropUntouchedSamples();

  setState({
    isSyncingWithFirestore: false,
    syncStatus: failed ? 'error' : 'idle',
    lastSyncedAt: failed ? state.lastSyncedAt : new Date().toISOString(),
  });
}

/* ------------------------------------------------------------------ */
/* Auth lifecycle                                                      */
/* ------------------------------------------------------------------ */

function switchUser(user: AppUser | null) {
  persistNow();
  state = {
    ...loadData(user),
    currentUser: user,
    isAuthLoading: false,
    isSyncingWithFirestore: false,
    syncStatus: 'idle',
    isOnline: state.isOnline,
    hasOnboarded: user ? true : state.hasOnboarded,
    loginError: state.loginError,
  };
  if (user) writeOnboarded(true);
  emit();
}

let authInitialized = false;

function initAuth() {
  if (authInitialized || typeof window === 'undefined') return;
  authInitialized = true;

  // Never leave the splash screen up if the auth SDK cannot answer.
  const fallback = setTimeout(() => {
    if (state.isAuthLoading)
      setState({ isAuthLoading: false }, { persist: false });
  }, 5000);

  onAuthStateChanged((user) => {
    clearTimeout(fallback);
    const previousUid = state.currentUser?.uid ?? null;
    const nextUid = user?.uid ?? null;
    if (previousUid !== nextUid) {
      switchUser(user);
    } else if (state.isAuthLoading) {
      setState({ isAuthLoading: false, currentUser: user }, { persist: false });
    }
    if (user) void syncFromSupabase(user);
  });

  window.addEventListener('online', () => {
    setState({ isOnline: true }, { persist: false });
    if (state.currentUser && state.syncStatus === 'error')
      void syncFromFirestore(state.currentUser);
  });
  window.addEventListener('offline', () =>
    setState({ isOnline: false }, { persist: false }),
  );
  window.addEventListener('pagehide', persistNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persistNow();
  });
}

initAuth();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

let exerciseCache: {
  custom: Exercise[];
  all: Exercise[];
  byId: Map<string, Exercise>;
} | null = null;

function exerciseIndex() {
  if (!exerciseCache || exerciseCache.custom !== state.customExercises) {
    const all = [...systemExercises, ...state.customExercises];
    exerciseCache = {
      custom: state.customExercises,
      all,
      byId: new Map(all.map((ex) => [ex.id, ex])),
    };
  }
  return exerciseCache;
}

export function findExercise(id: string): Exercise | undefined {
  return exerciseIndex().byId.get(id);
}

function updateActive(
  mutate: (workout: ActiveWorkoutState) => ActiveWorkoutState,
) {
  if (!state.activeWorkout) return;
  setState({ activeWorkout: mutate(state.activeWorkout) });
}

function updateExercise(
  index: number,
  mutate: (exercise: ActiveExerciseSession) => ActiveExerciseSession,
) {
  updateActive((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise, i) =>
      i === index ? mutate(exercise) : exercise,
    ),
  }));
}

function renumber(sets: SetEntry[]): SetEntry[] {
  return sets.map((set, i) =>
    set.setNumber === i + 1 ? set : { ...set, setNumber: i + 1 },
  );
}

function newSet(
  setNumber: number,
  setType: SetType,
  weightKg: number,
  repetitions: number,
): SetEntry {
  return {
    id: uid('set'),
    setNumber,
    setType,
    weightKg,
    repetitions,
    completed: false,
  };
}

function sessionFromExercise(
  exercise: Exercise,
  restSeconds = DEFAULT_REST_SECONDS,
): ActiveExerciseSession {
  const previous = previousSetsFor(state.history, exercise.id, exercise.name);
  const sets = previous?.length
    ? previous.map((set, i) =>
        newSet(i + 1, set.type, set.weightKg, set.repetitions),
      )
    : [newSet(1, 'working', 0, 0)];
  return {
    key: uid('ex'),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    primaryMuscleGroup: exercise.primaryMuscleGroup,
    equipment: exercise.equipment,
    restSeconds,
    sets,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export interface FinishResult {
  workout: CompletedWorkout;
  records: PersonalRecordItem[];
  goalsReached: GoalItem[];
  workoutNumber: number;
}

/**
 * Stores a new history and rebuilds records from it. Records tied to a
 * replayable workout come from the replay; legacy records (no per-set data)
 * are kept. Only changed documents are written to the cloud.
 */
function commitHistory(
  nextHistory: CompletedWorkout[],
  removedIds: Set<string>,
  createdIds: Set<string>,
): { prs: PersonalRecordItem[] } {
  const { records: replayed, achievedByWorkout } = replayRecords(nextHistory);
  const legacy = state.prs.filter(
    (record) =>
      !record.workoutId ||
      (!achievedByWorkout.has(record.workoutId) &&
        !removedIds.has(record.workoutId)),
  );
  const prs = dedupeRecords([...replayed, ...legacy]);
  const history = nextHistory.map((workout) => {
    const achieved = achievedByWorkout.get(workout.id);
    if (!achieved) return workout;
    const prsAchieved = achieved.map(describeRecord);
    return prsAchieved.join('|') === workout.prsAchieved.join('|')
      ? workout
      : { ...workout, prsAchieved };
  });

  const previousWorkouts = new Map(state.history.map((w) => [w.id, w]));
  const previousRecords = new Map(state.prs.map((r) => [r.id, r]));
  const keptRecordIds = new Set(prs.map((record) => record.id));
  const removedRecords = state.prs.filter(
    (record) => !keptRecordIds.has(record.id),
  );

  setState({ history, prs });

  const now = new Date().toISOString();
  history.forEach((workout) => {
    if (createdIds.has(workout.id))
      remoteSet(['history', workout.id], { ...workout, createdAt: now });
    else if (previousWorkouts.get(workout.id) !== workout)
      remoteSet(['history', workout.id], workout, true);
  });
  prs.forEach((record) => {
    const previous = previousRecords.get(record.id);
    if (
      !previous ||
      previous.value !== record.value ||
      previous.workoutId !== record.workoutId
    )
      remoteSet(['prs', record.id], record);
  });
  removedRecords.forEach((record) => remoteDelete('prs', record.id));
  return { prs };
}

/** The profile weight follows the latest weighed-in measurement. */
function syncProfileWeight() {
  const latest = state.measurements.find((item) => (item.weightKg ?? 0) > 0);
  if (latest?.weightKg && latest.weightKg !== state.userProfile.weightKg)
    actions.updateProfile({ weightKg: latest.weightKg });
}

export const actions = {
  /* Auth */
  login: async () => {
    // State switching happens in onAuthStateChanged, which fires for every
    // sign-in; handling it here as well used to race and sync twice.
    await loginWithGoogle();
  },

  logout: async () => {
    persistNow();
    writeOnboarded(false);
    setState({ hasOnboarded: false }, { persist: false });
    await logoutSupabase();
    switchUser(null);
  },

  completeOnboarding: () => {
    writeOnboarded(true);
    setState({ hasOnboarded: true }, { persist: false });
  },

  clearLoginError: () => {
    setState({ loginError: null }, { persist: false });
  },

  retrySync: () => {
    if (state.currentUser) void syncFromFirestore(state.currentUser);
  },

  /* Active workout */
  startWorkoutFromTemplate: (templateId: string): boolean => {
    const template = state.templates.find((t) => t.id === templateId);
    if (!template) return false;
    const exercises: ActiveExerciseSession[] = template.exercises.map(
      (item) => {
        const catalog = findExercise(item.exerciseId);
        return {
          key: uid('ex'),
          exerciseId: item.exerciseId,
          exerciseName: item.exerciseName,
          primaryMuscleGroup: catalog?.primaryMuscleGroup ?? 'Geral',
          equipment: catalog?.equipment ?? null,
          restSeconds: item.restSeconds ?? DEFAULT_REST_SECONDS,
          sets: Array.from({ length: Math.max(1, item.targetSets) }, (_, i) =>
            newSet(
              i + 1,
              'working',
              item.targetWeightKg ?? 0,
              item.targetReps ?? 0,
            ),
          ),
        };
      },
    );
    setState({
      activeWorkout: {
        id: uid('session'),
        name: template.name,
        templateId: template.id,
        startedAt: new Date().toISOString(),
        exercises,
      },
      restTimer: IDLE_REST_TIMER,
    });
    return true;
  },

  startEmptyWorkout: () => {
    setState({
      activeWorkout: {
        id: uid('session'),
        name: 'Treino livre',
        startedAt: new Date().toISOString(),
        exercises: [],
      },
      restTimer: IDLE_REST_TIMER,
    });
  },

  renameActiveWorkout: (name: string) => {
    updateActive((workout) => ({ ...workout, name }));
  },

  addExerciseToActiveWorkout: (exercise: Exercise) => {
    updateActive((workout) => ({
      ...workout,
      exercises: [...workout.exercises, sessionFromExercise(exercise)],
    }));
  },

  addExercisesToActiveWorkout: (exercises: Exercise[]) => {
    updateActive((workout) => ({
      ...workout,
      exercises: [
        ...workout.exercises,
        ...exercises.map((exercise) => sessionFromExercise(exercise)),
      ],
    }));
  },

  removeExerciseFromActiveWorkout: (index: number) => {
    updateActive((workout) => ({
      ...workout,
      exercises: workout.exercises.filter((_, i) => i !== index),
    }));
  },

  /** Moves an exercise of the session from one position to another (drag). */
  reorderActiveExercise: (from: number, to: number) => {
    updateActive((workout) => {
      const { length } = workout.exercises;
      if (from === to || from < 0 || to < 0 || from >= length || to >= length)
        return workout;
      const exercises = [...workout.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return { ...workout, exercises };
    });
  },

  moveExerciseInActiveWorkout: (index: number, direction: -1 | 1) => {
    updateActive((workout) => {
      const target = index + direction;
      if (target < 0 || target >= workout.exercises.length) return workout;
      const exercises = [...workout.exercises];
      [exercises[index], exercises[target]] = [
        exercises[target],
        exercises[index],
      ];
      return { ...workout, exercises };
    });
  },

  setExerciseNotes: (index: number, notes: string) => {
    updateExercise(index, (exercise) => ({ ...exercise, notes }));
  },

  setExerciseRest: (index: number, restSeconds: number) => {
    updateExercise(index, (exercise) => ({ ...exercise, restSeconds }));
  },

  addSetToActiveExercise: (
    exerciseIndex: number,
    setType: SetType = 'working',
  ) => {
    updateExercise(exerciseIndex, (exercise) => {
      const last =
        [...exercise.sets].reverse().find((set) => set.setType === setType) ??
        exercise.sets.at(-1);
      const created = newSet(
        exercise.sets.length + 1,
        setType,
        last?.weightKg ?? 0,
        last?.repetitions ?? 0,
      );
      // Warm-ups go before the working sets, like on a real session.
      const sets =
        setType === 'warmup'
          ? [
              ...exercise.sets.filter((set) => set.setType === 'warmup'),
              created,
              ...exercise.sets.filter((set) => set.setType !== 'warmup'),
            ]
          : [...exercise.sets, created];
      return { ...exercise, sets: renumber(sets) };
    });
  },

  removeSetFromActiveExercise: (exerciseIndex: number, setIndex: number) => {
    updateExercise(exerciseIndex, (exercise) => ({
      ...exercise,
      sets: renumber(exercise.sets.filter((_, i) => i !== setIndex)),
    }));
  },

  /** Puts back a set removed by mistake (undo), found by exercise key. */
  restoreSetToActiveExercise: (
    exerciseKey: string,
    setIndex: number,
    set: SetEntry,
  ) => {
    updateActive((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise) => {
        if (exercise.key !== exerciseKey) return exercise;
        if (exercise.sets.some((item) => item.id === set.id)) return exercise;
        const sets = [...exercise.sets];
        sets.splice(Math.min(setIndex, sets.length), 0, set);
        return { ...exercise, sets: renumber(sets) };
      }),
    }));
  },

  /** Returns true when the change completed a set. */
  updateSetActiveWorkout: (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<SetEntry>,
  ): boolean => {
    const exercise = state.activeWorkout?.exercises[exerciseIndex];
    const current = exercise?.sets[setIndex];
    if (!exercise || !current) return false;
    const completedNow = !current.completed && updates.completed === true;

    updateExercise(exerciseIndex, (ex) => ({
      ...ex,
      sets: ex.sets.map((set, i) =>
        i === setIndex ? { ...set, ...updates } : set,
      ),
    }));

    const rest = exercise.restSeconds ?? DEFAULT_REST_SECONDS;
    if (completedNow && rest > 0) {
      setState({
        restTimer: startRest(rest, Date.now(), exercise.exerciseName),
      });
    }
    return completedNow;
  },

  finishActiveWorkout: (): FinishResult | null => {
    const active = state.activeWorkout;
    if (!active) return null;
    const now = new Date();
    const workout = buildCompletedWorkout(active, now, uid('hist'));
    if (workout.exercises.length === 0) return null;
    // Pre-filled with the usual gym; the summary lets the person change it.
    const gymId = suggestGymId(state.history, state.gyms, active.templateId);
    if (gymId) workout.gymId = gymId;

    const { records, achieved, replacedIds } = detectPersonalRecords(
      workout,
      state.prs,
    );
    workout.prsAchieved = achieved.map(describeRecord);
    const history = sortByCompletedDesc([workout, ...state.history]);

    const goalsReached: GoalItem[] = [];
    const goals = state.goals.map((goal) => {
      if (goal.status !== 'active') return goal;
      const current = goalCurrentValue(goal, history, records, now);
      if (current < goal.targetValue) return goal;
      const reached: GoalItem = {
        ...goal,
        currentValue: current,
        status: 'completed',
      };
      goalsReached.push(reached);
      return reached;
    });

    setState({
      history,
      prs: records,
      goals,
      activeWorkout: null,
      restTimer: IDLE_REST_TIMER,
    });

    remoteSet(['history', workout.id], {
      ...workout,
      createdAt: now.toISOString(),
    });
    achieved.forEach((record) => remoteSet(['prs', record.id], record));
    replacedIds.forEach((id) => remoteDelete('prs', id));
    goalsReached.forEach((goal) => remoteSet(['goals', goal.id], goal, true));

    return {
      workout,
      records: achieved,
      goalsReached,
      workoutNumber: history.length,
    };
  },

  discardActiveWorkout: () => {
    setState({ activeWorkout: null, restTimer: IDLE_REST_TIMER });
  },

  /* Rest timer */
  startRestTimer: (seconds: number = DEFAULT_REST_SECONDS, label?: string) => {
    setState({ restTimer: startRest(seconds, Date.now(), label) });
  },

  pauseResumeRestTimer: () => {
    setState({ restTimer: toggleRestPause(state.restTimer, Date.now()) });
  },

  addRestTime: (seconds: number) => {
    setState({ restTimer: adjustRest(state.restTimer, seconds, Date.now()) });
  },

  stopRestTimer: () => {
    setState({
      restTimer: {
        ...IDLE_REST_TIMER,
        totalSeconds: state.restTimer.totalSeconds,
      },
    });
  },

  /* Routines */
  createTemplate: (template: Omit<WorkoutTemplateItem, 'id'>): string => {
    const created: WorkoutTemplateItem = { ...template, id: uid('tmpl') };
    setState({ templates: [...state.templates, created] });
    remoteSet(['templates', created.id], {
      ...created,
      createdAt: new Date().toISOString(),
    });
    return created.id;
  },

  updateTemplate: (id: string, updates: Partial<WorkoutTemplateItem>) => {
    const existing = state.templates.find((t) => t.id === id);
    if (!existing) return;
    const updated: WorkoutTemplateItem = { ...existing, ...updates, id };
    // `folderId: undefined` means "no folder": drop the key so the full
    // write below also clears it in the cloud (a merge would keep it).
    if (!updated.folderId) delete updated.folderId;
    setState({
      templates: state.templates.map((t) => (t.id === id ? updated : t)),
    });
    remoteSet(['templates', id], updated);
  },

  moveTemplateToFolder: (id: string, folderId: string | null) => {
    actions.updateTemplate(id, { folderId: folderId ?? undefined });
  },

  /* Gyms */
  createGym: (name: string): string => {
    const gym: Gym = {
      id: uid('gym'),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setState({ gyms: sortGyms([...state.gyms, gym]) });
    remoteSet(['gyms', gym.id], gym);
    return gym.id;
  },

  renameGym: (id: string, name: string) => {
    const existing = state.gyms.find((gym) => gym.id === id);
    const trimmed = name.trim();
    if (!existing || !trimmed) return;
    const updated = { ...existing, name: trimmed };
    setState({
      gyms: sortGyms(state.gyms.map((gym) => (gym.id === id ? updated : gym))),
    });
    remoteSet(['gyms', id], updated);
  },

  /**
   * Deletes a gym. Workouts keep their (now unknown) `gymId` and simply show
   * no gym, so deleting never rewrites the whole history.
   */
  deleteGym: (id: string) => {
    setState({ gyms: state.gyms.filter((gym) => gym.id !== id) });
    remoteDelete('gyms', id);
  },

  /** Sets (or clears, with `null`) the gym of a finished workout. */
  setWorkoutGym: (workoutId: string, gymId: string | null) => {
    const existing = state.history.find((workout) => workout.id === workoutId);
    if (!existing || (existing.gymId ?? null) === gymId) return;
    const updated: CompletedWorkout = { ...existing };
    if (gymId) updated.gymId = gymId;
    else delete updated.gymId;
    setState({
      history: state.history.map((workout) =>
        workout.id === workoutId ? updated : workout,
      ),
    });
    // Full write so clearing the gym also clears it in the cloud.
    remoteSet(['history', workoutId], updated);
  },

  /**
   * Puts every workout without a (known) gym at `gymId`, e.g. history
   * imported from another app. Returns how many workouts changed.
   */
  assignGymToUnassigned: (gymId: string): number => {
    const known = new Set(state.gyms.map((gym) => gym.id));
    if (!known.has(gymId)) return 0;
    const changed: CompletedWorkout[] = [];
    const history = state.history.map((workout) => {
      if (workout.gymId && known.has(workout.gymId)) return workout;
      const updated = { ...workout, gymId };
      changed.push(updated);
      return updated;
    });
    if (changed.length === 0) return 0;
    setState({ history });
    changed.forEach((workout) =>
      remoteSet(['history', workout.id], { gymId }, true),
    );
    return changed.length;
  },

  /* Routine folders */
  createFolder: (name: string): string => {
    const folder: RoutineFolder = {
      id: uid('folder'),
      name: name.trim(),
      order: nextFolderOrder(state.folders),
      createdAt: new Date().toISOString(),
    };
    setState({ folders: [...state.folders, folder] });
    remoteSet(['folders', folder.id], folder);
    return folder.id;
  },

  renameFolder: (id: string, name: string) => {
    const existing = state.folders.find((folder) => folder.id === id);
    const trimmed = name.trim();
    if (!existing || !trimmed) return;
    const updated = { ...existing, name: trimmed };
    setState({
      folders: state.folders.map((folder) =>
        folder.id === id ? updated : folder,
      ),
    });
    remoteSet(['folders', id], updated);
  },

  /** Drops a routine in a folder (or LOOSE) at a position (drag). */
  placeRoutine: (routineId: string, groupKey: string, index: number) => {
    const changed = placeRoutine(
      state.templates,
      state.folders,
      routineId,
      groupKey,
      index,
    );
    if (changed.length === 0) return;
    const byId = new Map(changed.map((template) => [template.id, template]));
    setState({
      templates: state.templates.map(
        (template) => byId.get(template.id) ?? template,
      ),
    });
    // Full writes so leaving a folder also clears it in the cloud.
    changed.forEach((template) =>
      remoteSet(['templates', template.id], template),
    );
  },

  /** Moves a folder to a position (drag). */
  reorderFolder: (id: string, index: number) => {
    const result = reorderFolder(state.folders, id, index);
    if (!result) return;
    setState({ folders: result.folders });
    result.changed.forEach((folder) =>
      remoteSet(['folders', folder.id], folder),
    );
  },

  moveFolder: (id: string, direction: -1 | 1) => {
    const result = moveFolder(state.folders, id, direction);
    if (!result) return;
    setState({ folders: result.folders });
    result.changed.forEach((folder) =>
      remoteSet(['folders', folder.id], folder),
    );
  },

  /**
   * Deletes a folder. Its routines are deleted too when `withRoutines`,
   * otherwise they move out of the folder.
   */
  deleteFolder: (id: string, withRoutines: boolean) => {
    const inside = state.templates.filter((t) => t.folderId === id);
    setState({ folders: state.folders.filter((folder) => folder.id !== id) });
    remoteDelete('folders', id);
    inside.forEach((template) =>
      withRoutines
        ? actions.deleteTemplate(template.id)
        : actions.moveTemplateToFolder(template.id, null),
    );
  },

  deleteTemplate: (id: string) => {
    setState({ templates: state.templates.filter((t) => t.id !== id) });
    remoteDelete('templates', id);
  },

  duplicateTemplate: (id: string): string | null => {
    const original = state.templates.find((t) => t.id === id);
    if (!original) return null;
    const copy: WorkoutTemplateItem = {
      ...original,
      id: uid('tmpl'),
      name: `${original.name} (cópia)`,
    };
    const index = state.templates.findIndex((t) => t.id === id);
    const templates = [...state.templates];
    templates.splice(index + 1, 0, copy);
    setState({ templates });
    remoteSet(['templates', copy.id], {
      ...copy,
      createdAt: new Date().toISOString(),
    });
    return copy.id;
  },

  /* Exercises */
  toggleFavorite: (exerciseId: string) => {
    const favorites = state.favorites.includes(exerciseId)
      ? state.favorites.filter((id) => id !== exerciseId)
      : [...state.favorites, exerciseId];
    setState({ favorites });
  },

  createCustomExercise: (input: {
    name: string;
    primaryMuscleGroup: string;
    equipment: string;
    description?: string;
  }): Exercise => {
    const now = new Date().toISOString();
    const created: Exercise = {
      id: uid('custom'),
      name: input.name,
      primaryMuscleGroup: input.primaryMuscleGroup,
      secondaryMuscleGroups: [],
      equipment: input.equipment || null,
      description: input.description || null,
      isSystem: false,
      ownerUserId: state.currentUser?.uid || 'local-user',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    setState({ customExercises: [created, ...state.customExercises] });
    remoteSet(['custom_exercises', created.id], created);
    return created;
  },

  /* History import */
  /**
   * Adds imported workouts and their custom exercises. Records are replayed
   * over the merged history, since older sessions can change who holds one.
   */
  importHistory: (plan: ImportPlan): { imported: number; records: number } => {
    const known = new Set(state.history.map((workout) => workout.id));
    const incoming = plan.workouts.filter((workout) => !known.has(workout.id));
    if (incoming.length === 0) return { imported: 0, records: 0 };

    const customIds = new Set(state.customExercises.map((e) => e.id));
    const owner = state.currentUser?.uid || 'local-user';
    const newExercises = plan.newExercises
      .filter((exercise) => !customIds.has(exercise.id))
      .map((exercise) => ({ ...exercise, ownerUserId: owner }));

    setState({ customExercises: [...newExercises, ...state.customExercises] });
    newExercises.forEach((exercise) =>
      remoteSet(['custom_exercises', exercise.id], exercise),
    );
    const incomingIds = new Set(incoming.map((workout) => workout.id));
    const { prs } = commitHistory(
      sortByCompletedDesc([...incoming, ...state.history]),
      new Set(),
      incomingIds,
    );
    return {
      imported: incoming.length,
      records: prs.filter(
        (record) => record.workoutId && incomingIds.has(record.workoutId),
      ).length,
    };
  },

  /** Reverts an import: its workouts, and custom exercises nothing else uses. */
  undoImport: (workoutIds: string[], exerciseIds: string[]) => {
    const removed = new Set(workoutIds);
    const history = state.history.filter((workout) => !removed.has(workout.id));
    const stillUsed = new Set([
      ...history.flatMap((w) => w.exercises.map((e) => e.exerciseId)),
      ...state.templates.flatMap((t) => t.exercises.map((e) => e.exerciseId)),
    ]);
    const dropExercises = new Set(
      exerciseIds.filter((id) => !stillUsed.has(id)),
    );
    setState({
      customExercises: state.customExercises.filter(
        (exercise) => !dropExercises.has(exercise.id),
      ),
    });
    dropExercises.forEach((id) => remoteDelete('custom_exercises', id));
    removed.forEach((id) => remoteDelete('history', id));
    commitHistory(history, removed, new Set());
  },

  /* Body measurements */
  addMeasurement: (input: Omit<BodyMeasurement, 'id'>): BodyMeasurement => {
    const created: BodyMeasurement = { ...input, id: uid('measure') };
    setState({
      measurements: byDateDesc(
        [created, ...state.measurements],
        measurementDate,
      ),
    });
    remoteSet(['measurements', created.id], created);
    syncProfileWeight();
    return created;
  },

  updateMeasurement: (id: string, input: Omit<BodyMeasurement, 'id'>) => {
    const updated: BodyMeasurement = { ...input, id };
    setState({
      measurements: byDateDesc(
        state.measurements.map((item) => (item.id === id ? updated : item)),
        measurementDate,
      ),
    });
    // Replace (not merge) so a cleared field disappears in the cloud too.
    remoteSet(['measurements', id], updated);
    syncProfileWeight();
  },

  removeMeasurement: (id: string): BodyMeasurement | null => {
    const removed = state.measurements.find((item) => item.id === id) ?? null;
    setState({
      measurements: state.measurements.filter((item) => item.id !== id),
    });
    remoteDelete('measurements', id);
    syncProfileWeight();
    return removed;
  },

  restoreMeasurement: (item: BodyMeasurement) => {
    setState({
      measurements: byDateDesc([item, ...state.measurements], measurementDate),
      pendingDeletes: state.pendingDeletes.filter((id) => id !== item.id),
    });
    remoteSet(['measurements', item.id], item);
    syncProfileWeight();
  },

  importMeasurements: (plan: MeasurementPlan): number => {
    const known = new Set(state.measurements.map((item) => item.id));
    const incoming = plan.measurements.filter((item) => !known.has(item.id));
    if (incoming.length === 0) return 0;
    setState({
      measurements: byDateDesc(
        [...incoming, ...state.measurements],
        measurementDate,
      ),
    });
    incoming.forEach((item) => remoteSet(['measurements', item.id], item));
    syncProfileWeight();
    return incoming.length;
  },

  undoMeasurementImport: (ids: string[]) => {
    const removed = new Set(ids);
    setState({
      measurements: state.measurements.filter((item) => !removed.has(item.id)),
    });
    removed.forEach((id) => remoteDelete('measurements', id));
    syncProfileWeight();
  },

  /** A small JPEG data URL, or null to go back to the Google photo/initials. */
  setProfilePhoto: (dataUrl: string | null) => {
    actions.updateProfile({ photoDataUrl: dataUrl ?? '' });
  },

  /* Hydration */
  addHydration: (amountMl: number) => {
    const now = new Date();
    const log: HydrationLog = {
      id: uid('h'),
      amountMl,
      timestamp: now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      loggedAt: now.toISOString(),
    };
    setState({ hydrationLogs: [log, ...state.hydrationLogs] });
    remoteSet(['hydration', log.id], log);
    return log;
  },

  removeHydration: (id: string): HydrationLog | null => {
    const removed = state.hydrationLogs.find((log) => log.id === id) ?? null;
    setState({
      hydrationLogs: state.hydrationLogs.filter((log) => log.id !== id),
    });
    remoteDelete('hydration', id);
    return removed;
  },

  restoreHydration: (log: HydrationLog) => {
    setState({
      hydrationLogs: byDateDesc([log, ...state.hydrationLogs], hydrationDate),
      pendingDeletes: state.pendingDeletes.filter((id) => id !== log.id),
    });
    remoteSet(['hydration', log.id], log);
  },

  setHydrationTarget: (targetMl: number) => {
    setState({ hydrationTargetMl: targetMl });
  },

  /* Nutrition */
  addMeal: (meal: Omit<MealItem, 'id' | 'consumedAt' | 'loggedAt'>) => {
    const now = new Date();
    const created: MealItem = {
      ...meal,
      id: uid('m'),
      consumedAt: now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      loggedAt: now.toISOString(),
    };
    setState({ meals: [created, ...state.meals] });
    remoteSet(['meals', created.id], created);
    return created;
  },

  removeMeal: (id: string): MealItem | null => {
    const removed = state.meals.find((meal) => meal.id === id) ?? null;
    setState({ meals: state.meals.filter((meal) => meal.id !== id) });
    remoteDelete('meals', id);
    return removed;
  },

  restoreMeal: (meal: MealItem) => {
    setState({
      meals: byDateDesc([meal, ...state.meals], mealDate),
      pendingDeletes: state.pendingDeletes.filter((id) => id !== meal.id),
    });
    remoteSet(['meals', meal.id], meal);
  },

  setNutritionTargets: (targets: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    setState({
      nutritionTargetKcal: targets.kcal,
      nutritionTargetProtein: targets.protein,
      nutritionTargetCarbs: targets.carbs,
      nutritionTargetFat: targets.fat,
    });
  },

  /* Goals */
  addGoal: (goal: Omit<GoalItem, 'id' | 'status' | 'createdAt'>) => {
    const created: GoalItem = {
      ...goal,
      id: uid('goal'),
      status: goal.currentValue >= goal.targetValue ? 'completed' : 'active',
      createdAt: new Date().toISOString(),
    };
    setState({ goals: [...state.goals, created] });
    remoteSet(['goals', created.id], created);
    return created;
  },

  updateGoal: (
    id: string,
    updates: Partial<Pick<GoalItem, 'title' | 'targetValue' | 'deadline'>>,
  ) => {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return;
    const updated: GoalItem = { ...goal, ...updates };
    updated.status =
      updated.currentValue >= updated.targetValue ? 'completed' : 'active';
    setState({ goals: state.goals.map((g) => (g.id === id ? updated : g)) });
    remoteSet(['goals', id], updated, true);
  },

  updateGoalProgress: (id: string, currentValue: number) => {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return;
    const updated: GoalItem = {
      ...goal,
      currentValue,
      status: currentValue >= goal.targetValue ? 'completed' : 'active',
    };
    setState({ goals: state.goals.map((g) => (g.id === id ? updated : g)) });
    remoteSet(
      ['goals', id],
      { currentValue: updated.currentValue, status: updated.status },
      true,
    );
  },

  deleteGoal: (id: string) => {
    setState({ goals: state.goals.filter((g) => g.id !== id) });
    remoteDelete('goals', id);
  },

  /* Profile & preferences */
  updateProfile: (updates: Partial<UserProfile>) => {
    setState({ userProfile: { ...state.userProfile, ...updates } });
    remoteSet([], updates, true);
  },

  updateNotificationPrefs: (updates: Partial<NotificationPrefs>) => {
    setState({ notificationPrefs: { ...state.notificationPrefs, ...updates } });
  },

  /* Social (local preview data) */
  toggleChallenge: (challengeId: string) => {
    const joined = state.social.joinedChallenges;
    setState({
      social: {
        ...state.social,
        joinedChallenges: joined.includes(challengeId)
          ? joined.filter((id) => id !== challengeId)
          : [...joined, challengeId],
      },
    });
  },

  acceptFriend: (friendId: string) => {
    if (state.social.acceptedFriends.includes(friendId)) return;
    setState({
      social: {
        ...state.social,
        acceptedFriends: [...state.social.acceptedFriends, friendId],
      },
    });
  },
};

export type AppActions = typeof actions;

/* ------------------------------------------------------------------ */
/* React binding                                                       */
/* ------------------------------------------------------------------ */

let streakCache: {
  history: CompletedWorkout[];
  day: string;
  value: number;
} | null = null;

function streakFor(history: CompletedWorkout[]): number {
  const day = new Date().toDateString();
  if (
    !streakCache ||
    streakCache.history !== history ||
    streakCache.day !== day
  ) {
    streakCache = { history, day, value: computeStreakWeeks(history) };
  }
  return streakCache.value;
}

/** The chosen profile photo, else the Google account photo, else none. */
export function useProfilePhoto(): string | null {
  const chosen = useStoreValue((current) => current.userProfile.photoDataUrl);
  const google = useStoreValue((current) => current.currentUser?.photoURL);
  return chosen || google || null;
}

export function useAppStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const index = exerciseIndex();
  return {
    ...snapshot,
    ...actions,
    allExercises: index.all,
    streakWeeks: streakFor(snapshot.history),
  };
}

/**
 * Subscribes to one slice; re-renders only when it changes. The selector must
 * return a primitive or an existing reference (never a freshly built object).
 */
export function useStoreValue<T>(selector: (current: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}
