import {
  isUntouchedSampleGoal,
  isUntouchedSampleRoutine,
  removeUntouchedSamples,
} from './samples';
import type { CompletedWorkout, GoalItem, WorkoutTemplateItem } from './types';

const SAMPLE_A: WorkoutTemplateItem = {
  id: 'tmpl-1',
  name: 'Treino A - Peito, Ombros e Tríceps',
  description: 'Foco em força no supino e hipertrofia de deltoides e tríceps.',
  exercises: [
    [4, 8, 80, 90],
    [3, 10, 28, 60],
    [3, 8, 45, 75],
    [4, 12, 12, 45],
    [4, 12, 25, 45],
  ].map(([targetSets, targetReps, targetWeightKg, restSeconds], index) => ({
    // Ids and names changed between versions; they must not matter.
    exerciseId: `old-id-${index}`,
    exerciseName: `Exercício ${index}`,
    targetSets,
    targetReps,
    targetWeightKg,
    restSeconds,
  })),
};

const SAMPLE_GOAL: GoalItem = {
  id: 'goal-1',
  title: 'Frequência Semanal de Treinos',
  type: 'frequency',
  currentValue: 2,
  targetValue: 4,
  unit: 'treinos/sem',
  status: 'active',
};

function workout(overrides: Partial<CompletedWorkout>): CompletedWorkout {
  return {
    id: 'w1',
    name: 'Outro treino',
    startedAt: '2026-09-01T10:00:00.000Z',
    completedAt: '2026-09-01T11:00:00.000Z',
    durationMinutes: 60,
    totalVolumeKg: 0,
    totalSets: 0,
    exercises: [],
    prsAchieved: [],
    ...overrides,
  };
}

describe('sample routines from earlier versions', () => {
  it('recognizes an untouched sample, whatever its exercise ids', () => {
    expect(isUntouchedSampleRoutine(SAMPLE_A, [])).toBe(true);
  });

  it('keeps samples the person edited', () => {
    const renamed = { ...SAMPLE_A, name: 'Meu treino A' };
    const heavier = {
      ...SAMPLE_A,
      exercises: SAMPLE_A.exercises.map((exercise, index) =>
        index === 0 ? { ...exercise, targetWeightKg: 85 } : exercise,
      ),
    };
    const shorter = { ...SAMPLE_A, exercises: SAMPLE_A.exercises.slice(1) };
    expect(isUntouchedSampleRoutine(renamed, [])).toBe(false);
    expect(isUntouchedSampleRoutine(heavier, [])).toBe(false);
    expect(isUntouchedSampleRoutine(shorter, [])).toBe(false);
  });

  it('keeps samples that were used in a workout', () => {
    expect(
      isUntouchedSampleRoutine(SAMPLE_A, [workout({ templateId: 'tmpl-1' })]),
    ).toBe(false);
    expect(
      isUntouchedSampleRoutine(SAMPLE_A, [workout({ name: SAMPLE_A.name })]),
    ).toBe(false);
    expect(isUntouchedSampleRoutine(SAMPLE_A, [], 'tmpl-1')).toBe(false);
  });

  it('never matches the person’s own routines', () => {
    expect(isUntouchedSampleRoutine({ ...SAMPLE_A, id: 'tmpl-abc' }, [])).toBe(
      false,
    );
  });
});

describe('sample goals from earlier versions', () => {
  it('recognizes current and legacy titles', () => {
    expect(isUntouchedSampleGoal(SAMPLE_GOAL)).toBe(true);
    expect(
      isUntouchedSampleGoal({
        ...SAMPLE_GOAL,
        title: 'Treinar 4 vezes por semana',
      }),
    ).toBe(true);
  });

  it('keeps edited or completed goals', () => {
    expect(isUntouchedSampleGoal({ ...SAMPLE_GOAL, targetValue: 5 })).toBe(
      false,
    );
    expect(
      isUntouchedSampleGoal({ ...SAMPLE_GOAL, title: 'Treinar mais' }),
    ).toBe(false);
    expect(isUntouchedSampleGoal({ ...SAMPLE_GOAL, status: 'completed' })).toBe(
      false,
    );
  });
});

describe('removeUntouchedSamples', () => {
  it('removes only untouched samples and reports their ids', () => {
    const mine: WorkoutTemplateItem = {
      id: 'tmpl-mine',
      name: 'Upper',
      description: '',
      exercises: [],
    };
    const result = removeUntouchedSamples(
      [SAMPLE_A, mine],
      [SAMPLE_GOAL, { ...SAMPLE_GOAL, id: 'goal-mine' }],
      [],
    );
    expect(result.templates).toEqual([mine]);
    expect(result.goals.map((goal) => goal.id)).toEqual(['goal-mine']);
    expect(result.removedTemplateIds).toEqual(['tmpl-1']);
    expect(result.removedGoalIds).toEqual(['goal-1']);
  });

  it('returns the same arrays when there is nothing to remove', () => {
    const templates: WorkoutTemplateItem[] = [];
    const goals: GoalItem[] = [];
    const result = removeUntouchedSamples(templates, goals, []);
    expect(result.templates).toBe(templates);
    expect(result.goals).toBe(goals);
  });
});
