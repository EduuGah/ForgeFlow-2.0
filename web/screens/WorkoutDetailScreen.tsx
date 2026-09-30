import { ChevronRight, SearchX } from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import {
  formatDateTime,
  formatDurationMinutes,
  formatNumber,
  formatWeight,
} from '../lib/format';
import { setLabels } from '../lib/training';
import { useNavigation } from '../navigation/Navigator';
import { EmptyState, ExerciseThumb, Medal } from '../ui/Feedback';
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

        <ul className="mt-4" role="list">
          {workout.exercises.map((exercise, index) => {
            const catalog = exercise.exerciseId
              ? findExercise(exercise.exerciseId)
              : undefined;
            const muscle =
              exercise.primaryMuscleGroup ?? catalog?.primaryMuscleGroup;
            const labels = exercise.sets
              ? setLabels(exercise.sets.map((set) => ({ setType: set.type })))
              : [];
            return (
              <li
                key={`${exercise.exerciseName}-${index}`}
                className="border-t border-line pt-4"
              >
                <button
                  type="button"
                  disabled={!catalog}
                  onClick={() =>
                    catalog &&
                    push({ name: 'exercise', exerciseId: catalog.id })
                  }
                  className="flex w-full items-center gap-3 px-4 text-left disabled:cursor-default"
                >
                  <ExerciseThumb muscle={muscle} size={44} />
                  <span className="text-headline min-w-0 flex-1 truncate font-semibold text-brand-ink">
                    {exercise.exerciseName}
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
                  <p className="text-callout mt-2 px-4 text-ink-2">
                    {exercise.notes}
                  </p>
                )}
                {exercise.sets ? (
                  <table className="mt-3 w-full">
                    <thead>
                      <tr className="text-micro text-left font-semibold text-ink-3 uppercase">
                        <th scope="col" className="w-16 px-4 py-2 text-center">
                          Série
                        </th>
                        <th scope="col" className="py-2">
                          Peso e repetições
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercise.sets.map((set, setIndex) => (
                        <tr
                          key={setIndex}
                          className={
                            setIndex % 2 === 1 ? 'bg-surface' : undefined
                          }
                        >
                          <td
                            className={cx(
                              'text-body px-4 py-3 text-center font-bold',
                              set.type === 'warmup'
                                ? 'text-warmup'
                                : 'text-ink',
                            )}
                          >
                            {labels[setIndex]}
                          </td>
                          <td className="text-body py-3 tabular">
                            {formatWeight(set.weightKg)} kg × {set.repetitions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-callout px-4 py-3 text-ink-2">
                    {exercise.setsCount} séries · melhor carga{' '}
                    {formatWeight(exercise.bestWeightKg)} kg
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
