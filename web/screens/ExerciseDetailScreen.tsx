import { useMemo, useState } from 'react';
import { ChevronRight, History, Plus, Search, Star } from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import { formatDateTime, formatShortDate, formatWeight } from '../lib/format';
import {
  RECORD_LABELS,
  exerciseSessions,
  muscleLabel,
  recordDate,
  setLabels,
  type ExerciseSession,
} from '../lib/training';
import type { PersonalRecordType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import { LineChart } from '../ui/Charts';
import { EmptyState, ExerciseThumb, Medal } from '../ui/Feedback';
import { SegmentedControl, Tabs } from '../ui/Form';
import { StackHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

type DetailTab = 'summary' | 'history' | 'instructions';
type Metric = 'weight' | 'oneRepMax' | 'volume';

const METRICS: { value: Metric; label: string }[] = [
  { value: 'weight', label: 'Maior peso' },
  { value: 'oneRepMax', label: '1RM estimado' },
  { value: 'volume', label: 'Volume da sessão' },
];

function metricOf(session: ExerciseSession, metric: Metric): number {
  if (metric === 'weight') return session.bestWeightKg;
  if (metric === 'oneRepMax') return session.bestOneRepMax;
  return session.volumeKg;
}

export function ExerciseDetailScreen({ exerciseId }: { exerciseId: string }) {
  const { pop } = useNavigation();
  const { favorites } = useAppStore();
  const exercise = findExercise(exerciseId);
  const favorite = favorites.includes(exerciseId);
  return (
    <>
      <StackHeader
        title={exercise?.name ?? 'Exercício'}
        onBack={pop}
        right={
          exercise && (
            <IconButton
              icon={Star}
              label={
                favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
              }
              aria-pressed={favorite}
              onClick={() => actions.toggleFavorite(exerciseId)}
              className={
                favorite ? '[&_svg]:fill-record [&_svg]:text-record' : undefined
              }
            />
          )
        }
      />
      <ExerciseDetailView exerciseId={exerciseId} />
    </>
  );
}

/** Also rendered inside a sheet from the active workout (`embedded`). */
export function ExerciseDetailView({
  exerciseId,
  embedded = false,
}: {
  exerciseId: string;
  embedded?: boolean;
}) {
  const { history, prs, activeWorkout } = useAppStore();
  const { push } = useNavigation();
  const toast = useToast();
  const exercise = findExercise(exerciseId);
  const [tab, setTab] = useState<DetailTab>('summary');
  const [metric, setMetric] = useState<Metric>('weight');

  const sessions = useMemo(
    () =>
      exercise ? exerciseSessions(history, exercise.id, exercise.name) : [],
    [history, exercise],
  );

  if (!exercise) {
    return (
      <EmptyState
        icon={Search}
        title="Exercício não encontrado"
        message="Ele pode ter sido removido da biblioteca."
      />
    );
  }

  const records = prs.filter((record) => record.exerciseId === exercise.id);
  const recordOf = (type: PersonalRecordType) =>
    records.find((record) => record.type === type);
  const chartData = [...sessions]
    .reverse()
    .slice(-24)
    .map((session) => ({
      key: session.workoutId,
      label: formatShortDate(session.completedAt),
      value: metricOf(session, metric),
    }));
  const best = Math.max(
    0,
    ...sessions.map((session) => metricOf(session, metric)),
  );
  const inWorkout = activeWorkout?.exercises.some(
    (item) => item.exerciseId === exercise.id,
  );

  const steps = (exercise.description ?? '')
    .split(/(?<=\.)\s+/)
    .map((step) => step.trim())
    .filter(Boolean);
  const focus = steps[0]?.startsWith('Foco:') ? steps.shift() : undefined;

  return (
    <div className={cx(!embedded && 'app-column')}>
      <div
        className={cx(
          'sticky z-10 px-4 py-2 backdrop-blur-md',
          embedded
            ? 'top-0 bg-surface/95'
            : 'top-[calc(3.5rem+env(safe-area-inset-top))] bg-canvas/95',
        )}
      >
        <Tabs
          label="Seções do exercício"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'summary', label: 'Resumo' },
            { value: 'history', label: 'Histórico' },
            { value: 'instructions', label: 'Instruções' },
          ]}
        />
      </div>

      {tab === 'summary' && (
        <div
          id="panel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          className="animate-fade-in px-4 pt-5 pb-6"
        >
          <div className="flex items-center gap-4">
            <ExerciseThumb muscle={exercise.primaryMuscleGroup} size={64} />
            <div className="min-w-0">
              <h2 className="text-title font-bold">{exercise.name}</h2>
              <p className="text-callout text-ink-2">
                Primário: {muscleLabel(exercise.primaryMuscleGroup)}
              </p>
              {exercise.secondaryMuscleGroups.length > 0 && (
                <p className="text-callout text-ink-2">
                  Secundário:{' '}
                  {exercise.secondaryMuscleGroups.map(muscleLabel).join(', ')}
                </p>
              )}
              {exercise.equipment && (
                <p className="text-footnote text-ink-3">{exercise.equipment}</p>
              )}
            </div>
          </div>

          {activeWorkout && !inWorkout && (
            <Button
              variant="tinted"
              block
              icon={Plus}
              className="mt-4"
              onClick={() => {
                actions.addExerciseToActiveWorkout(exercise);
                toast({
                  tone: 'success',
                  title: 'Adicionado ao treino',
                  description: exercise.name,
                });
              }}
            >
              Adicionar ao treino em andamento
            </Button>
          )}

          <div className="mt-6">
            <p className="font-metric text-metric">
              {formatWeight(best)}{' '}
              <span className="text-callout font-sans font-medium text-ink-2">
                kg · melhor marca
              </span>
            </p>
            <div className="mt-3">
              <LineChart
                data={chartData}
                label={`${METRICS.find((item) => item.value === metric)?.label} por sessão`}
                formatValue={(value) => `${formatWeight(value)} kg`}
                formatTick={(value) => `${formatWeight(value)}`}
                emptyMessage="Conclua este exercício em um treino para ver a evolução"
              />
            </div>
            <SegmentedControl
              label="Métrica do gráfico"
              options={METRICS}
              value={metric}
              onChange={setMetric}
              className="mt-3"
            />
          </div>

          <section className="mt-7" aria-labelledby="exercise-records">
            <h3
              id="exercise-records"
              className="text-headline flex items-center gap-2 font-semibold"
            >
              <Medal size={20} /> Recordes pessoais
            </h3>
            <ul className="mt-2 divide-y divide-line" role="list">
              {(
                ['weight', 'estimated_1rm', 'volume'] as PersonalRecordType[]
              ).map((type) => {
                const record = recordOf(type);
                const date = record ? recordDate(record) : null;
                return (
                  <li
                    key={type}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <span>
                      <span className="text-body block">
                        {RECORD_LABELS[type]}
                      </span>
                      {date && (
                        <span className="text-caption text-ink-3">
                          {formatShortDate(date.toISOString())}
                        </span>
                      )}
                    </span>
                    <span
                      className={cx(
                        'text-headline font-semibold tabular',
                        record ? 'text-brand-ink' : 'text-ink-3',
                      )}
                    >
                      {record ? `${formatWeight(record.value)} kg` : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {tab === 'history' && (
        <div
          id="panel-history"
          role="tabpanel"
          aria-labelledby="tab-history"
          className="animate-fade-in pb-6"
        >
          {sessions.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhum registro ainda"
              message="As séries deste exercício aparecem aqui depois de cada treino."
            />
          ) : (
            <ul role="list">
              {sessions.map((session) => (
                <SessionBlock
                  key={session.workoutId}
                  session={session}
                  exerciseName={exercise.name}
                  muscle={exercise.primaryMuscleGroup}
                  onOpen={
                    embedded
                      ? undefined
                      : () =>
                          push({
                            name: 'workout',
                            workoutId: session.workoutId,
                          })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'instructions' && (
        <div
          id="panel-instructions"
          role="tabpanel"
          aria-labelledby="tab-instructions"
          className="animate-fade-in px-4 pt-5 pb-6"
        >
          <h2 className="text-title font-bold">{exercise.name}</h2>
          {focus && <p className="text-callout mt-1 text-brand-ink">{focus}</p>}
          {steps.length === 0 ? (
            <p className="text-body mt-4 text-ink-2">
              Este exercício ainda não tem instruções.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {steps.map((step, index) => (
                <li key={index} className="text-body flex gap-4">
                  <span className="w-5 shrink-0 font-bold tabular">
                    {index + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function SessionBlock({
  session,
  exerciseName,
  muscle,
  onOpen,
}: {
  session: ExerciseSession;
  exerciseName: string;
  muscle: string;
  onOpen?: () => void;
}) {
  const labels = session.sets
    ? setLabels(session.sets.map((set) => ({ setType: set.type })))
    : [];
  const Header = onOpen ? 'button' : 'div';
  return (
    <li className="border-b border-line pt-4">
      <Header
        {...(onOpen ? { type: 'button' as const, onClick: onOpen } : {})}
        className="flex w-full items-center justify-between gap-3 px-4 text-left"
      >
        <span>
          <span className="text-headline block font-semibold">
            {session.workoutName}
          </span>
          <span className="text-footnote text-ink-2">
            {formatDateTime(session.completedAt)}
          </span>
        </span>
        {onOpen && (
          <ChevronRight size={20} className="text-ink-3" aria-hidden="true" />
        )}
      </Header>
      <div className="mt-3 flex items-center gap-3 px-4">
        <ExerciseThumb muscle={muscle} size={36} />
        <span className="text-body font-medium">{exerciseName}</span>
      </div>
      {session.notes && (
        <p className="text-callout mt-2 px-4 text-ink-2">{session.notes}</p>
      )}
      {session.sets ? (
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
            {session.sets.map((set, index) => (
              <tr
                key={index}
                className={index % 2 === 1 ? 'bg-surface' : undefined}
              >
                <td
                  className={cx(
                    'text-body px-4 py-3 text-center font-bold',
                    set.type === 'warmup' ? 'text-warmup' : 'text-ink',
                  )}
                >
                  {labels[index]}
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
          Melhor carga: {formatWeight(session.bestWeightKg)} kg
        </p>
      )}
    </li>
  );
}
