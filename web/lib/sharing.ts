import type { Exercise } from '../../src/domain/training/entities';
import type {
  RoutineFolder,
  TemplateExercise,
  WorkoutTemplateItem,
} from './types';

/*
 * A routine or folder sent to a friend is a self-contained copy: names,
 * targets and the sender's custom exercises travel with it, and the friend
 * saves new routines from it. Nothing stays linked to the sender.
 */

export type ShareKind = 'routine' | 'folder';

export interface SharedFolder {
  key: string;
  name: string;
  parentKey: string | null;
}

export interface SharedRoutine {
  name: string;
  description: string;
  folderKey: string | null;
  exercises: TemplateExercise[];
}

export interface SharedExercise {
  id: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string | null;
}

export interface SharePayload {
  v: 1;
  folders: SharedFolder[];
  routines: SharedRoutine[];
  customExercises: SharedExercise[];
}

export const SHARE_LIMITS = {
  folders: 30,
  routines: 60,
  exercisesPerRoutine: 40,
  name: 80,
  description: 500,
};

function customExercisesFor(
  routines: SharedRoutine[],
  customExercises: Exercise[],
): SharedExercise[] {
  const used = new Set(
    routines.flatMap((routine) => routine.exercises.map((e) => e.exerciseId)),
  );
  return customExercises
    .filter((exercise) => used.has(exercise.id))
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      equipment: exercise.equipment ?? null,
    }));
}

function toShared(
  template: WorkoutTemplateItem,
  folderKey: string | null,
): SharedRoutine {
  return {
    name: template.name,
    description: template.description ?? '',
    folderKey,
    exercises: template.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      targetSets: exercise.targetSets,
      ...(exercise.warmupSets ? { warmupSets: exercise.warmupSets } : {}),
      targetReps: exercise.targetReps,
      ...(exercise.targetRepsMax
        ? { targetRepsMax: exercise.targetRepsMax }
        : {}),
      ...(exercise.targetWeightKg !== undefined
        ? { targetWeightKg: exercise.targetWeightKg }
        : {}),
      restSeconds: exercise.restSeconds,
    })),
  };
}

export function buildRoutineShare(
  template: WorkoutTemplateItem,
  customExercises: Exercise[],
): SharePayload {
  const routines = [toShared(template, null)];
  return {
    v: 1,
    folders: [],
    routines,
    customExercises: customExercisesFor(routines, customExercises),
  };
}

/** The folder, every folder inside it and all their routines. */
export function buildFolderShare(
  folderId: string,
  folders: RoutineFolder[],
  templates: WorkoutTemplateItem[],
  customExercises: Exercise[],
): SharePayload {
  const included = new Set([folderId]);
  // Breadth-first so parents always come before their children.
  const ordered: RoutineFolder[] = [];
  const queue = folders.filter((folder) => folder.id === folderId);
  while (queue.length > 0) {
    const folder = queue.shift()!;
    ordered.push(folder);
    const children = folders
      .filter(
        (child) => child.parentId === folder.id && !included.has(child.id),
      )
      .sort((a, b) => a.order - b.order);
    children.forEach((child) => included.add(child.id));
    queue.push(...children);
  }
  const routines = templates
    .filter((template) => template.folderId && included.has(template.folderId))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((template) => toShared(template, template.folderId ?? null));
  return {
    v: 1,
    folders: ordered.map((folder) => ({
      key: folder.id,
      name: folder.name,
      parentKey: folder.id === folderId ? null : (folder.parentId ?? null),
    })),
    routines,
    customExercises: customExercisesFor(routines, customExercises),
  };
}

/* ------------------------------------------------------------------ */
/* Reading what a friend sent: another person's data, never trusted.   */
/* ------------------------------------------------------------------ */

function text(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

function count(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number * 100) / 100));
}

function list(value: unknown, max: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/** A clean payload from whatever arrived, or null when nothing is usable. */
export function readSharePayload(raw: unknown): SharePayload | null {
  const data = record(raw);
  const folders: SharedFolder[] = list(data.folders, SHARE_LIMITS.folders)
    .map(record)
    .map((folder) => ({
      key: text(folder.key, 100),
      name: text(folder.name, SHARE_LIMITS.name, 'Pasta'),
      parentKey: text(folder.parentKey, 100) || null,
    }))
    .filter((folder) => folder.key);
  const keys = new Set(folders.map((folder) => folder.key));
  // A parent must appear before its child (and exist at all).
  const seen = new Set<string>();
  const safeFolders = folders.map((folder) => {
    const parentKey =
      folder.parentKey && seen.has(folder.parentKey) ? folder.parentKey : null;
    seen.add(folder.key);
    return { ...folder, parentKey };
  });

  const routines: SharedRoutine[] = list(data.routines, SHARE_LIMITS.routines)
    .map(record)
    .map((routine) => ({
      name: text(routine.name, SHARE_LIMITS.name, 'Rotina'),
      description: text(routine.description, SHARE_LIMITS.description),
      folderKey:
        typeof routine.folderKey === 'string' && keys.has(routine.folderKey)
          ? routine.folderKey
          : null,
      exercises: list(routine.exercises, SHARE_LIMITS.exercisesPerRoutine)
        .map(record)
        .map((exercise) => {
          const weight = count(exercise.targetWeightKg, 0, 1000, -1);
          const warmupSets = Math.round(count(exercise.warmupSets, 0, 10, 0));
          const targetReps = count(exercise.targetReps, 0, 100, 10);
          const repsMax = count(exercise.targetRepsMax, 0, 100, 0);
          return {
            exerciseId: text(exercise.exerciseId, 100),
            exerciseName: text(exercise.exerciseName, SHARE_LIMITS.name),
            targetSets: count(exercise.targetSets, 1, 20, 3),
            ...(warmupSets > 0 ? { warmupSets } : {}),
            targetReps,
            ...(repsMax > targetReps ? { targetRepsMax: repsMax } : {}),
            ...(weight >= 0 ? { targetWeightKg: weight } : {}),
            restSeconds: count(exercise.restSeconds, 0, 900, 90),
          };
        })
        .filter((exercise) => exercise.exerciseId && exercise.exerciseName),
    }));

  const customExercises: SharedExercise[] = list(data.customExercises, 100)
    .map(record)
    .map((exercise) => ({
      id: text(exercise.id, 100),
      name: text(exercise.name, SHARE_LIMITS.name),
      primaryMuscleGroup: text(exercise.primaryMuscleGroup, 40, 'Geral'),
      equipment: text(exercise.equipment, 40) || null,
    }))
    .filter((exercise) => exercise.id && exercise.name);

  if (routines.length === 0) return null;
  return { v: 1, folders: safeFolders, routines, customExercises };
}

/** "Pasta · 4 rotinas" / "Rotina · 6 exercícios". */
export function describeShare(kind: ShareKind, payload: SharePayload): string {
  if (kind === 'folder') {
    const routines = payload.routines.length;
    return `Pasta · ${routines} ${routines === 1 ? 'rotina' : 'rotinas'}`;
  }
  const exercises = payload.routines[0]?.exercises.length ?? 0;
  return `Rotina · ${exercises} ${exercises === 1 ? 'exercício' : 'exercícios'}`;
}

/**
 * How the friend's exercises map onto this person's catalog: system ids are
 * kept, the sender's custom exercises reuse one with the same name or are
 * created, and anything unknown becomes a custom exercise by its name.
 */
export function planExercises(
  payload: SharePayload,
  isSystemExercise: (id: string) => boolean,
  myCustomExercises: Exercise[],
): {
  reuse: Map<string, string>;
  create: SharedExercise[];
} {
  const byName = new Map(
    myCustomExercises.map((exercise) => [
      exercise.name.trim().toLowerCase(),
      exercise.id,
    ]),
  );
  const sent = new Map(
    payload.customExercises.map((exercise) => [exercise.id, exercise]),
  );
  const reuse = new Map<string, string>();
  const create = new Map<string, SharedExercise>();
  for (const routine of payload.routines) {
    for (const exercise of routine.exercises) {
      const id = exercise.exerciseId;
      if (reuse.has(id) || create.has(id)) continue;
      if (isSystemExercise(id)) {
        reuse.set(id, id);
        continue;
      }
      const source = sent.get(id) ?? {
        id,
        name: exercise.exerciseName,
        primaryMuscleGroup: 'Geral',
        equipment: null,
      };
      const existing = byName.get(source.name.trim().toLowerCase());
      if (existing) reuse.set(id, existing);
      else create.set(id, source);
    }
  }
  return { reuse, create: [...create.values()] };
}
