import { ChevronRight, MapPin } from 'lucide-react';
import type { CompletedWorkout } from '../lib/types';
import {
  formatDurationMinutes,
  formatNumber,
  formatWeight,
  pluralize,
} from '../lib/format';
import { muscleCode } from '../lib/training';
import { findExercise, useStoreValue } from '../store';
import { gymOf } from '../lib/gyms';
import { Medal } from '../ui/Feedback';
import { cx } from '../ui/core';

const MONTHS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
];

function musclesOf(workout: CompletedWorkout): string[] {
  const groups = workout.exercises
    .map(
      (exercise) =>
        exercise.primaryMuscleGroup ??
        findExercise(exercise.exerciseId ?? '')?.primaryMuscleGroup,
    )
    .filter((group): group is string => Boolean(group));
  return [...new Set(groups)];
}

/**
 * A logbook entry: date block, name, the three numbers that matter and the
 * muscle groups trained. Personal records light the date block in ember.
 */
export function WorkoutCard({
  workout,
  ordinal,
  onOpen,
}: {
  workout: CompletedWorkout;
  ordinal?: number;
  onOpen: () => void;
}) {
  const date = new Date(workout.completedAt);
  const records = workout.prsAchieved.length;
  const muscles = musclesOf(workout);
  const names = workout.exercises.map((exercise) => exercise.exerciseName);
  const isToday = date.toDateString() === new Date().toDateString();
  const gym = gymOf(
    workout,
    useStoreValue((current) => current.gyms),
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir treino ${workout.name} de ${date.toLocaleDateString('pt-BR')}`}
      className="flex w-full items-stretch gap-3.5 rounded-lg border border-line bg-surface p-3.5 text-left transition-colors active:bg-raised"
    >
      <span
        className={cx(
          'flex w-13 shrink-0 flex-col items-center justify-center rounded-md py-2',
          records > 0 ? 'bg-brand-soft text-brand-ink' : 'bg-raised text-ink',
        )}
        aria-hidden="true"
      >
        <span className="font-metric text-metric-sm leading-none">
          {date.getDate()}
        </span>
        <span className="text-micro mt-1 font-semibold tracking-wider">
          {isToday ? 'HOJE' : MONTHS[date.getMonth()]}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-headline truncate font-semibold">
            {workout.name}
          </span>
          {ordinal !== undefined && (
            <span className="text-caption shrink-0 text-ink-3 tabular">
              #{ordinal}
            </span>
          )}
        </span>
        <span className="text-footnote mt-0.5 flex flex-wrap items-center gap-x-2 text-ink-2 tabular">
          <span>{formatDurationMinutes(workout.durationMinutes)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatWeight(workout.totalVolumeKg)} kg</span>
          <span aria-hidden="true">·</span>
          <span>{pluralize(workout.totalSets, 'série', 'séries')}</span>
          {gym && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={13} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{gym.name}</span>
            </span>
          )}
          {records > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-brand-ink">
              <Medal size={14} /> {formatNumber(records, 0)}{' '}
              {records === 1 ? 'recorde' : 'recordes'}
            </span>
          )}
        </span>
        {names.length > 0 && (
          <span className="text-footnote mt-2 flex items-center gap-2">
            <span className="flex shrink-0 gap-1" aria-hidden="true">
              {muscles.slice(0, 3).map((group) => (
                <span
                  key={group}
                  className="text-micro rounded-sm bg-raised px-1.5 py-0.5 font-semibold text-ink-2"
                >
                  {muscleCode(group)}
                </span>
              ))}
            </span>
            <span className="truncate text-ink-3">
              {names.slice(0, 2).join(', ')}
              {names.length > 2 ? ` +${names.length - 2}` : ''}
            </span>
          </span>
        )}
      </span>
      <ChevronRight
        size={18}
        className="shrink-0 self-center text-ink-3"
        aria-hidden="true"
      />
    </button>
  );
}
