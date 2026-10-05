import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  History,
  Lightbulb,
  Plus,
  Search,
  Star,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import {
  formatDateTime,
  formatSetResult,
  formatShortDate,
  formatWeight,
} from '../lib/format';
import {
  RECORD_LABELS,
  exerciseSessions,
  muscleLabel,
  recordDate,
  recordOrigin,
  setLabels,
  type ExerciseSession,
  type RecordOrigin,
} from '../lib/training';
import type { PersonalRecordItem, PersonalRecordType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { exerciseGuide } from '../data/guides';
import { exerciseMedia } from '../data/exerciseMedia';
import { ExerciseAnimation } from '../features/ExerciseAnimation';
import { Button, IconButton } from '../ui/Button';
import { LineChart } from '../ui/Charts';
import { EmptyState, ExerciseThumb, Medal, RecordBadge } from '../ui/Feedback';
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
  const guide = exerciseGuide(exercise.id);

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
          {/* Desktop: the animation beside the name instead of above it. */}
          <div
            className={cx(
              !embedded &&
                'lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-center lg:gap-6',
            )}
          >
            <ExerciseAnimation
              exerciseId={exercise.id}
              name={exercise.name}
              className={cx('mb-4', !embedded && 'lg:mb-0')}
            />
            <div className="flex items-center gap-4">
              {!exerciseMedia(exercise.id) && (
                <ExerciseThumb muscle={exercise.primaryMuscleGroup} size={64} />
              )}
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
                  <p className="text-footnote text-ink-3">
                    {exercise.equipment}
                  </p>
                )}
              </div>
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
                const origin = record ? recordOrigin(record, history) : null;
                return (
                  <RecordRow
                    key={type}
                    type={type}
                    record={record}
                    origin={origin}
                    onOpen={
                      origin && !embedded
                        ? () =>
                            push({
                              name: 'workout',
                              workoutId: origin.workoutId,
                            })
                        : undefined
                    }
                  />
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
                  exerciseId={exercise.id}
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
          {guide ? (
            <>
              <p className="text-callout mt-1 text-ink-2">{guide.muscles}</p>
              <ExerciseAnimation
                exerciseId={exercise.id}
                name={exercise.name}
                className={cx('mt-4', !embedded && 'lg:max-w-md')}
              />
              <GuideList title="Preparação" items={guide.setup} />
              <GuideList title="Execução" items={guide.steps} numbered />
              <GuideNote
                icon={Wind}
                title="Respiração"
                text={guide.breathing}
              />
              <GuideList
                title="Dicas"
                items={guide.tips}
                icon={Lightbulb}
                tone="success"
              />
              <GuideList
                title="Erros comuns"
                items={guide.mistakes}
                icon={AlertTriangle}
                tone="danger"
              />
              <p className="text-caption mt-6 text-ink-3">
                Fotos: Free Exercise DB (domínio público).
              </p>
            </>
          ) : (
            <>
              {focus && (
                <p className="text-callout mt-1 text-brand-ink">{focus}</p>
              )}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RecordRow({
  type,
  record,
  origin,
  onOpen,
}: {
  type: PersonalRecordType;
  record: PersonalRecordItem | undefined;
  origin: RecordOrigin | null;
  onOpen?: () => void;
}) {
  const date = origin
    ? new Date(origin.completedAt)
    : record
      ? recordDate(record)
      : null;
  // The set behind the number: "100 kg × 5"; 1RM is an estimate from it.
  const set = origin?.set
    ? `${type === 'estimated_1rm' ? 'Estimado de ' : ''}${formatSetResult(origin.set)}`
    : null;
  const where = [
    origin?.workoutName,
    date && formatShortDate(date.toISOString()),
  ]
    .filter(Boolean)
    .join(' · ');
  const Row = onOpen ? 'button' : 'div';
  return (
    <li>
      <Row
        {...(onOpen
          ? {
              type: 'button' as const,
              onClick: onOpen,
              'aria-label': `${RECORD_LABELS[type]}: ${record ? `${formatWeight(record.value)} kg` : 'sem registro'}${set ? `, ${set}` : ''}${where ? `, ${where}` : ''}. Abrir treino`,
            }
          : {})}
        className={cx(
          'flex w-full items-center gap-3 py-3.5 text-left',
          onOpen && '-mx-2 rounded-md px-2 active:bg-raised',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="text-body block">{RECORD_LABELS[type]}</span>
          {set && (
            <span className="text-callout block font-medium text-ink-2 tabular">
              {set}
            </span>
          )}
          {where && (
            <span className="text-caption block truncate text-ink-3">
              {where}
            </span>
          )}
        </span>
        <span
          className={cx(
            'text-headline shrink-0 font-semibold tabular',
            record ? 'text-brand-ink' : 'text-ink-3',
          )}
        >
          {record ? `${formatWeight(record.value)} kg` : '—'}
        </span>
        {onOpen && (
          <ChevronRight
            size={18}
            className="-mr-1 shrink-0 text-ink-3"
            aria-hidden="true"
          />
        )}
      </Row>
    </li>
  );
}

function SessionBlock({
  session,
  exerciseId,
  exerciseName,
  muscle,
  onOpen,
}: {
  session: ExerciseSession;
  exerciseId: string;
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
        <ExerciseThumb muscle={muscle} exerciseId={exerciseId} size={36} />
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
                  {formatSetResult(set)}
                  {(set.tag || session.setRecords[index]?.length > 0) && (
                    <span className="ml-2 inline-flex gap-1 align-middle">
                      <RecordBadge
                        labels={(session.setRecords[index] ?? []).map(
                          (type) => RECORD_LABELS[type],
                        )}
                      />
                      {set.tag && (
                        <span className="text-micro rounded-sm bg-danger-soft px-1.5 py-0.5 font-semibold text-danger-ink">
                          {set.tag === 'failure' ? 'FALHA' : 'DROP'}
                        </span>
                      )}
                    </span>
                  )}
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

function GuideList({
  title,
  items,
  numbered = false,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
  icon?: LucideIcon;
  tone?: 'success' | 'danger';
}) {
  return (
    <section className="mt-6">
      <h3 className="text-headline flex items-center gap-2 font-semibold">
        {Icon && (
          <Icon
            size={18}
            className={
              tone === 'danger' ? 'text-danger-ink' : 'text-success-ink'
            }
            aria-hidden="true"
          />
        )}
        {title}
      </h3>
      {numbered ? (
        <ol className="mt-3 space-y-3">
          {items.map((item, index) => (
            <li key={item} className="text-body flex gap-3">
              <span className="text-callout grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-ink">
                {index + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-2.5 space-y-2" role="list">
          {items.map((item) => (
            <li key={item} className="text-body flex gap-3 text-ink-2">
              <span
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-3"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GuideNote({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <section className="mt-6 flex gap-3 rounded-lg bg-raised p-3.5">
      <Icon
        size={20}
        className="mt-0.5 shrink-0 text-water"
        aria-hidden="true"
      />
      <div>
        <h3 className="text-callout font-semibold">{title}</h3>
        <p className="text-callout mt-0.5 text-ink-2">{text}</p>
      </div>
    </section>
  );
}
