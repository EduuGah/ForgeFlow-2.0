import { useState, useEffect } from 'react';
import { systemExercises } from '../src/data/seeds/systemExercises';
import type { Exercise } from '../src/domain/training/entities';
import {
  auth,
  db,
  loginWithGoogle as fbLoginWithGoogle,
  logoutFirebase as fbLogout,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
  type User,
} from './firebase';

export interface SetEntry {
  id: string;
  setNumber: number;
  setType: 'working' | 'warmup';
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
  sets: SetEntry[];
}

export interface ActiveWorkoutState {
  id: string;
  name: string;
  startedAt: string;
  exercises: ActiveExerciseSession[];
  notes?: string;
}

export interface CompletedWorkout {
  id: string;
  name: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  exercises: {
    exerciseName: string;
    setsCount: number;
    bestWeightKg: number;
    totalVolumeKg: number;
  }[];
  prsAchieved: string[];
}

export interface WorkoutTemplateItem {
  id: string;
  name: string;
  description: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    targetWeightKg?: number;
    restSeconds: number;
  }[];
}

export interface PersonalRecordItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'volume' | 'repetitions' | 'estimated_1rm';
  value: number;
  unit: string;
  date: string;
}

export interface GoalItem {
  id: string;
  title: string;
  type: 'frequency' | 'weight' | 'exercise_weight' | 'custom';
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline?: string;
  status: 'active' | 'completed';
}

export interface HydrationLog {
  id: string;
  amountMl: number;
  timestamp: string;
}

export interface MealItem {
  id: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  consumedAt: string;
}

export interface RestTimerState {
  isActive: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  isPaused: boolean;
}

export const initialTemplates: WorkoutTemplateItem[] = [
  {
    id: 'tmpl-1',
    name: 'Treino A - Peito, Ombros e Tríceps',
    description: 'Foco em força no supino e hipertrofia de deltoides e tríceps.',
    exercises: [
      {
        exerciseId: '00000000-0000-4000-8000-000000001017',
        exerciseName: 'Supino reto com barra',
        targetSets: 4,
        targetReps: 8,
        targetWeightKg: 80,
        restSeconds: 90,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001020',
        exerciseName: 'Supino inclinado com halteres',
        targetSets: 3,
        targetReps: 10,
        targetWeightKg: 28,
        restSeconds: 60,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001026',
        exerciseName: 'Desenvolvimento militar',
        targetSets: 3,
        targetReps: 8,
        targetWeightKg: 45,
        restSeconds: 75,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001029',
        exerciseName: 'Elevacao lateral com halteres',
        targetSets: 4,
        targetReps: 12,
        targetWeightKg: 12,
        restSeconds: 45,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001037',
        exerciseName: 'Triceps na polia alta (corda)',
        targetSets: 4,
        targetReps: 12,
        targetWeightKg: 25,
        restSeconds: 45,
      },
    ],
  },
  {
    id: 'tmpl-2',
    name: 'Treino B - Costas e Bíceps',
    description: 'Puxadas pesadas para espessura e largura de dorsais com finalização de bíceps.',
    exercises: [
      {
        exerciseId: '00000000-0000-4000-8000-000000001001',
        exerciseName: 'Barra fixa',
        targetSets: 4,
        targetReps: 10,
        targetWeightKg: 0,
        restSeconds: 90,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001005',
        exerciseName: 'Remada curvada com barra',
        targetSets: 4,
        targetReps: 8,
        targetWeightKg: 70,
        restSeconds: 90,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001003',
        exerciseName: 'Puxada alta',
        targetSets: 3,
        targetReps: 10,
        targetWeightKg: 65,
        restSeconds: 60,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001033',
        exerciseName: 'Rosca direta com barra',
        targetSets: 3,
        targetReps: 10,
        targetWeightKg: 30,
        restSeconds: 60,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001035',
        exerciseName: 'Rosca martelo com halteres',
        targetSets: 3,
        targetReps: 12,
        targetWeightKg: 14,
        restSeconds: 45,
      },
    ],
  },
  {
    id: 'tmpl-3',
    name: 'Treino C - Pernas e Abdômen',
    description: 'Quadríceps, posteriores, panturrilhas e estabilização de core.',
    exercises: [
      {
        exerciseId: '00000000-0000-4000-8000-000000001009',
        exerciseName: 'Agachamento livre com barra',
        targetSets: 4,
        targetReps: 8,
        targetWeightKg: 100,
        restSeconds: 120,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001010',
        exerciseName: 'Leg press 45',
        targetSets: 4,
        targetReps: 10,
        targetWeightKg: 200,
        restSeconds: 90,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001011',
        exerciseName: 'Cadeira extensora',
        targetSets: 3,
        targetReps: 12,
        targetWeightKg: 50,
        restSeconds: 60,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001012',
        exerciseName: 'Mesa flexora',
        targetSets: 3,
        targetReps: 12,
        targetWeightKg: 40,
        restSeconds: 60,
      },
      {
        exerciseId: '00000000-0000-4000-8000-000000001042',
        exerciseName: 'Prancha isometrica',
        targetSets: 3,
        targetReps: 60,
        targetWeightKg: 0,
        restSeconds: 45,
      },
    ],
  },
];

export const initialGoals: GoalItem[] = [
  { id: 'goal-1', title: 'Frequência Semanal de Treinos', type: 'frequency', currentValue: 0, targetValue: 4, unit: 'treinos/sem', status: 'active' },
  { id: 'goal-2', title: 'Meta de Carga no Supino Reto', type: 'exercise_weight', currentValue: 0, targetValue: 100, unit: 'kg', deadline: '31/12/2026', status: 'active' },
  { id: 'goal-3', title: 'Hidratação Diária Consistente', type: 'custom', currentValue: 0, targetValue: 2500, unit: 'ml/dia', status: 'active' },
  { id: 'goal-4', title: 'Agachamento Livre 120kg', type: 'exercise_weight', currentValue: 0, targetValue: 120, unit: 'kg', deadline: '15/11/2026', status: 'active' },
];

function getStorageKey(uid?: string | null): string {
  return uid ? `forgeflow_v2_user_${uid}` : `forgeflow_v2_guest`;
}

function getDefaultStateForUser(user: User | null) {
  const isGuest = !user;
  return {
    templates: initialTemplates,
    history: [] as CompletedWorkout[],
    prs: [] as PersonalRecordItem[],
    goals: initialGoals,
    hydrationTargetMl: 2500,
    hydrationLogs: [] as HydrationLog[],
    nutritionTargetKcal: 2300,
    nutritionTargetProtein: 160,
    nutritionTargetCarbs: 240,
    nutritionTargetFat: 70,
    meals: [] as MealItem[],
    activeWorkout: null as ActiveWorkoutState | null,
    favorites: [
      '00000000-0000-4000-8000-000000001001',
      '00000000-0000-4000-8000-000000001017',
      '00000000-0000-4000-8000-000000001009',
    ],
    customExercises: [] as Exercise[],
    userProfile: {
      name: user?.displayName || (isGuest ? 'Atleta Convidado' : 'Atleta ForgeFlow'),
      username: user?.email ? user.email.split('@')[0] : (isGuest ? 'convidado' : 'atleta'),
      email: user?.email || '',
      bio: isGuest ? 'Modo de demonstração local offline.' : 'Foco em força, consistência e saúde.',
      experience: isGuest ? 'Iniciante' : 'Intermediário',
      weightKg: 75.0,
      heightCm: 175,
      mainGoal: 'Hipertrofia e Força',
      streakWeeks: 1,
    },
    notificationPrefs: {
      workoutReminders: true,
      restTimerAlerts: true,
      hydrationAlerts: true,
      weeklyReport: true,
    },
    restTimer: {
      isActive: false,
      totalSeconds: 90,
      remainingSeconds: 90,
      isPaused: false,
    } as RestTimerState,
    currentUser: user,
    isAuthLoading: true,
    isSyncingWithFirestore: false,
  };
}

export function loadStateForUser(user: User | null) {
  const key = getStorageKey(user?.uid);
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...getDefaultStateForUser(user),
        ...parsed,
        currentUser: user,
        isAuthLoading: false,
        isSyncingWithFirestore: false,
      };
    } catch {
      // fallback
    }
  }
  return {
    ...getDefaultStateForUser(user),
    currentUser: user,
    isAuthLoading: false,
    isSyncingWithFirestore: false,
  };
}

let globalState = loadStateForUser(null);
const listeners = new Set<() => void>();

function notify() {
  const key = getStorageKey(globalState.currentUser?.uid);
  localStorage.setItem(key, JSON.stringify(globalState));
  listeners.forEach((l) => l());
}

function cleanData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = cleanData(val);
      } else if (Array.isArray(val)) {
        clean[key] = val.map((item) =>
          typeof item === 'object' && item !== null ? cleanData(item) : item
        );
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

// Background Firestore synchronization for the authenticated user
async function syncFromFirestore(user: User) {
  if (globalState.currentUser?.uid !== user.uid) {
    return;
  }

  globalState.isSyncingWithFirestore = true;
  notify();

  // 1. User Profile Sync
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      globalState.userProfile = {
        ...globalState.userProfile,
        name: data.name || user.displayName || globalState.userProfile.name,
        email: data.email || user.email || globalState.userProfile.email,
        bio: data.bio ?? globalState.userProfile.bio,
        experience: data.experience ?? globalState.userProfile.experience,
        weightKg: data.weightKg ?? globalState.userProfile.weightKg,
        heightCm: data.heightCm ?? globalState.userProfile.heightCm,
        mainGoal: data.mainGoal ?? globalState.userProfile.mainGoal,
        streakWeeks: data.streakWeeks ?? globalState.userProfile.streakWeeks,
      };
    } else {
      // First time this Google user logs in: create their personal profile in Firestore
      const newProfile = {
        name: user.displayName || 'Atleta ForgeFlow',
        username: user.email ? user.email.split('@')[0] : 'atleta',
        email: user.email || '',
        bio: 'Foco em força, consistência e saúde.',
        experience: 'Intermediário',
        weightKg: 75,
        heightCm: 175,
        mainGoal: 'Hipertrofia e Força',
        streakWeeks: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, cleanData(newProfile));
      globalState.userProfile = { ...globalState.userProfile, ...newProfile };
    }
  } catch (err) {
    console.warn('Firestore perfil sync:', err);
  }

  // 2. Templates Sync
  try {
    const tmplCol = collection(db, 'users', user.uid, 'templates');
    const tmplSnap = await getDocs(tmplCol);
    if (!tmplSnap.empty) {
      globalState.templates = tmplSnap.docs.map((d) => d.data() as WorkoutTemplateItem);
    } else {
      // Seed starter templates to this user's personal Firestore
      for (const t of initialTemplates) {
        await setDoc(doc(db, 'users', user.uid, 'templates', t.id), {
          ...cleanData(t),
          userId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      globalState.templates = initialTemplates;
    }
  } catch (err) {
    console.warn('Firestore templates sync:', err);
  }

  // 3. History Sync (Isolated to this user!)
  try {
    const histCol = collection(db, 'users', user.uid, 'history');
    const histSnap = await getDocs(histCol);
    // If user has history in Firestore, load it; if not, empty array!
    globalState.history = histSnap.docs.map((d) => d.data() as CompletedWorkout);
  } catch (err) {
    console.warn('Firestore history sync:', err);
  }

  // 4. PRs Sync (Isolated to this user!)
  try {
    const prCol = collection(db, 'users', user.uid, 'prs');
    const prSnap = await getDocs(prCol);
    globalState.prs = prSnap.docs.map((d) => d.data() as PersonalRecordItem);
  } catch (err) {
    console.warn('Firestore PRs sync:', err);
  }

  // 5. Goals Sync
  try {
    const goalsCol = collection(db, 'users', user.uid, 'goals');
    const goalsSnap = await getDocs(goalsCol);
    if (!goalsSnap.empty) {
      globalState.goals = goalsSnap.docs.map((d) => d.data() as GoalItem);
    } else {
      // Seed default goals for new user
      for (const g of initialGoals) {
        await setDoc(doc(db, 'users', user.uid, 'goals', g.id), {
          ...cleanData(g),
          userId: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      globalState.goals = initialGoals;
    }
  } catch (err) {
    console.warn('Firestore goals sync:', err);
  }

  // 6. Hydration Sync (Isolated to this user!)
  try {
    const hydCol = collection(db, 'users', user.uid, 'hydration');
    const hydSnap = await getDocs(hydCol);
    globalState.hydrationLogs = hydSnap.docs.map((d) => d.data() as HydrationLog);
  } catch (err) {
    console.warn('Firestore hydration sync:', err);
  }

  // 7. Meals Sync (Isolated to this user!)
  try {
    const mealCol = collection(db, 'users', user.uid, 'meals');
    const mealSnap = await getDocs(mealCol);
    globalState.meals = mealSnap.docs.map((d) => d.data() as MealItem);
  } catch (err) {
    console.warn('Firestore meals sync:', err);
  }

  globalState.isSyncingWithFirestore = false;
  notify();
}

// Initialize Auth Listener & Connection Check
let isAuthListenerInitialized = false;
function initAuth() {
  if (isAuthListenerInitialized) return;
  isAuthListenerInitialized = true;

  testFirestoreConnection();

  onAuthStateChanged(auth, async (user) => {
    const currentUid = globalState.currentUser?.uid;
    const newUid = user?.uid;

    if (currentUid !== newUid) {
      // Switch active session state completely to the new user
      globalState = loadStateForUser(user);
      notify();

      if (user) {
        await syncFromFirestore(user);
      }
    } else {
      globalState.isAuthLoading = false;
      notify();
    }
  });
}

initAuth();

export function useAppStore() {
  const [state, setState] = useState(globalState);

  useEffect(() => {
    const listener = () => setState({ ...globalState });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...state,
    allExercises: [...systemExercises, ...state.customExercises],

    // Auth actions
    login: async () => {
      try {
        const user = await fbLoginWithGoogle();
        if (user) {
          globalState = loadStateForUser(user);
          notify();
          await syncFromFirestore(user);
        }
      } catch (err) {
        console.error('Erro ao fazer login com Google:', err);
        throw err;
      }
    },

    logout: async () => {
      await fbLogout();
      globalState = loadStateForUser(null);
      notify();
    },

    // Active Workout Actions
    startWorkoutFromTemplate: (templateId: string) => {
      const template = state.templates.find((t: WorkoutTemplateItem) => t.id === templateId);
      if (!template) return;

      const exercises: ActiveExerciseSession[] = template.exercises.map((te) => ({
        exerciseId: te.exerciseId,
        exerciseName: te.exerciseName,
        primaryMuscleGroup: 'Geral',
        equipment: null,
        sets: Array.from({ length: te.targetSets }, (_, i) => ({
          id: `set-${Date.now()}-${i}`,
          setNumber: i + 1,
          setType: 'working' as const,
          weightKg: te.targetWeightKg || 0,
          repetitions: te.targetReps || 10,
          completed: false,
        })),
      }));

      globalState.activeWorkout = {
        id: `session-${Date.now()}`,
        name: template.name,
        startedAt: new Date().toISOString(),
        exercises,
      };
      notify();
    },

    startEmptyWorkout: () => {
      globalState.activeWorkout = {
        id: `session-${Date.now()}`,
        name: 'Treino Livre',
        startedAt: new Date().toISOString(),
        exercises: [],
      };
      notify();
    },

    addExerciseToActiveWorkout: (exercise: Exercise) => {
      if (!globalState.activeWorkout) return;
      globalState.activeWorkout.exercises.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        equipment: exercise.equipment,
        sets: [
          {
            id: `set-${Date.now()}-1`,
            setNumber: 1,
            setType: 'working',
            weightKg: 20,
            repetitions: 10,
            completed: false,
          },
        ],
      });
      notify();
    },

    removeExerciseFromActiveWorkout: (index: number) => {
      if (!globalState.activeWorkout) return;
      globalState.activeWorkout.exercises.splice(index, 1);
      notify();
    },

    addSetToActiveExercise: (exerciseIndex: number) => {
      if (!globalState.activeWorkout) return;
      const ex = globalState.activeWorkout.exercises[exerciseIndex];
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSetNumber = ex.sets.length + 1;
      ex.sets.push({
        id: `set-${Date.now()}-${newSetNumber}`,
        setNumber: newSetNumber,
        setType: 'working',
        weightKg: lastSet ? lastSet.weightKg : 20,
        repetitions: lastSet ? lastSet.repetitions : 10,
        completed: false,
      });
      notify();
    },

    removeSetFromActiveExercise: (exerciseIndex: number, setIndex: number) => {
      if (!globalState.activeWorkout) return;
      const ex = globalState.activeWorkout.exercises[exerciseIndex];
      ex.sets.splice(setIndex, 1);
      ex.sets.forEach((s, i) => {
        s.setNumber = i + 1;
      });
      notify();
    },

    updateSetActiveWorkout: (
      exerciseIndex: number,
      setIndex: number,
      updates: Partial<SetEntry>,
    ) => {
      if (!globalState.activeWorkout) return;
      const current = globalState.activeWorkout.exercises[exerciseIndex].sets[setIndex];
      const isNewlyCompleted = !current.completed && updates.completed === true;

      Object.assign(current, updates);

      // Trigger rest timer on completed set if configured
      if (isNewlyCompleted) {
        globalState.restTimer = {
          isActive: true,
          totalSeconds: 90,
          remainingSeconds: 90,
          isPaused: false,
        };
      }
      notify();
    },

    finishActiveWorkout: async () => {
      if (!globalState.activeWorkout) return;
      const active = globalState.activeWorkout;
      const now = new Date();
      const startTime = new Date(active.startedAt);
      const duration = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000));

      let totalVolume = 0;
      let totalSets = 0;
      const newPrsDetected: string[] = [];

      const exercisesSummary = active.exercises.map((ex) => {
        let bestWeight = 0;
        let exVolume = 0;
        ex.sets.forEach((s) => {
          if (s.completed) {
            totalSets++;
            const vol = s.weightKg * s.repetitions;
            exVolume += vol;
            totalVolume += vol;
            if (s.weightKg > bestWeight) bestWeight = s.weightKg;
          }
        });

        // Check if this weight is a personal record for this exercise
        if (bestWeight > 0) {
          const existingPr = globalState.prs.find(
            (p) => p.exerciseId === ex.exerciseId && p.type === 'weight'
          );
          if (!existingPr || bestWeight > existingPr.value) {
            const prText = `${ex.exerciseName}: ${bestWeight} kg (Carga Máx)`;
            newPrsDetected.push(prText);

            // Update or add PR
            const newPrItem: PersonalRecordItem = {
              id: `pr-${Date.now()}-${ex.exerciseId.slice(0, 8)}`,
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: 'weight',
              value: bestWeight,
              unit: 'kg',
              date: 'Hoje',
            };
            globalState.prs = globalState.prs.filter(
              (p) => !(p.exerciseId === ex.exerciseId && p.type === 'weight')
            );
            globalState.prs.unshift(newPrItem);

            // Persist PR to Firestore
            const currentUser = auth.currentUser;
            if (currentUser) {
              setDoc(
                doc(db, 'users', currentUser.uid, 'prs', newPrItem.id),
                cleanData({ ...newPrItem, userId: currentUser.uid, createdAt: now.toISOString() })
              ).catch((e) => console.warn('PR save error:', e));
            }
          }
        }

        return {
          exerciseName: ex.exerciseName,
          setsCount: ex.sets.filter((s) => s.completed).length,
          bestWeightKg: bestWeight,
          totalVolumeKg: exVolume,
        };
      });

      const newHistoryItem: CompletedWorkout = {
        id: `hist-${Date.now()}`,
        name: active.name,
        startedAt: active.startedAt,
        completedAt: now.toISOString(),
        durationMinutes: duration,
        totalVolumeKg: totalVolume,
        totalSets: totalSets,
        exercises: exercisesSummary,
        prsAchieved: newPrsDetected,
      };

      globalState.history.unshift(newHistoryItem);
      globalState.activeWorkout = null;
      globalState.restTimer.isActive = false;
      notify();

      // Persist workout to Firestore under this user's account
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'history', newHistoryItem.id), {
            ...cleanData(newHistoryItem),
            userId: user.uid,
            createdAt: now.toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/history/${newHistoryItem.id}`);
        }
      }
    },

    discardActiveWorkout: () => {
      globalState.activeWorkout = null;
      globalState.restTimer.isActive = false;
      notify();
    },

    // Rest Timer Actions
    startRestTimer: (seconds: number = 90) => {
      globalState.restTimer = {
        isActive: true,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isPaused: false,
      };
      notify();
    },

    pauseResumeRestTimer: () => {
      globalState.restTimer.isPaused = !globalState.restTimer.isPaused;
      notify();
    },

    addRestTime: (seconds: number = 30) => {
      globalState.restTimer.remainingSeconds += seconds;
      globalState.restTimer.totalSeconds += seconds;
      notify();
    },

    stopRestTimer: () => {
      globalState.restTimer.isActive = false;
      notify();
    },

    tickRestTimer: () => {
      if (!globalState.restTimer.isActive || globalState.restTimer.isPaused) return;
      if (globalState.restTimer.remainingSeconds <= 1) {
        globalState.restTimer.remainingSeconds = 0;
        globalState.restTimer.isActive = false;
      } else {
        globalState.restTimer.remainingSeconds -= 1;
      }
      notify();
    },

    // Templates CRUD
    createTemplate: async (template: Omit<WorkoutTemplateItem, 'id'>) => {
      const newTemplate: WorkoutTemplateItem = {
        ...template,
        id: `tmpl-${Date.now()}`,
      };
      globalState.templates.unshift(newTemplate);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'templates', newTemplate.id), {
            ...cleanData(newTemplate),
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/templates/${newTemplate.id}`);
        }
      }
    },

    updateTemplate: async (id: string, updates: Partial<WorkoutTemplateItem>) => {
      const idx = globalState.templates.findIndex((t: WorkoutTemplateItem) => t.id === id);
      if (idx !== -1) {
        globalState.templates[idx] = { ...globalState.templates[idx], ...updates };
        notify();

        const user = auth.currentUser;
        if (user) {
          try {
            await setDoc(
              doc(db, 'users', user.uid, 'templates', id),
              cleanData({ ...globalState.templates[idx], updatedAt: new Date().toISOString() }),
              { merge: true }
            );
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/templates/${id}`);
          }
        }
      }
    },

    deleteTemplate: async (id: string) => {
      globalState.templates = globalState.templates.filter((t: WorkoutTemplateItem) => t.id !== id);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'templates', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/templates/${id}`);
        }
      }
    },

    duplicateTemplate: (id: string) => {
      const original = globalState.templates.find((t: WorkoutTemplateItem) => t.id === id);
      if (original) {
        const copy: WorkoutTemplateItem = {
          ...original,
          id: `tmpl-${Date.now()}`,
          name: `${original.name} (Cópia)`,
        };
        globalState.templates.push(copy);
        notify();
      }
    },

    // Favorites & Custom Exercises
    toggleFavorite: (exerciseId: string) => {
      if (globalState.favorites.includes(exerciseId)) {
        globalState.favorites = globalState.favorites.filter((id: string) => id !== exerciseId);
      } else {
        globalState.favorites.push(exerciseId);
      }
      notify();
    },

    createCustomExercise: (exercise: {
      name: string;
      primaryMuscleGroup: string;
      equipment: string;
      description?: string;
    }) => {
      const newEx: Exercise = {
        id: `custom-${Date.now()}`,
        name: exercise.name,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        secondaryMuscleGroups: [],
        equipment: exercise.equipment,
        description: exercise.description || null,
        isSystem: false,
        ownerUserId: auth.currentUser?.uid || 'local-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      globalState.customExercises.unshift(newEx);
      notify();
    },

    // Hydration (Isolated to this user!)
    addHydration: async (amountMl: number) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newLog: HydrationLog = {
        id: `h-${Date.now()}`,
        amountMl,
        timestamp: timeStr,
      };
      globalState.hydrationLogs.unshift(newLog);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'hydration', newLog.id), {
            ...cleanData(newLog),
            userId: user.uid,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/hydration/${newLog.id}`);
        }
      }
    },

    removeHydration: async (id: string) => {
      globalState.hydrationLogs = globalState.hydrationLogs.filter((h: HydrationLog) => h.id !== id);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'hydration', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/hydration/${id}`);
        }
      }
    },

    setHydrationTarget: (targetMl: number) => {
      globalState.hydrationTargetMl = targetMl;
      notify();
    },

    // Nutrition (Isolated to this user!)
    addMeal: async (meal: Omit<MealItem, 'id' | 'consumedAt'>) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMeal: MealItem = {
        ...meal,
        id: `m-${Date.now()}`,
        consumedAt: timeStr,
      };
      globalState.meals.unshift(newMeal);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'meals', newMeal.id), {
            ...cleanData(newMeal),
            userId: user.uid,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/meals/${newMeal.id}`);
        }
      }
    },

    removeMeal: async (id: string) => {
      globalState.meals = globalState.meals.filter((m: MealItem) => m.id !== id);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/meals/${id}`);
        }
      }
    },

    // Goals (Isolated to this user!)
    addGoal: async (goal: Omit<GoalItem, 'id' | 'status'>) => {
      const newGoal: GoalItem = {
        ...goal,
        id: `goal-${Date.now()}`,
        status: 'active',
      };
      globalState.goals.push(newGoal);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'goals', newGoal.id), {
            ...cleanData(newGoal),
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/goals/${newGoal.id}`);
        }
      }
    },

    updateGoalProgress: async (id: string, currentValue: number) => {
      const goal = globalState.goals.find((g: GoalItem) => g.id === id);
      if (goal) {
        goal.currentValue = currentValue;
        if (goal.currentValue >= goal.targetValue) {
          goal.status = 'completed';
        }
        notify();

        const user = auth.currentUser;
        if (user) {
          try {
            await setDoc(
              doc(db, 'users', user.uid, 'goals', id),
              cleanData({
                currentValue: goal.currentValue,
                status: goal.status,
                updatedAt: new Date().toISOString(),
              }),
              { merge: true }
            );
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/goals/${id}`);
          }
        }
      }
    },

    deleteGoal: async (id: string) => {
      globalState.goals = globalState.goals.filter((g: GoalItem) => g.id !== id);
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'goals', id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/goals/${id}`);
        }
      }
    },

    // User Profile & Preferences
    updateProfile: async (updates: Partial<typeof globalState.userProfile>) => {
      globalState.userProfile = { ...globalState.userProfile, ...updates };
      notify();

      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(
            doc(db, 'users', user.uid),
            cleanData({
              ...updates,
              updatedAt: new Date().toISOString(),
            }),
            { merge: true }
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      }
    },

    updateNotificationPrefs: (updates: Partial<typeof globalState.notificationPrefs>) => {
      globalState.notificationPrefs = { ...globalState.notificationPrefs, ...updates };
      notify();
    },
  };
}
