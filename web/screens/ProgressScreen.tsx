import { useMemo, useState } from 'react';
import {
  Award,
  Calculator,
  Check,
  ChevronRight,
  Lock,
  MapPin,
  Ruler,
} from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatShortDate,
  formatWeight,
} from '../lib/format';
import {
  RECORD_LABELS,
  bucketDays,
  bucketHistory,
  comparePeriods,
  estimateOneRepMax,
  muscleDistribution,
  muscleLabel,
  percentChange,
  type ChartMetric,
} from '../lib/training';
import type { PersonalRecordItem, PersonalRecordType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { BarChart, LineChart, RankedBars } from '../ui/Charts';
import { measurementSeries } from '../lib/measurements';
import { filterByGym, type GymFilter } from '../lib/gyms';
import { Button } from '../ui/Button';
import { EmptyState, Medal, ProgressBar } from '../ui/Feedback';
import { NumberField, SegmentedControl } from '../ui/Form';
import { Card, Delta, SectionHeader, Stat, TabHeader } from '../ui/Layout';
import { cx } from '../ui/core';

type PeriodDays = '7' | '30' | '90' | '365';

const PERIODS: { value: PeriodDays; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '3 meses' },
  { value: '365', label: '1 ano' },
];

const METRICS: { value: ChartMetric; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'duration', label: 'Duração' },
  { value: 'reps', label: 'Repetições' },
];

function formatMetric(metric: ChartMetric, value: number): string {
  if (metric === 'duration') return formatDurationMinutes(value);
  if (metric === 'volume') return `${formatWeight(value)} kg`;
  return `${formatNumber(value, 0)} reps`;
}

function formatMetricTick(metric: ChartMetric, value: number): string {
  if (metric === 'duration')
    return value >= 60
      ? `${formatNumber(value / 60)} h`
      : `${formatNumber(value, 0)} min`;
  return formatCompact(value);
}

/** Evolution tab: one period filter above everything it scopes. */
export function ProgressScreen() {
  const { history: allHistory, prs, streakWeeks, gyms } = useAppStore();
  const { push } = useNavigation();
  const [period, setPeriod] = useState<PeriodDays>('30');
  const [metric, setMetric] = useState<ChartMetric>('volume');
  const [gymFilter, setGymFilter] = useState<GymFilter>('all');
  const days = Number(period);
  // The gym filter scopes the period numbers, chart and muscles; records and
  // achievements stay global. A deleted gym falls back to every workout.
  const activeGym = gyms.some((gym) => gym.id === gymFilter)
    ? gymFilter
    : 'all';
  const history = useMemo(
    () => filterByGym(allHistory, gyms, activeGym),
    [allHistory, gyms, activeGym],
  );

  const comparison = useMemo(
    () => comparePeriods(history, days),
    [history, days],
  );
  const buckets = useMemo(
    () =>
      days === 7
        ? bucketDays(history, 7, metric)
        : bucketHistory(
            history,
            days === 30 ? '1m' : days === 90 ? '3m' : '1y',
            metric,
          ),
    [history, days, metric],
  );
  const bucketUnit = days === 7 ? 'dia' : days === 365 ? 'mês' : 'semana';
  const muscles = useMemo(
    () =>
      muscleDistribution(
        history,
        addDays(startOfDay(new Date()), -(days - 1)),
        (exercise) =>
          exercise.exerciseId
            ? findExercise(exercise.exerciseId)?.primaryMuscleGroup
            : undefined,
      ),
    [history, days],
  );
  const recordsByExercise = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        records: Partial<Record<PersonalRecordType, PersonalRecordItem>>;
      }
    >();
    for (const record of prs) {
      const entry = map.get(record.exerciseId) ?? {
        name: record.exerciseName,
        records: {},
      };
      entry.records[record.type] = record;
      map.set(record.exerciseId, entry);
    }
    return [...map.entries()];
  }, [prs]);

  const { current, previous } = comparison;
  const totalVolume = allHistory.reduce(
    (total, workout) => total + workout.totalVolumeKg,
    0,
  );

  const achievements = [
    {
      title: 'Primeiro treino',
      description: 'Conclua seu primeiro treino.',
      progress: Math.min(1, allHistory.length),
      target: 1,
    },
    {
      title: 'Primeiro recorde',
      description: 'Estabeleça uma marca pessoal.',
      progress: Math.min(1, prs.length),
      target: 1,
    },
    {
      title: 'Constância',
      description: '3 semanas seguidas treinando.',
      progress: Math.min(3, streakWeeks),
      target: 3,
    },
    {
      title: '10 treinos',
      description: 'Finalize 10 sessões completas.',
      progress: Math.min(10, allHistory.length),
      target: 10,
    },
    {
      title: 'Clube das 10 toneladas',
      description: '10.000 kg de volume acumulado.',
      progress: Math.min(10000, totalVolume),
      target: 10000,
    },
    {
      title: 'Clube das 50 toneladas',
      description: '50.000 kg de volume acumulado.',
      progress: Math.min(50000, totalVolume),
      target: 50000,
    },
  ];

  return (
    <>
      <TabHeader title="Evolução" />
      <div className="app-column space-y-6 px-4 pt-2">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 bg-canvas/90 px-4 py-2 backdrop-blur-md">
          <SegmentedControl
            label="Período"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />
          {gyms.length > 0 && (
            <SegmentedControl
              label="Academia"
              options={[
                { value: 'all', label: 'Todas as academias' },
                ...gyms.map((gym) => ({ value: gym.id, label: gym.name })),
              ]}
              value={activeGym}
              onChange={setGymFilter}
              className="mt-2"
            />
          )}
        </div>

        <Card className="grid grid-cols-2 gap-x-4 gap-y-5 p-4">
          <div>
            <Stat label="Treinos" value={formatNumber(current.workouts, 0)} />
            <Delta
              value={percentChange(current.workouts, previous.workouts)}
              suffix=""
            />
          </div>
          <div>
            <Stat
              label="Tempo total"
              value={formatDurationMinutes(current.durationMinutes)}
            />
            <Delta
              value={percentChange(
                current.durationMinutes,
                previous.durationMinutes,
              )}
              suffix=""
            />
          </div>
          <div>
            <Stat
              label="Volume"
              value={formatCompact(current.volumeKg)}
              unit="kg"
            />
            <Delta
              value={percentChange(current.volumeKg, previous.volumeKg)}
              suffix=""
            />
          </div>
          <div>
            <Stat label="Séries" value={formatNumber(current.sets, 0)} />
            <Delta
              value={percentChange(current.sets, previous.sets)}
              suffix=""
            />
          </div>
          <p className="text-caption col-span-2 -mt-2 text-ink-3">
            Variação comparada ao período anterior de mesma duração.
          </p>
        </Card>

        <section aria-labelledby="stats-chart">
          <SectionHeader
            id="stats-chart"
            title={`${METRICS.find((item) => item.value === metric)?.label} por ${bucketUnit}`}
          />
          <Card className="p-4">
            <BarChart
              data={buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.value,
              }))}
              label={`${METRICS.find((item) => item.value === metric)?.label} de séries de trabalho por ${bucketUnit}`}
              formatValue={(value) => formatMetric(metric, value)}
              formatTick={(value) => formatMetricTick(metric, value)}
              emptyMessage="Sem treinos no período"
            />
            <SegmentedControl
              label="Métrica do gráfico"
              options={METRICS}
              value={metric}
              onChange={setMetric}
              className="mt-3"
            />
          </Card>
        </section>

        {gyms.length > 0 && (
          <GymsCard
            days={days}
            onOpen={(gymId) => push({ name: 'gym', gymId })}
            onAll={() => push({ name: 'gyms' })}
          />
        )}

        <BodyWeightCard />

        <section aria-labelledby="stats-muscles">
          <SectionHeader id="stats-muscles" title="Séries por grupo muscular" />
          <Card className="p-4">
            {muscles.length === 0 ? (
              <p className="text-callout py-4 text-center text-ink-3">
                Nenhuma série de trabalho no período.
              </p>
            ) : (
              <RankedBars
                label="Séries de trabalho por grupo muscular"
                data={muscles.map((share) => ({
                  key: share.group,
                  label: muscleLabel(share.group),
                  value: share.sets,
                }))}
                formatValue={(value) => `${formatNumber(value, 0)} séries`}
              />
            )}
          </Card>
        </section>

        <section aria-labelledby="stats-records">
          <SectionHeader id="stats-records" title="Recordes pessoais" />
          {recordsByExercise.length === 0 ? (
            <Card>
              <EmptyState
                icon={Award}
                title="Nenhum recorde ainda"
                message="Complete séries de trabalho nos treinos para registrar seus recordes."
              />
            </Card>
          ) : (
            <Card as="div" className="divide-y divide-line">
              {recordsByExercise.map(([exerciseId, entry]) => (
                <button
                  key={exerciseId}
                  type="button"
                  onClick={() =>
                    findExercise(exerciseId) &&
                    push({ name: 'exercise', exerciseId })
                  }
                  className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-raised"
                >
                  <Medal size={22} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="text-callout block truncate font-medium">
                      {entry.name}
                    </span>
                    <span className="text-footnote mt-0.5 flex flex-wrap gap-x-3 text-ink-2">
                      {(
                        [
                          'weight',
                          'estimated_1rm',
                          'volume',
                        ] as PersonalRecordType[]
                      ).map((type) =>
                        entry.records[type] ? (
                          <span key={type}>
                            {RECORD_LABELS[type]}:{' '}
                            <span className="text-ink tabular">
                              {formatWeight(entry.records[type]!.value)} kg
                            </span>
                          </span>
                        ) : null,
                      )}
                    </span>
                  </span>
                </button>
              ))}
            </Card>
          )}
        </section>

        <section aria-labelledby="stats-achievements">
          <SectionHeader id="stats-achievements" title="Conquistas" />
          <Card as="div" className="divide-y divide-line">
            {achievements.map((achievement) => {
              const unlocked = achievement.progress >= achievement.target;
              return (
                <div
                  key={achievement.title}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className={cx(
                      'grid size-10 shrink-0 place-items-center rounded-full',
                      unlocked
                        ? 'bg-record-soft text-record'
                        : 'bg-raised text-ink-3',
                    )}
                  >
                    {unlocked ? (
                      <Check size={20} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <Lock size={18} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-callout font-medium">
                      {achievement.title}
                      <span className="sr-only">
                        {unlocked ? ', desbloqueada' : ', bloqueada'}
                      </span>
                    </p>
                    <p className="text-footnote text-ink-2">
                      {achievement.description}
                    </p>
                    {!unlocked && (
                      <ProgressBar
                        value={
                          (achievement.progress / achievement.target) * 100
                        }
                        label={`Progresso de ${achievement.title}`}
                        thickness="sm"
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        <OneRepMaxCalculator />
      </div>
    </>
  );
}

function OneRepMaxCalculator() {
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(8);
  const epley = estimateOneRepMax(weight, reps);
  const brzycki =
    reps > 0 && reps < 37
      ? Math.round(weight * (36 / (37 - reps)) * 10) / 10
      : 0;

  return (
    <section aria-labelledby="one-rep-max">
      <SectionHeader title="Calculadora de 1RM" />
      <Card className="p-4">
        <h2
          id="one-rep-max"
          className="text-callout flex items-center gap-2 text-ink-2"
        >
          <Calculator size={16} aria-hidden="true" /> Estime sua carga máxima
          para 1 repetição sem testar a falha.
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            label="Carga"
            suffix="kg"
            decimal
            value={weight}
            max={1000}
            onValueChange={setWeight}
          />
          <NumberField
            label="Repetições"
            value={reps}
            min={0}
            max={30}
            onValueChange={setReps}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
          <Stat
            label="Epley"
            value={formatWeight(epley)}
            unit="kg"
            tone="brand"
          />
          <Stat
            label="Brzycki"
            value={formatWeight(brzycki)}
            unit="kg"
            tone="brand"
          />
        </div>
      </Card>
    </section>
  );
}

/** Where the period's workouts happened, one row per gym. */
function GymsCard({
  days,
  onOpen,
  onAll,
}: {
  days: number;
  onOpen: (gymId: string) => void;
  onAll: () => void;
}) {
  const { history, gyms } = useAppStore();
  const rows = useMemo(() => {
    const since = addDays(startOfDay(new Date()), -(days - 1)).getTime();
    const inPeriod = history.filter(
      (workout) => new Date(workout.completedAt).getTime() >= since,
    );
    return gyms
      .map((gym) => {
        const visits = inPeriod.filter((workout) => workout.gymId === gym.id);
        return {
          gym,
          workouts: visits.length,
          minutes: visits.reduce((sum, w) => sum + w.durationMinutes, 0),
        };
      })
      .filter((row) => row.workouts > 0)
      .sort((a, b) => b.workouts - a.workouts || b.minutes - a.minutes);
  }, [history, gyms, days]);
  const max = Math.max(1, ...rows.map((row) => row.workouts));

  return (
    <section aria-labelledby="stats-gyms">
      <SectionHeader
        id="stats-gyms"
        title="Por academia"
        action={
          <Button variant="ghost" size="sm" onClick={onAll}>
            Academias
          </Button>
        }
      />
      <Card as="div" className="divide-y divide-line">
        {rows.length === 0 ? (
          <p className="text-callout px-4 py-5 text-center text-ink-3">
            Nenhum treino com academia no período.
          </p>
        ) : (
          rows.map(({ gym, workouts, minutes }) => (
            <button
              key={gym.id}
              type="button"
              onClick={() => onOpen(gym.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-raised"
            >
              <MapPin
                size={20}
                className="shrink-0 text-brand-ink"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-callout truncate font-medium">
                    {gym.name}
                  </span>
                  <span className="text-footnote shrink-0 text-ink-2 tabular">
                    {formatNumber(workouts, 0)}{' '}
                    {workouts === 1 ? 'treino' : 'treinos'} ·{' '}
                    {formatDurationMinutes(minutes)}
                  </span>
                </span>
                <span
                  className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-raised"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${(workouts / max) * 100}%` }}
                  />
                </span>
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 text-ink-3"
                aria-hidden="true"
              />
            </button>
          ))
        )}
      </Card>
    </section>
  );
}

/** Body weight next to training numbers; full history lives in Medidas. */
function BodyWeightCard() {
  const { measurements } = useAppStore();
  const { push } = useNavigation();
  const series = useMemo(
    () => measurementSeries(measurements, 'weightKg').slice(-12),
    [measurements],
  );
  const latest = series.at(-1);
  const first = series[0];

  return (
    <section aria-labelledby="stats-weight">
      <SectionHeader
        id="stats-weight"
        title="Peso corporal"
        action={
          series.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              trailingIcon={ChevronRight}
              onClick={() => push({ name: 'measurements' })}
            >
              Medidas
            </Button>
          ) : undefined
        }
      />
      {latest ? (
        <Card className="p-4">
          <p className="font-metric text-metric tabular">
            {formatNumber(latest.value, 2)}
            <span className="text-callout ml-1 font-sans text-ink-2">kg</span>
          </p>
          <p className="text-caption text-ink-2 tabular">
            {series.length > 1 && first
              ? `${latest.value >= first.value ? '▲' : '▼'} ${formatNumber(Math.abs(latest.value - first.value), 2)} kg nas últimas ${series.length} medições`
              : `Medido em ${formatShortDate(latest.date)}`}
          </p>
          {series.length > 1 && (
            <div className="mt-3">
              <LineChart
                zoom
                height={140}
                data={series.map((point) => ({
                  key: point.date,
                  label: formatShortDate(point.date),
                  value: point.value,
                }))}
                label="Peso corporal nas últimas medições"
                formatValue={(value) => `${formatNumber(value, 2)} kg`}
                formatTick={(value) => formatNumber(value, 1)}
              />
            </div>
          )}
        </Card>
      ) : (
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-ink">
            <Ruler size={20} aria-hidden="true" />
          </span>
          <p className="text-callout min-w-0 flex-1 text-ink-2">
            Registre peso e medidas para acompanhar o corpo junto com os
            treinos.
          </p>
          <Button size="sm" onClick={() => push({ name: 'measurements' })}>
            Registrar
          </Button>
        </Card>
      )}
    </section>
  );
}
