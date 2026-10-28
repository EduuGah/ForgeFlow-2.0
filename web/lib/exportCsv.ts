import type { CompletedWorkout } from './types';

/*
 * Workouts as a CSV in Hevy's format: one row per set, readable by
 * spreadsheets, by Hevy/Strong importers and by ForgeFlow's own importer.
 * Times are local ("2026-10-22 20:13:00"), as those apps write them.
 */

const HEADER = [
  'title',
  'start_time',
  'end_time',
  'description',
  'exercise_title',
  'superset_id',
  'exercise_notes',
  'set_index',
  'set_type',
  'weight_kg',
  'reps',
  'distance_km',
  'duration_seconds',
  'rpe',
];

function cell(value: string | number | undefined | null): string {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function localTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function workoutsToCsv(workouts: CompletedWorkout[]): string {
  const lines = [HEADER.join(',')];
  const ordered = [...workouts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt),
  );
  for (const workout of ordered) {
    const base = [
      workout.name,
      localTime(workout.startedAt || workout.completedAt),
      localTime(workout.completedAt),
      workout.notes ?? '',
    ];
    for (const exercise of workout.exercises) {
      // Older workouts kept only a summary: one row per set, best load.
      const sets =
        exercise.sets ??
        Array.from({ length: Math.max(1, exercise.setsCount) }, () => ({
          type: 'working' as const,
          weightKg: exercise.bestWeightKg,
          repetitions: 0,
        }));
      sets.forEach((set, index) => {
        lines.push(
          [
            ...base,
            exercise.exerciseName,
            exercise.supersetId ?? '',
            exercise.notes ?? '',
            index,
            set.type === 'warmup'
              ? 'warmup'
              : 'tag' in set && set.tag === 'failure'
                ? 'failure'
                : 'tag' in set && set.tag === 'dropset'
                  ? 'dropset'
                  : 'normal',
            set.weightKg || '',
            set.repetitions || '',
            'distanceKm' in set ? (set.distanceKm ?? '') : '',
            'durationSeconds' in set ? (set.durationSeconds ?? '') : '',
            'rpe' in set ? (set.rpe ?? '') : '',
          ]
            .map(cell)
            .join(','),
        );
      });
    }
  }
  return `${lines.join('\n')}\n`;
}
