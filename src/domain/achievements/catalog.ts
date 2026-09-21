import type { AchievementType } from './entities';

export type AchievementMetric =
  | 'completed_goal_count'
  | 'estimated_1rm_growth_percent'
  | 'personal_record_count'
  | 'training_volume_kg'
  | 'weekly_streak'
  | 'workout_count';

export type AchievementDefinition = {
  category: 'consistency' | 'goals' | 'progress' | 'strength' | 'training';
  description: string;
  metric: AchievementMetric;
  threshold: number;
  title: string;
  type: AchievementType;
};

export const achievementCatalog: readonly AchievementDefinition[] = [
  definition(
    'first_workout',
    'training',
    'workout_count',
    1,
    'Primeiro passo',
    'Conclua seu primeiro treino.',
  ),
  definition(
    'first_personal_record',
    'strength',
    'personal_record_count',
    1,
    'Novo recorde',
    'Conquiste seu primeiro recorde pessoal.',
  ),
  definition(
    'workout_streak_3_weeks',
    'consistency',
    'weekly_streak',
    3,
    'Ritmo criado',
    'Treine por 3 semanas consecutivas.',
  ),
  definition(
    'workout_streak_7_weeks',
    'consistency',
    'weekly_streak',
    7,
    'Constancia real',
    'Treine por 7 semanas consecutivas.',
  ),
  definition(
    'workout_streak_12_weeks',
    'consistency',
    'weekly_streak',
    12,
    'Trimestre consistente',
    'Treine por 12 semanas consecutivas.',
  ),
  definition(
    'workout_count_10',
    'training',
    'workout_count',
    10,
    'Dez treinos',
    'Conclua 10 treinos.',
  ),
  definition(
    'workout_count_25',
    'training',
    'workout_count',
    25,
    'Vinte e cinco',
    'Conclua 25 treinos.',
  ),
  definition(
    'workout_count_50',
    'training',
    'workout_count',
    50,
    'Meio centenario',
    'Conclua 50 treinos.',
  ),
  definition(
    'workout_count_100',
    'training',
    'workout_count',
    100,
    'Clube dos cem',
    'Conclua 100 treinos.',
  ),
  definition(
    'volume_10000_kg',
    'training',
    'training_volume_kg',
    10_000,
    'Dez toneladas',
    'Movimente 10.000 kg em treinos.',
  ),
  definition(
    'volume_50000_kg',
    'training',
    'training_volume_kg',
    50_000,
    'Carga acumulada',
    'Movimente 50.000 kg em treinos.',
  ),
  definition(
    'volume_100000_kg',
    'training',
    'training_volume_kg',
    100_000,
    'Cem toneladas',
    'Movimente 100.000 kg em treinos.',
  ),
  definition(
    'volume_500000_kg',
    'training',
    'training_volume_kg',
    500_000,
    'Forca acumulada',
    'Movimente 500.000 kg em treinos.',
  ),
  definition(
    'goals_completed_1',
    'goals',
    'completed_goal_count',
    1,
    'Meta alcancada',
    'Conclua sua primeira meta.',
  ),
  definition(
    'goals_completed_5',
    'goals',
    'completed_goal_count',
    5,
    'Foco comprovado',
    'Conclua 5 metas.',
  ),
  definition(
    'goals_completed_10',
    'goals',
    'completed_goal_count',
    10,
    'Dez metas',
    'Conclua 10 metas.',
  ),
  definition(
    'estimated_1rm_growth_5',
    'progress',
    'estimated_1rm_growth_percent',
    5,
    'Evolucao de 5%',
    'Aumente seu 1RM estimado em 5%.',
  ),
  definition(
    'estimated_1rm_growth_10',
    'progress',
    'estimated_1rm_growth_percent',
    10,
    'Evolucao de 10%',
    'Aumente seu 1RM estimado em 10%.',
  ),
  definition(
    'estimated_1rm_growth_25',
    'progress',
    'estimated_1rm_growth_percent',
    25,
    'Evolucao de 25%',
    'Aumente seu 1RM estimado em 25%.',
  ),
] as const;

export const achievementDefinitions = Object.fromEntries(
  achievementCatalog.map((definition) => [definition.type, definition]),
) as Record<AchievementType, AchievementDefinition>;

function definition(
  type: AchievementType,
  category: AchievementDefinition['category'],
  metric: AchievementMetric,
  threshold: number,
  title: string,
  description: string,
): AchievementDefinition {
  return { category, description, metric, threshold, title, type };
}
