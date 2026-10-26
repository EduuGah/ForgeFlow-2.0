import type { Exercise } from '../../src/domain/training/entities';
import {
  buildFolderShare,
  buildRoutineShare,
  describeShare,
  planExercises,
  readSharePayload,
} from './sharing';
import type { RoutineFolder, WorkoutTemplateItem } from './types';

const custom = (id: string, name: string): Exercise =>
  ({
    id,
    name,
    primaryMuscleGroup: 'Peito',
    equipment: 'Máquina',
    isSystem: false,
  }) as Exercise;

const routine = (
  id: string,
  folderId: string | undefined,
  exerciseIds: string[],
  order = 0,
): WorkoutTemplateItem => ({
  id,
  name: `Rotina ${id}`,
  description: '',
  folderId,
  order,
  exercises: exerciseIds.map((exerciseId) => ({
    exerciseId,
    exerciseName: `Ex ${exerciseId}`,
    targetSets: 3,
    targetReps: 10,
    targetWeightKg: 40,
    restSeconds: 90,
  })),
});

const folder = (id: string, parentId?: string, order = 0): RoutineFolder => ({
  id,
  name: `Pasta ${id}`,
  order,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...(parentId ? { parentId } : {}),
});

describe('building a share', () => {
  it('copies one routine with only the custom exercises it uses', () => {
    const payload = buildRoutineShare(routine('r1', 'f1', ['sys-1', 'c-1']), [
      custom('c-1', 'Supino máquina articulada'),
      custom('c-2', 'Não usado'),
    ]);
    expect(payload.folders).toEqual([]);
    expect(payload.routines).toHaveLength(1);
    expect(payload.routines[0].folderKey).toBeNull();
    expect(payload.customExercises.map((e) => e.id)).toEqual(['c-1']);
  });

  it('copies a folder with its subfolders, parents first', () => {
    const folders = [
      folder('top'),
      folder('child', 'top'),
      folder('grandchild', 'child'),
      folder('other'),
    ];
    const payload = buildFolderShare(
      'child',
      folders,
      [
        routine('a', 'child', ['sys-1']),
        routine('b', 'grandchild', ['sys-2']),
        routine('c', 'other', ['sys-3']),
        routine('d', undefined, ['sys-4']),
      ],
      [],
    );
    expect(payload.folders).toEqual([
      { key: 'child', name: 'Pasta child', parentKey: null },
      { key: 'grandchild', name: 'Pasta grandchild', parentKey: 'child' },
    ]);
    expect(payload.routines.map((r) => r.name)).toEqual([
      'Rotina a',
      'Rotina b',
    ]);
    expect(describeShare('folder', payload)).toBe('Pasta · 2 rotinas');
  });
});

describe('reading a share from someone else', () => {
  it('round-trips a well-formed payload', () => {
    const payload = buildRoutineShare(routine('r1', undefined, ['sys-1']), []);
    expect(readSharePayload(JSON.parse(JSON.stringify(payload)))).toEqual(
      payload,
    );
  });

  it('cleans or drops anything malformed', () => {
    const payload = readSharePayload({
      folders: [
        { key: 'f', name: 'x'.repeat(500), parentKey: 'missing' },
        { name: 'sem chave' },
      ],
      routines: [
        {
          name: 42,
          folderKey: 'nope',
          exercises: [
            {
              exerciseId: 'sys-1',
              exerciseName: 'Agachamento',
              targetSets: 9999,
              targetReps: -3,
              targetWeightKg: 'pesado',
              restSeconds: 30,
            },
            { exerciseId: '', exerciseName: 'sem id' },
          ],
        },
      ],
      customExercises: 'nope',
    });
    expect(payload).not.toBeNull();
    expect(payload!.folders).toHaveLength(1);
    expect(payload!.folders[0].name).toHaveLength(80);
    expect(payload!.folders[0].parentKey).toBeNull();
    expect(payload!.routines[0].name).toBe('Rotina');
    expect(payload!.routines[0].folderKey).toBeNull();
    expect(payload!.routines[0].exercises).toEqual([
      {
        exerciseId: 'sys-1',
        exerciseName: 'Agachamento',
        targetSets: 20,
        targetReps: 0,
        restSeconds: 30,
      },
    ]);
    expect(payload!.customExercises).toEqual([]);
  });

  it('rejects payloads without routines', () => {
    expect(readSharePayload(null)).toBeNull();
    expect(readSharePayload({ routines: [] })).toBeNull();
    expect(readSharePayload('texto')).toBeNull();
  });
});

describe('planExercises', () => {
  it('keeps system ids, reuses same-name customs and creates the rest', () => {
    const payload = readSharePayload(
      buildRoutineShare(routine('r', undefined, ['sys-1', 'c-1', 'c-2']), [
        custom('c-1', 'Crucifixo no cabo'),
        custom('c-2', 'Remada cavalinho'),
      ]),
    )!;
    const plan = planExercises(payload, (id) => id.startsWith('sys-'), [
      custom('mine-9', '  crucifixo NO cabo '),
    ]);
    expect(plan.reuse.get('sys-1')).toBe('sys-1');
    expect(plan.reuse.get('c-1')).toBe('mine-9');
    expect(plan.create.map((e) => e.name)).toEqual(['Remada cavalinho']);
  });

  it('turns unknown ids without details into custom exercises by name', () => {
    const payload = readSharePayload({
      routines: [
        {
          name: 'Treino',
          exercises: [{ exerciseId: 'ghost', exerciseName: 'Prancha' }],
        },
      ],
    })!;
    const plan = planExercises(payload, () => false, []);
    expect(plan.create).toEqual([
      {
        id: 'ghost',
        name: 'Prancha',
        primaryMuscleGroup: 'Geral',
        equipment: null,
      },
    ]);
  });
});
