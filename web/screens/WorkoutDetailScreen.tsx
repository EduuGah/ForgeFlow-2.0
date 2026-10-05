import { ChevronRight, SearchX } from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import {
  formatDateTime,
  formatDurationMinutes,
  formatNumber,
  formatSetResult,
  formatWeight,
} from '../lib/format';
import {
  RECORD_LABELS,
  estimateOneRepMax,
  setLabels,
  workoutSetRecords,
} from '../lib/training';
import { useNavigation } from '../navigation/Navigator';
import { EmptyState, ExerciseThumb, Medal, RecordBadge } from '../ui/Feedback';
import { Stat, StackHeader } from '../ui/Layout';
import { cx } from '../ui/core';

export function WorkoutDetailScreen({ workoutId }: { workoutId: string }) {
  const { history } = useAppStore();
  const { pop, push } = useNavigation();
  const workout = history.find((item) => item.id === workoutId);

  if (!workout) {
    return (
      <>
        <StackHeader title="Treino" onBack={pop} />
        <EmptyState
          icon={SearchX}
          title="Treino não encontrado"
          message="Ele pode ter sido removido em outro aparelho."
          className="pt-20"
        />
      </>
    );
  }

  const supersetIds = [
    ...new Set(
      workout.exercises
        .map((exercise) => exercise.supersetId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const supersetLetter = (id: string) =>
    String.fromCharCode(65 + Math.max(0, supersetIds.indexOf(id)));

  return (
    <>
      <StackHeader title={workout.name} onBack={pop} />
      <div className="app-column pb-6">
        <div className="px-4 pt-5">
          <p className="text-footnote text-ink-2 first-letter:uppercase">
            {formatDateTime(workout.completedAt)}
          </p>
          <h2 className="text-title-lg font-bold">{workout.name}</h2>
          <div className="mt-4 grid grid-cols-4 gap-3">
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
              label="Séries"
              value={formatNumber(workout.totalSets, 0)}
              size="sm"
            />
            <Stat
              label="Recordes"
              value={workout.prsAchieved.length}
              size="sm"
              icon={
                workout.prsAchieved.length > 0 ? (
                  <Medal size={18} className="self-center" />
                ) : undefined
              }
            />
          </div>
        </div>

        {workout.prsAchieved.length > 0 && (
          <section
            className="mx-4 mt-5 rounded-lg bg-record-soft p-4"
            aria-label="Recordes deste treino"
          >
            <ul className="space-y-2" role="list">
              {workout.prsAchieved.map((text) => (
                <li key={text} className="text-callout flex items-start gap-2">
                  <Medal size={18} className="mt-0.5 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {workout.notes && (
          <p className="text-callout mx-4 mt-5 rounded-lg border border-line bg-surface px-4 py-3 whitespace-pre-line text-ink-2">
            {workout.notes}
          </p>
        )}

        <ul className="mt-5 space-y-3 px-4" role="list">
          {workout.exercises.map((exercise, index) => {
            const catalog = exercise.exerciseId
              ? findExercise(exercise.exerciseId)
              : undefined;
            const muscle =
              exercise.primaryMuscleGroup ?? catalog?.primaryMuscleGroup;
            const labels = exercise.sets
              ? setLabels(exercise.sets.map((set) => ({ setType: set.type })))
              : [];
            const setRecords = workoutSetRecords(workout, exercise);
            return (
              <li
                key={`${exercise.exerciseName}-${index}`}
                className="overflow-hidden rounded-lg border border-line bg-surface"
              >
                <button
                  type="button"
                  disabled={!catalog}
                  onClick={() =>
                    catalog &&
                    push({ name: 'exercise', exerciseId: catalog.id })
                  }
                  className="flex w-full items-center gap-3 p-3 text-left active:bg-raised disabled:cursor-default disabled:active:bg-transparent"
                >
                  <ExerciseThumb
                    muscle={muscle}
                    exerciseId={catalog?.id}
                    size={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-headline block truncate font-semibold">
                      {exercise.exerciseName}
                    </span>
                    <span className="text-caption flex flex-wrap items-center gap-x-1.5 text-ink-2 tabular">
                      {exercise.supersetId && (
                        <span className="text-micro rounded-sm bg-brand-soft px-1.5 py-0.5 font-semibold text-brand-ink">
                          SUPERSET {supersetLetter(exercise.supersetId)}
                        </span>
                      )}
                      {exercise.setsCount > 0 && (
                        <span>
                          {exercise.setsCount}{' '}
                          {exercise.setsCount === 1 ? 'série' : 'séries'}
                          {exercise.totalVolumeKg > 0 &&
                            ` · ${formatWeight(exercise.totalVolumeKg)} kg`}
                        </span>
                      )}
                    </span>
                  </span>
                  {catalog && (
                    <ChevronRight
                      size={20}
                      className="text-ink-3"
                      aria-hidden="true"
                    />
                  )}
                </button>
                {exercise.notes && (
                  <p className="text-callout mx-3 mb-3 rounded-md bg-raised px-3 py-2 whitespace-pre-line text-ink-2">
                    {exercise.notes}
                  </p>
                )}
                {exercise.sets && exercise.sets.length > 0 ? (
                  <table className="w-full border-t border-line">
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Série</th>
                        <th scope="col">Peso e repetições</th>
                        <th scope="col">1RM estimado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {exercise.sets.map((set, setIndex) => {
                        const warmup = set.type === 'warmup';
                        const records = (setRecords[setIndex] ?? []).map(
                          (type) => RECORD_LABELS[type],
                        );
                        return (
                          <tr key={setIndex}>
                            <td className="w-14 py-2 pl-3">
                              <span
                                className={cx(
                                  'text-callout grid h-7 w-8 place-items-center rounded-md font-bold',
                                  warmup
                                    ? 'bg-warmup-soft text-warmup'
                                    : 'bg-raised text-ink',
                                )}
                              >
                                {labels[setIndex]}
                              </span>
                            </td>
                            <td className="text-body py-2 font-medium tabular">
                              {formatSetResult(set)}
                              {(set.tag || set.rpe || records.length > 0) && (
                                <span className="ml-2 inline-flex gap-1 align-middle">
                                  <RecordBadge labels={records} />
                                  {set.tag && (
                                    <span className="text-micro rounded-sm bg-danger-soft px-1.5 py-0.5 font-semibold text-danger-ink">
                                      {set.tag === 'failure' ? 'FALHA' : 'DROP'}
                                    </span>
                                  )}
                                  {set.rpe && (
                                    <span className="text-micro rounded-sm bg-raised px-1.5 py-0.5 font-semibold text-ink-2">
                                      RPE {formatNumber(set.rpe)}
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="text-footnote py-2 pr-4 text-right text-ink-3 tabular">
                              {!warmup &&
                              set.weightKg > 0 &&
                              set.repetitions > 0
                                ? `1RM ${formatWeight(Math.round(estimateOneRepMax(set.weightKg, set.repetitions)))} kg`
                                : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  !exercise.sets && (
                    <p className="text-callout border-t border-line px-3 py-3 text-ink-2">
                      {exercise.setsCount} séries · melhor carga{' '}
                      {formatWeight(exercise.bestWeightKg)} kg
                    </p>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
