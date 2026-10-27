import { describeRoutineChanges, routineFromSession } from './routineChanges';
import type {
  ActiveExerciseSession,
  ActiveWorkoutState,
  SetEntry,
  SetType,
  TemplateExercise,
  WorkoutTemplateItem,
} from './types';

const target = (
  exerciseId: string,
  targetSets = 3,
  warmupSets?: number,
): TemplateExercise => ({
  exerciseId,
  exerciseName: exerciseId.toUpperCase(),
  targetSets,
  ...(warmupSets ? { warmupSets } : {}),
  targetReps: 10,
  targetWeightKg: 40,
  restSeconds: 90,
});

const set = (
  setType: SetType,
  weightKg = 50,
  repetitions = 8,
  completed = true,
): SetEntry =>
  ({
    id: `s-${Math.random()}`,
    setNumber: 1,
    setType,
    weightKg,
    repetitions,
    completed,
  }) as SetEntry;

const performed = (
  exerciseId: string,
  sets: SetEntry[],
): ActiveExerciseSession => ({
  key: exerciseId,
  exerciseId,
  exerciseName: exerciseId.toUpperCase(),
  primaryMuscleGroup: 'Peito',
  equipment: null,
  restSeconds: 90,
  sets,
});

const session = (exercises: ActiveExerciseSession[]): ActiveWorkoutState => ({
  id: 'session',
  name: 'Treino A',
  templateId: 'tmpl',
  startedAt: '2026-10-27T10:00:00.000Z',
  exercises,
});

const template = (exercises: TemplateExercise[]): WorkoutTemplateItem => ({
  id: 'tmpl',
  name: 'Treino A',
  description: '',
  exercises,
});

describe('routineFromSession', () => {
  it('keeps targets of known exercises and counts warm-ups apart', () => {
    const routine = routineFromSession(
      session([
        performed('a', [set('warmup', 20), set('working'), set('working')]),
        performed('new', [set('working', 30, 12)]),
      ]),
      template([target('a', 3)]),
    );
    expect(routine).toEqual([
      {
        exerciseId: 'a',
        exerciseName: 'A',
        targetSets: 2,
        warmupSets: 1,
        targetReps: 10,
        targetWeightKg: 40,
        restSeconds: 90,
      },
      {
        exerciseId: 'new',
        exerciseName: 'NEW',
        targetSets: 1,
        targetReps: 12,
        targetWeightKg: 30,
        restSeconds: 90,
      },
    ]);
  });

  it('takes targets from the first set done, not an empty one', () => {
    const [swapped] = routineFromSession(
      session([
        performed('new', [set('working', 0, 0, false), set('working', 50, 8)]),
      ]),
      template([target('a')]),
    );
    expect(swapped.targetWeightKg).toBe(50);
    expect(swapped.targetReps).toBe(8);
  });
});

describe('describeRoutineChanges', () => {
  it('finds nothing when the session followed the routine', () => {
    const before = [target('a'), target('b')];
    const after = routineFromSession(
      session([
        performed('a', [set('working'), set('working'), set('working')]),
        performed('b', [set('working'), set('working'), set('working')]),
      ]),
      template(before),
    );
    expect(describeRoutineChanges(before, after)).toEqual([]);
  });

  it('reads one out and one in as a swap', () => {
    expect(
      describeRoutineChanges(
        [target('a'), target('b')],
        [target('a'), target('c')],
      ),
    ).toEqual(['Trocou B por C']);
  });

  it('lists extra exercises, set counts, warm-ups and order', () => {
    expect(
      describeRoutineChanges(
        [target('a', 3), target('b', 3), target('c')],
        [target('b', 4, 2), target('a', 3), target('c'), target('d')],
      ),
    ).toEqual([
      'Incluiu D',
      'B: 3 → 4 séries',
      'B: 0 → 2 aquecimentos',
      'Mudou a ordem dos exercícios',
    ]);
  });

  it('notices removed exercises', () => {
    expect(
      describeRoutineChanges([target('a'), target('b')], [target('a')]),
    ).toEqual(['Tirou B']);
  });
});
