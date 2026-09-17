import type { GoalMetric, GoalType } from './entities';

export const goalTypeDefinitions: Record<
  GoalType,
  {
    exerciseRequired: boolean;
    label: string;
    manualBaseline: boolean;
    metric: GoalMetric;
    unit: string;
  }
> = {
  body_weight: {
    exerciseRequired: false,
    label: 'Peso corporal',
    manualBaseline: true,
    metric: 'body_weight_kg',
    unit: 'kg',
  },
  custom: {
    exerciseRequired: false,
    label: 'Personalizada',
    manualBaseline: true,
    metric: 'custom_value',
    unit: '',
  },
  exercise_repetitions: {
    exerciseRequired: true,
    label: 'Repeticoes no exercicio',
    manualBaseline: false,
    metric: 'repetitions',
    unit: 'reps',
  },
  exercise_volume: {
    exerciseRequired: true,
    label: 'Volume no exercicio',
    manualBaseline: false,
    metric: 'volume_kg',
    unit: 'kg',
  },
  exercise_weight: {
    exerciseRequired: true,
    label: 'Peso no exercicio',
    manualBaseline: false,
    metric: 'weight_kg',
    unit: 'kg',
  },
  monthly_workout_count: {
    exerciseRequired: false,
    label: 'Treinos no mes',
    manualBaseline: false,
    metric: 'workout_count',
    unit: 'treinos',
  },
  pr_achievement: {
    exerciseRequired: false,
    label: 'Recordes pessoais',
    manualBaseline: false,
    metric: 'personal_record_count',
    unit: 'PRs',
  },
  total_volume: {
    exerciseRequired: false,
    label: 'Volume total',
    manualBaseline: false,
    metric: 'volume_kg',
    unit: 'kg',
  },
  workout_frequency: {
    exerciseRequired: false,
    label: 'Frequencia semanal',
    manualBaseline: false,
    metric: 'workout_frequency_per_week',
    unit: 'treinos/semana',
  },
};
