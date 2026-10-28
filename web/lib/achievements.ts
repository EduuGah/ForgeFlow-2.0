import { computeStreakWeeks } from './training';
import type { CompletedWorkout, GoalItem, PersonalRecordItem } from './types';

/*
 * Levels and medals: XP earned by training, and a wall of achievements.
 * Everything comes from the history, so it is the same on every device.
 */

/* ------------------------------------------------------------------ */
/* XP and levels                                                       */
/* ------------------------------------------------------------------ */

/** XP of one workout: showing up, the work done and the records. */
export function workoutXp(workout: CompletedWorkout): number {
  return 50 + 2 * (workout.totalSets || 0) + 30 * workout.prsAchieved.length;
}

export function totalXp(
  history: CompletedWorkout[],
  goals: GoalItem[] = [],
): number {
  return (
    history.reduce((sum, workout) => sum + workoutXp(workout), 0) +
    100 * goals.filter((goal) => goal.status === 'completed').length
  );
}

/** XP needed to reach `level` (level 1 starts at 0): 100, 300, 600, 1000… */
export function levelStart(level: number): number {
  return 50 * (level - 1) * level;
}

const TITLES: [number, string][] = [
  [40, 'Lenda'],
  [25, 'Elite'],
  [15, 'Veterano'],
  [10, 'Atleta'],
  [5, 'Aprendiz'],
  [1, 'Iniciante'],
];

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP inside this level and the size of the level. */
  into: number;
  span: number;
}

export function levelOf(xp: number): LevelInfo {
  let level = 1;
  while (levelStart(level + 1) <= xp) level += 1;
  const start = levelStart(level);
  return {
    level,
    title: TITLES.find(([min]) => level >= min)?.[1] ?? 'Iniciante',
    xp,
    into: xp - start,
    span: levelStart(level + 1) - start,
  };
}

/* ------------------------------------------------------------------ */
/* Medals                                                              */
/* ------------------------------------------------------------------ */

export type MedalTier = 'bronze' | 'silver' | 'gold';

export const MEDAL_CATEGORIES = [
  'Treinos',
  'Constância',
  'Volume',
  'Recordes',
  'Estilo',
  'Metas e corpo',
  'Amigos',
] as const;
export type MedalCategory = (typeof MEDAL_CATEGORIES)[number];

export interface Achievement {
  id: string;
  category: MedalCategory;
  title: string;
  description: string;
  emoji: string;
  tier: MedalTier;
  progress: number;
  target: number;
}

/** What the medals look at besides workouts and records. */
export interface MedalContext {
  goals?: GoalItem[];
  measurements?: number;
  friends?: number;
}

const MUSCLE_GROUPS_ALL = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Biceps',
  'Triceps',
  'Antebracos',
  'Core',
];

function weekKey(iso: string): number {
  const date = new Date(iso);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.getTime();
}

export function achievements(
  history: CompletedWorkout[],
  records: PersonalRecordItem[],
  context: MedalContext = {},
  now: Date = new Date(),
): Achievement[] {
  const workouts = history.length;
  const volume = history.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);
  const sets = history.reduce((sum, w) => sum + (w.totalSets || 0), 0);
  const reps = history.reduce((sum, w) => sum + (w.totalReps || 0), 0);
  const streak = computeStreakWeeks(history, now);
  const bestStreak = Math.max(streak, longestStreak(history));
  const hours = history.map((w) =>
    new Date(w.startedAt || w.completedAt).getHours(),
  );
  const longest = Math.max(0, ...history.map((w) => w.durationMinutes || 0));
  const heaviestDay = Math.max(0, ...history.map((w) => w.totalVolumeKg || 0));
  const quick = history.some(
    (w) => w.durationMinutes > 0 && w.durationMinutes <= 30 && w.totalSets >= 6,
  );
  const exercises = new Set(
    history.flatMap((w) =>
      w.exercises.map((e) => e.exerciseId ?? e.exerciseName.toLowerCase()),
    ),
  ).size;
  const recordCount = history.reduce((sum, w) => sum + w.prsAchieved.length, 0);
  const recordDay = Math.max(0, ...history.map((w) => w.prsAchieved.length));

  // Per week and per month counts.
  const byWeek = new Map<
    number,
    { count: number; days: Set<number>; groups: Set<string> }
  >();
  const byMonth = new Map<string, number>();
  for (const workout of history) {
    const key = weekKey(workout.completedAt);
    const entry = byWeek.get(key) ?? {
      count: 0,
      days: new Set(),
      groups: new Set(),
    };
    entry.count += 1;
    entry.days.add(new Date(workout.completedAt).getDay());
    for (const exercise of workout.exercises)
      if (exercise.primaryMuscleGroup)
        entry.groups.add(exercise.primaryMuscleGroup);
    byWeek.set(key, entry);
    const date = new Date(workout.completedAt);
    const month = `${date.getFullYear()}-${date.getMonth()}`;
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  const weeks = [...byWeek.values()];
  const bestWeek = Math.max(0, ...weeks.map((week) => week.count));
  const bestMonth = Math.max(0, ...byMonth.values());
  const weekend = weeks.some((week) => week.days.has(6) && week.days.has(0));
  const fullBody = Math.max(
    0,
    ...weeks.map(
      (week) =>
        MUSCLE_GROUPS_ALL.filter((group) => week.groups.has(group)).length,
    ),
  );
  const goalsDone = (context.goals ?? []).filter(
    (goal) => goal.status === 'completed',
  ).length;
  const measurements = context.measurements ?? 0;
  const friends = context.friends ?? 0;

  const make = (
    category: MedalCategory,
    id: string,
    title: string,
    description: string,
    emoji: string,
    tier: MedalTier,
    progress: number,
    target: number,
  ): Achievement => ({
    id,
    category,
    title,
    description,
    emoji,
    tier,
    progress: Math.min(progress, target),
    target,
  });

  return [
    make(
      'Treinos',
      'first',
      'Primeiro treino',
      'Conclua seu primeiro treino.',
      '🏁',
      'bronze',
      workouts,
      1,
    ),
    make(
      'Treinos',
      'w10',
      '10 treinos',
      'Finalize 10 treinos.',
      '💪',
      'bronze',
      workouts,
      10,
    ),
    make(
      'Treinos',
      'w25',
      '25 treinos',
      'Finalize 25 treinos.',
      '🎽',
      'bronze',
      workouts,
      25,
    ),
    make(
      'Treinos',
      'w50',
      '50 treinos',
      'Finalize 50 treinos.',
      '🏋️',
      'silver',
      workouts,
      50,
    ),
    make(
      'Treinos',
      'w100',
      'Centenário',
      'Finalize 100 treinos.',
      '💯',
      'gold',
      workouts,
      100,
    ),
    make(
      'Treinos',
      'w250',
      'Inabalável',
      'Finalize 250 treinos.',
      '🗿',
      'gold',
      workouts,
      250,
    ),
    make(
      'Treinos',
      'w500',
      'Lenda viva',
      'Finalize 500 treinos.',
      '🦁',
      'gold',
      workouts,
      500,
    ),

    make(
      'Constância',
      's3',
      'Constância',
      '3 semanas seguidas treinando.',
      '🔥',
      'bronze',
      bestStreak,
      3,
    ),
    make(
      'Constância',
      's8',
      'Hábito formado',
      '8 semanas seguidas treinando.',
      '📅',
      'silver',
      bestStreak,
      8,
    ),
    make(
      'Constância',
      's16',
      'Disciplina',
      '16 semanas seguidas treinando.',
      '⚙️',
      'gold',
      bestStreak,
      16,
    ),
    make(
      'Constância',
      's26',
      'Meio ano firme',
      '26 semanas seguidas treinando.',
      '🌗',
      'gold',
      bestStreak,
      26,
    ),
    make(
      'Constância',
      's52',
      'Um ano sem parar',
      '52 semanas seguidas treinando.',
      '👑',
      'gold',
      bestStreak,
      52,
    ),
    make(
      'Constância',
      'week5',
      'Semana cheia',
      '5 treinos na mesma semana.',
      '🗓️',
      'silver',
      bestWeek,
      5,
    ),
    make(
      'Constância',
      'month12',
      'Mês de ferro',
      '12 treinos no mesmo mês.',
      '🛡️',
      'silver',
      bestMonth,
      12,
    ),
    make(
      'Constância',
      'month20',
      'Mês lendário',
      '20 treinos no mesmo mês.',
      '⚔️',
      'gold',
      bestMonth,
      20,
    ),
    make(
      'Constância',
      'weekend',
      'Fim de semana ativo',
      'Treine no sábado e no domingo da mesma semana.',
      '🏖️',
      'bronze',
      weekend ? 1 : 0,
      1,
    ),

    make(
      'Volume',
      'v10',
      '10 toneladas',
      '10.000 kg de volume acumulado.',
      '🧱',
      'bronze',
      volume,
      10_000,
    ),
    make(
      'Volume',
      'v50',
      '50 toneladas',
      '50.000 kg de volume acumulado.',
      '🚚',
      'bronze',
      volume,
      50_000,
    ),
    make(
      'Volume',
      'v100',
      '100 toneladas',
      '100.000 kg de volume acumulado.',
      '🏗️',
      'silver',
      volume,
      100_000,
    ),
    make(
      'Volume',
      'v250',
      '250 toneladas',
      '250.000 kg de volume acumulado.',
      '🚢',
      'silver',
      volume,
      250_000,
    ),
    make(
      'Volume',
      'v500',
      '500 toneladas',
      '500.000 kg de volume acumulado.',
      '🛫',
      'gold',
      volume,
      500_000,
    ),
    make(
      'Volume',
      'v1000',
      'Mil toneladas',
      '1.000.000 kg de volume acumulado.',
      '🚀',
      'gold',
      volume,
      1_000_000,
    ),
    make(
      'Volume',
      'sets1000',
      'Mil séries',
      '1.000 séries de trabalho.',
      '🔁',
      'silver',
      sets,
      1000,
    ),
    make(
      'Volume',
      'reps10k',
      '10 mil repetições',
      '10.000 repetições registradas.',
      '🔟',
      'silver',
      reps,
      10_000,
    ),
    make(
      'Volume',
      'bigday',
      'Dia pesado',
      '10.000 kg de volume em um treino.',
      '🐘',
      'silver',
      heaviestDay,
      10_000,
    ),

    make(
      'Recordes',
      'r1',
      'Primeiro recorde',
      'Bata uma marca pessoal.',
      '🥇',
      'bronze',
      Math.max(recordCount, records.length > 0 ? 1 : 0),
      1,
    ),
    make(
      'Recordes',
      'r10',
      '10 recordes',
      'Bata 10 recordes pessoais.',
      '📈',
      'bronze',
      recordCount,
      10,
    ),
    make(
      'Recordes',
      'r25',
      'Caçador de recordes',
      'Bata 25 recordes pessoais.',
      '🎯',
      'silver',
      recordCount,
      25,
    ),
    make(
      'Recordes',
      'r50',
      'Colecionador',
      'Bata 50 recordes pessoais.',
      '🧲',
      'silver',
      recordCount,
      50,
    ),
    make(
      'Recordes',
      'r100',
      'Máquina de recordes',
      'Bata 100 recordes pessoais.',
      '🏆',
      'gold',
      recordCount,
      100,
    ),
    make(
      'Recordes',
      'prday',
      'Dia de recordes',
      '3 recordes no mesmo treino.',
      '🎆',
      'silver',
      recordDay,
      3,
    ),

    make(
      'Estilo',
      'early',
      'Madrugador',
      'Comece um treino antes das 7h.',
      '🌅',
      'bronze',
      hours.some((h) => h < 7) ? 1 : 0,
      1,
    ),
    make(
      'Estilo',
      'late',
      'Coruja',
      'Comece um treino depois das 22h.',
      '🦉',
      'bronze',
      hours.some((h) => h >= 22) ? 1 : 0,
      1,
    ),
    make(
      'Estilo',
      'quick',
      'Expresso',
      'Treino de até 30 min com 6 séries ou mais.',
      '⚡',
      'bronze',
      quick ? 1 : 0,
      1,
    ),
    make(
      'Estilo',
      'long',
      'Maratonista',
      'Um treino de 2 horas ou mais.',
      '⏱️',
      'silver',
      longest,
      120,
    ),
    make(
      'Estilo',
      'variety',
      'Repertório',
      'Faça 30 exercícios diferentes.',
      '🧭',
      'silver',
      exercises,
      30,
    ),
    make(
      'Estilo',
      'variety60',
      'Enciclopédia',
      'Faça 60 exercícios diferentes.',
      '📚',
      'gold',
      exercises,
      60,
    ),
    make(
      'Estilo',
      'fullbody',
      'Corpo completo',
      'Treine os 8 grupos musculares na mesma semana.',
      '🧩',
      'silver',
      fullBody,
      8,
    ),

    make(
      'Metas e corpo',
      'goal1',
      'Meta batida',
      'Conclua uma meta.',
      '🎯',
      'bronze',
      goalsDone,
      1,
    ),
    make(
      'Metas e corpo',
      'goal5',
      'Focado',
      'Conclua 5 metas.',
      '🧠',
      'silver',
      goalsDone,
      5,
    ),
    make(
      'Metas e corpo',
      'measure1',
      'Primeira medida',
      'Registre peso ou medidas.',
      '📏',
      'bronze',
      measurements,
      1,
    ),
    make(
      'Metas e corpo',
      'measure10',
      'Acompanhando o corpo',
      'Registre medidas 10 vezes.',
      '📐',
      'silver',
      measurements,
      10,
    ),

    make(
      'Amigos',
      'friend1',
      'Primeiro parceiro',
      'Adicione um amigo.',
      '🤝',
      'bronze',
      friends,
      1,
    ),
    make(
      'Amigos',
      'friend5',
      'Turma formada',
      'Tenha 5 amigos.',
      '👥',
      'silver',
      friends,
      5,
    ),
  ];
}

/** The longest run of Monday-based weeks with a workout, ever. */
export function longestStreak(history: CompletedWorkout[]): number {
  const weeks = [
    ...new Set(
      history.map((workout) => {
        const date = new Date(workout.completedAt);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        return date.getTime();
      }),
    ),
  ].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const week of weeks) {
    // 6 to 8 days apart: the next week (allowing for daylight saving).
    run =
      previous !== null &&
      Math.abs(week - previous - 7 * 86_400_000) < 2 * 3_600_000
        ? run + 1
        : 1;
    best = Math.max(best, run);
    previous = week;
  }
  return best;
}
