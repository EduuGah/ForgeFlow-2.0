import { formatRepRange } from './format';
import { routineFromSession } from './routineChanges';
import { buildRoutineShare, readSharePayload } from './sharing';
import type {
  ActiveExerciseSession,
  SetEntry,
  WorkoutTemplateItem,
} from './types';

const set = (repetitions = 10): SetEntry =>
  ({
    id: Math.random().toString(),
    setNumber: 1,
    setType: 'working',
    weightKg: 40,
    repetitions,
    completed: true,
  }) as SetEntry;

const template: WorkoutTemplateItem = {
  id: 'tmpl',
  name: 'Treino A',
  description: '',
  exercises: [
    {
      exerciseId: 'supino',
      exerciseName: 'Supino',
      targetSets: 3,
      targetReps: 8,
      targetRepsMax: 12,
      restSeconds: 90,
    },
  ],
};

describe('rep ranges', () => {
  it('formats a range or a fixed count', () => {
    expect(formatRepRange(8, 12)).toBe('8–12');
    expect(formatRepRange(10)).toBe('10');
    expect(formatRepRange(10, 10)).toBe('10');
    expect(formatRepRange(10, 6)).toBe('10');
  });

  it('survives updating the routine from a workout, swaps included', () => {
    const exercise = (id: string): ActiveExerciseSession => ({
      key: id,
      exerciseId: id,
      exerciseName: id,
      primaryMuscleGroup: 'Peito',
      equipment: null,
      restSeconds: 90,
      targetReps: { min: 8, max: 12 },
      sets: [set(11), set(9)],
    });
    const [kept] = routineFromSession(
      {
        id: 's',
        name: 'Treino A',
        templateId: 'tmpl',
        startedAt: '',
        exercises: [exercise('supino')],
      },
      template,
    );
    expect([kept.targetReps, kept.targetRepsMax]).toEqual([8, 12]);

    const [swapped] = routineFromSession(
      {
        id: 's',
        name: 'Treino A',
        templateId: 'tmpl',
        startedAt: '',
        exercises: [exercise('crucifixo')],
      },
      template,
    );
    expect([swapped.targetReps, swapped.targetRepsMax]).toEqual([8, 12]);
  });

  it('travels with shared routines and ignores nonsense', () => {
    const payload = readSharePayload(buildRoutineShare(template, []))!;
    expect(payload.routines[0].exercises[0]).toMatchObject({
      targetReps: 8,
      targetRepsMax: 12,
    });
    const odd = readSharePayload({
      routines: [
        {
          name: 'R',
          exercises: [
            {
              exerciseId: 'x',
              exerciseName: 'X',
              targetReps: 12,
              targetRepsMax: 8,
            },
          ],
        },
      ],
    })!;
    expect(odd.routines[0].exercises[0].targetRepsMax).toBeUndefined();
  });
});
