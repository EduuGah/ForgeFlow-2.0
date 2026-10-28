import type { CompletedSet, CompletedWorkout } from './types';

/*
 * A finished workout as plain text, in the format people already paste in
 * chats (the one Hevy uses):
 *
 *   Upper B
 *   quinta-feira, out 22, 2026 às 8:13pm
 *
 *   Supino Inclinado (Halter)
 *   Série 1: 40 kg x 6 [Aquecimento]
 *   Série 2: 52 kg x 10
 */

const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** "quinta-feira, out 22, 2026 às 8:13pm" (local time). */
export function shareDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} às ${hour12}:${minutes}${hours < 12 ? 'am' : 'pm'}`;
}

/** 12.5, 60, 52.25: a dot for decimals and no trailing zeros. */
function kg(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function clock(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

export function shareSetText(set: CompletedSet): string {
  const distance = set.distanceKm ?? 0;
  const seconds = set.durationSeconds ?? 0;
  let text: string;
  if (set.repetitions <= 0 && (distance > 0 || seconds > 0)) {
    const parts: string[] = [];
    if (distance > 0) parts.push(`${kg(distance)} km`);
    if (seconds > 0) parts.push(clock(seconds));
    if (set.weightKg > 0) parts.push(`${kg(set.weightKg)} kg`);
    text = parts.join(' · ');
  } else if (set.weightKg > 0) {
    text = `${kg(set.weightKg)} kg x ${set.repetitions}`;
  } else {
    text = `${set.repetitions} reps`;
  }
  return set.type === 'warmup' ? `${text} [Aquecimento]` : text;
}

export function workoutShareText(
  workout: CompletedWorkout,
  appUrl?: string,
): string {
  const blocks = [
    [workout.name, shareDate(workout.startedAt || workout.completedAt)].join(
      '\n',
    ),
    ...workout.exercises.map((exercise) => {
      const lines = [exercise.exerciseName];
      if (exercise.sets && exercise.sets.length > 0) {
        exercise.sets.forEach((set, index) =>
          lines.push(`Série ${index + 1}: ${shareSetText(set)}`),
        );
      } else {
        // Workouts recorded before per-set history: only the summary exists.
        lines.push(
          `${exercise.setsCount} ${exercise.setsCount === 1 ? 'série' : 'séries'}${exercise.bestWeightKg > 0 ? ` · melhor ${kg(exercise.bestWeightKg)} kg` : ''}`,
        );
      }
      return lines.join('\n');
    }),
    ['@forgeflow', appUrl].filter(Boolean).join('\n'),
  ];
  return blocks.join('\n\n');
}
