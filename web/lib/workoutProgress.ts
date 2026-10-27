import type { ActiveWorkoutState, RestTimerState } from './types';

/** "▰▰▰▱▱▱▱▱▱▱": a progress bar that fits in a notification's text. */
export function progressBar(fraction: number, width = 10): string {
  const safe = Number.isFinite(fraction)
    ? Math.min(1, Math.max(0, fraction))
    : 0;
  const filled = Math.round(safe * width);
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

function clock(epochMs: number): string {
  const date = new Date(epochMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * The notification shown while a workout runs in the background: progress,
 * time, the exercise up next and when the rest ends.
 */
export function workoutProgressNotice(
  workout: ActiveWorkoutState,
  restTimer: RestTimerState,
  now: number,
): { title: string; body: string } {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const done = sets.filter((set) => set.completed).length;
  const minutes = Math.max(
    0,
    Math.floor((now - Date.parse(workout.startedAt)) / 60_000),
  );
  const current = workout.exercises.find((exercise) =>
    exercise.sets.some((set) => !set.completed),
  );
  const lines = [
    `${progressBar(sets.length ? done / sets.length : 0)} ${done}/${sets.length} séries · ${minutes} min`,
  ];
  if (
    restTimer.status === 'running' &&
    restTimer.endsAt &&
    restTimer.endsAt > now
  )
    lines.push(`Descanso até ${clock(restTimer.endsAt)}`);
  else if (restTimer.status === 'paused') lines.push('Descanso pausado');
  if (current) lines.push(`Agora: ${current.exerciseName}`);
  else if (sets.length > 0) lines.push('Tudo feito: toque para finalizar');
  return { title: `${workout.name} em andamento`, body: lines.join('\n') };
}
