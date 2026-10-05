import type { CompletedWorkout, GoalItem, WorkoutTemplateItem } from './types';

/*
 * Earlier versions created three sample routines and four sample goals for
 * every new account. Accounts now start empty; these signatures exist only to
 * recognize the samples and remove them while the person never changed or
 * used them. Exercise ids and names changed between versions, so routines are
 * matched by id, name, description and set/rep/load/rest targets.
 */

type Targets = [sets: number, reps: number, weightKg: number, rest: number];

const SAMPLE_ROUTINES: {
  id: string;
  name: string;
  description: string;
  targets: Targets[];
}[] = [
  {
    id: 'tmpl-1',
    name: 'Treino A - Peito, Ombros e Tríceps',
    description:
      'Foco em força no supino e hipertrofia de deltoides e tríceps.',
    targets: [
      [4, 8, 80, 90],
      [3, 10, 28, 60],
      [3, 8, 45, 75],
      [4, 12, 12, 45],
      [4, 12, 25, 45],
    ],
  },
  {
    id: 'tmpl-2',
    name: 'Treino B - Costas e Bíceps',
    description:
      'Puxadas pesadas para espessura e largura de dorsais com finalização de bíceps.',
    targets: [
      [4, 10, 0, 90],
      [4, 8, 70, 90],
      [3, 10, 65, 60],
      [3, 10, 30, 60],
      [3, 12, 14, 45],
    ],
  },
  {
    id: 'tmpl-3',
    name: 'Treino C - Pernas e Abdômen',
    description:
      'Quadríceps, posteriores, panturrilhas e estabilização de core.',
    targets: [
      [4, 8, 100, 120],
      [4, 10, 200, 90],
      [3, 12, 50, 60],
      [3, 12, 40, 60],
      [3, 60, 0, 45],
    ],
  },
];

const SAMPLE_GOALS: { id: string; titles: string[]; targetValue: number }[] = [
  {
    id: 'goal-1',
    titles: ['Treinar 4 vezes por semana', 'Frequência Semanal de Treinos'],
    targetValue: 4,
  },
  {
    id: 'goal-2',
    titles: ['Supino reto com 100 kg', 'Meta de Carga no Supino Reto'],
    targetValue: 100,
  },
  {
    id: 'goal-3',
    titles: ['Beber 2,5 L de água por dia', 'Hidratação Diária Consistente'],
    targetValue: 2500,
  },
  {
    id: 'goal-4',
    titles: ['Agachamento com 120 kg', 'Agachamento Livre 120kg'],
    targetValue: 120,
  },
];

export function isUntouchedSampleRoutine(
  template: WorkoutTemplateItem,
  history: CompletedWorkout[],
  activeTemplateId?: string,
): boolean {
  const sample = SAMPLE_ROUTINES.find((item) => item.id === template.id);
  if (!sample) return false;
  if (
    template.name !== sample.name ||
    (template.description ?? '').trim() !== sample.description ||
    template.exercises.length !== sample.targets.length
  )
    return false;
  const sameTargets = template.exercises.every((exercise, index) => {
    const [sets, reps, weightKg, rest] = sample.targets[index];
    return (
      exercise.targetSets === sets &&
      exercise.targetReps === reps &&
      (exercise.targetWeightKg ?? 0) === weightKg &&
      (exercise.restSeconds ?? rest) === rest
    );
  });
  if (!sameTargets) return false;
  // Used at least once: it is the person's routine now.
  if (activeTemplateId === template.id) return false;
  return !history.some(
    (workout) =>
      workout.templateId === template.id || workout.name === template.name,
  );
}

export function isUntouchedSampleGoal(goal: GoalItem): boolean {
  const sample = SAMPLE_GOALS.find((item) => item.id === goal.id);
  return (
    sample !== undefined &&
    goal.status === 'active' &&
    goal.targetValue === sample.targetValue &&
    sample.titles.includes(goal.title)
  );
}

export interface SampleCleanup {
  templates: WorkoutTemplateItem[];
  goals: GoalItem[];
  removedTemplateIds: string[];
  removedGoalIds: string[];
}

export function removeUntouchedSamples(
  templates: WorkoutTemplateItem[],
  goals: GoalItem[],
  history: CompletedWorkout[],
  activeTemplateId?: string,
): SampleCleanup {
  const removedTemplateIds = templates
    .filter((template) =>
      isUntouchedSampleRoutine(template, history, activeTemplateId),
    )
    .map((template) => template.id);
  const removedGoalIds = goals
    .filter(isUntouchedSampleGoal)
    .map((goal) => goal.id);
  return {
    templates:
      removedTemplateIds.length === 0
        ? templates
        : templates.filter((t) => !removedTemplateIds.includes(t.id)),
    goals:
      removedGoalIds.length === 0
        ? goals
        : goals.filter((g) => !removedGoalIds.includes(g.id)),
    removedTemplateIds,
    removedGoalIds,
  };
}
