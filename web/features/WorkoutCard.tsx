import { Dumbbell } from 'lucide-react';
import type { CompletedWorkout } from '../lib/types';
import {
  formatDurationMinutes,
  formatRelativeDay,
  formatWeight,
} from '../lib/format';
import { findExercise } from '../store';
import { Avatar, ExerciseThumb, Medal } from '../ui/Feedback';
import { Stat } from '../ui/Layout';

const PREVIEW_COUNT = 3;

/** Feed card of a completed workout (Hevy home/profile style). */
export function WorkoutCard({
  workout,
  ordinal,
  athleteName,
  photoUrl,
  onOpen,
}: {
  workout: CompletedWorkout;
  ordinal?: number;
  athleteName: string;
  photoUrl?: string | null;
  onOpen: () => void;
}) {
  const records = workout.prsAchieved.length;
  const hidden = Math.max(0, workout.exercises.length - PREVIEW_COUNT);

  return (
    <article className="bg-surface">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full px-4 pt-4 pb-3 text-left transition-colors active:bg-raised"
        aria-label={`Abrir treino ${workout.name}`}
      >
        <div className="flex items-center gap-3">
          <Avatar name={athleteName} photoUrl={photoUrl} size={44} />
          <div className="min-w-0">
            <p className="text-body truncate font-medium">{athleteName}</p>
            <p className="text-footnote flex items-center gap-2 text-ink-2">
              {ordinal !== undefined && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-raised px-1.5 py-0.5 text-ink">
                  <Dumbbell size={12} aria-hidden="true" />
                  {ordinal}º treino
                </span>
              )}
              <span>{formatRelativeDay(workout.completedAt)}</span>
            </p>
          </div>
        </div>

        <h3 className="text-headline mt-3 font-semibold">{workout.name}</h3>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Stat
            label="Tempo"
            value={formatDurationMinutes(workout.durationMinutes)}
            size="sm"
          />
          <Stat
            label="Volume"
            value={formatWeight(workout.totalVolumeKg)}
            unit="kg"
            size="sm"
          />
          <Stat
            label="Recordes"
            value={records}
            size="sm"
            icon={
              records > 0 ? (
                <Medal size={18} className="self-center" />
              ) : undefined
            }
          />
        </div>

        {workout.exercises.length > 0 && (
          <ul className="mt-3 space-y-2 border-t border-line pt-3" role="list">
            {workout.exercises
              .slice(0, PREVIEW_COUNT)
              .map((exercise, index) => {
                const sets = exercise.sets?.length ?? exercise.setsCount;
                const muscle =
                  exercise.primaryMuscleGroup ??
                  findExercise(exercise.exerciseId ?? '')?.primaryMuscleGroup;
                return (
                  <li
                    key={`${exercise.exerciseName}-${index}`}
                    className="flex items-center gap-3"
                  >
                    <ExerciseThumb muscle={muscle} size={40} />
                    <span className="text-callout min-w-0 flex-1 truncate">
                      <span className="text-ink-2">{sets} séries</span>{' '}
                      {exercise.exerciseName}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
        {hidden > 0 && (
          <p className="text-footnote mt-2.5 text-center text-ink-2">
            Ver mais {hidden} {hidden === 1 ? 'exercício' : 'exercícios'}
          </p>
        )}
      </button>
    </article>
  );
}
