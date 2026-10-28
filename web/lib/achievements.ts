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

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: MedalTier;
  progress: number;
  target: number;
}

export function achievements(
  history: CompletedWorkout[],
  records: PersonalRecordItem[],
  now: Date = new Date(),
): Achievement[] {
  const workouts = history.length;
  const volume = history.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);
  const streak = computeStreakWeeks(history, now);
  const bestStreak = Math.max(streak, longestStreak(history));
  const hours = history.map((w) =>
    new Date(w.startedAt || w.completedAt).getHours(),
  );
  const longest = Math.max(0, ...history.map((w) => w.durationMinutes || 0));
  const exercises = new Set(
    history.flatMap((w) =>
      w.exercises.map((e) => e.exerciseId ?? e.exerciseName.toLowerCase()),
    ),
  ).size;
  const recordCount = history.reduce((sum, w) => sum + w.prsAchieved.length, 0);

  const make = (
    id: string,
    title: string,
    description: string,
    emoji: string,
    tier: MedalTier,
    progress: number,
    target: number,
  ): Achievement => ({
    id,
    title,
    description,
    emoji,
    tier,
    progress: Math.min(progress, target),
    target,
  });

  return [
    make(
      'first',
      'Primeiro treino',
      'Conclua seu primeiro treino.',
      '🏁',
      'bronze',
      workouts,
      1,
    ),
    make(
      'w10',
      '10 treinos',
      'Finalize 10 treinos.',
      '💪',
      'bronze',
      workouts,
      10,
    ),
    make(
      'w50',
      '50 treinos',
      'Finalize 50 treinos.',
      '🏋️',
      'silver',
      workouts,
      50,
    ),
    make(
      'w100',
      'Centenário',
      'Finalize 100 treinos.',
      '💯',
      'gold',
      workouts,
      100,
    ),
    make(
      'w250',
      'Inabalável',
      'Finalize 250 treinos.',
      '🗿',
      'gold',
      workouts,
      250,
    ),
    make(
      's3',
      'Constância',
      '3 semanas seguidas treinando.',
      '🔥',
      'bronze',
      bestStreak,
      3,
    ),
    make(
      's8',
      'Hábito formado',
      '8 semanas seguidas treinando.',
      '📅',
      'silver',
      bestStreak,
      8,
    ),
    make(
      's16',
      'Disciplina',
      '16 semanas seguidas treinando.',
      '⚙️',
      'gold',
      bestStreak,
      16,
    ),
    make(
      's52',
      'Um ano sem parar',
      '52 semanas seguidas treinando.',
      '👑',
      'gold',
      bestStreak,
      52,
    ),
    make(
      'v10',
      '10 toneladas',
      '10.000 kg de volume acumulado.',
      '🧱',
      'bronze',
      volume,
      10_000,
    ),
    make(
      'v100',
      '100 toneladas',
      '100.000 kg de volume acumulado.',
      '🏗️',
      'silver',
      volume,
      100_000,
    ),
    make(
      'v1000',
      'Mil toneladas',
      '1.000.000 kg de volume acumulado.',
      '🚀',
      'gold',
      volume,
      1_000_000,
    ),
    make(
      'r1',
      'Primeiro recorde',
      'Bata uma marca pessoal.',
      '🥇',
      'bronze',
      Math.max(recordCount, records.length > 0 ? 1 : 0),
      1,
    ),
    make(
      'r25',
      'Caçador de recordes',
      'Bata 25 recordes pessoais.',
      '🎯',
      'silver',
      recordCount,
      25,
    ),
    make(
      'r100',
      'Máquina de recordes',
      'Bata 100 recordes pessoais.',
      '🏆',
      'gold',
      recordCount,
      100,
    ),
    make(
      'early',
      'Madrugador',
      'Comece um treino antes das 7h.',
      '🌅',
      'bronze',
      hours.some((h) => h < 7) ? 1 : 0,
      1,
    ),
    make(
      'late',
      'Coruja',
      'Comece um treino depois das 22h.',
      '🦉',
      'bronze',
      hours.some((h) => h >= 22) ? 1 : 0,
      1,
    ),
    make(
      'long',
      'Maratonista',
      'Um treino de 2 horas ou mais.',
      '⏱️',
      'silver',
      longest,
      120,
    ),
    make(
      'variety',
      'Repertório',
      'Faça 30 exercícios diferentes.',
      '🧭',
      'silver',
      exercises,
      30,
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
