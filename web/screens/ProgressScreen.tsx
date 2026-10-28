import { useMemo, useState } from 'react';
import { Calculator, ChevronRight, MapPin, Share2 } from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatShortDate,
  formatWeight,
  searchKey,
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
  recordDate,
  type ChartMetric,
} from '../lib/training';
import type { PersonalRecordItem, PersonalRecordType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { BarChart, LineChart, RankedBars } from '../ui/Charts';
import { measurementSeries } from '../lib/measurements';
import {
  strengthTrend,
  trackedLifts,
  weeklySetsByMuscle,
  weightTrend,
  type VolumeZone,
} from '../lib/projections';
import { filterByGym, type GymFilter } from '../lib/gyms';
import { Button } from '../ui/Button';
import { EmptyState, Medal } from '../ui/Feedback';
import { NumberField, SegmentedControl, TextField } from '../ui/Form';
import { Sheet } from '../ui/Overlay';
import { Card, Delta, SectionHeader, Stat, TabHeader } from '../ui/Layout';
import { cx } from '../ui/core';
import { ProgressScene } from '../ui/Scenes';
import { MuscleMapCard, historyMuscleWork } from '../features/MuscleMap';
import { SummarySheet } from '../features/SummarySheet';
import { MedalPreview } from '../features/Medals';
import { YearCalendar } from '../features/YearCalendar';
import { Art } from '../ui/Art';

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

const JUMPS: [string, string][] = [
  ['stats-achievements', 'Medalhas'],
  ['stats-chart', 'Gráfico'],
  ['stats-strength', 'Força'],
  ['stats-records', 'Recordes'],
  ['stats-year', 'Ano'],
  ['stats-weight', 'Peso'],
  ['stats-balance', 'Músculos'],
];

/** Scrolls to a section, below the sticky header and filters. */
function jumpTo(id: string) {
  const target = [...document.querySelectorAll<HTMLElement>(`#${id}`)].find(
    (element) => element.offsetParent !== null,
  );
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - 176;
  window.scrollTo({ top, behavior: 'smooth' });
}

/** Evolution tab: one period filter above everything it scopes. */
export function ProgressScreen() {
  const { history: allHistory, prs, gyms } = useAppStore();
  const { push } = useNavigation();
  const [period, setPeriod] = useState<PeriodDays>('30');
  const [metric, setMetric] = useState<ChartMetric>('volume');
  const [gymFilter, setGymFilter] = useState<GymFilter>('all');
  const [summaryOpen, setSummaryOpen] = useState(false);
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
    const latest = (
      records: Partial<Record<PersonalRecordType, PersonalRecordItem>>,
    ) =>
      Math.max(
        0,
        ...Object.values(records).map(
          (record) => (record && recordDate(record)?.getTime()) || 0,
        ),
      );
    return [...map.entries()].sort(
      (a, b) => latest(b[1].records) - latest(a[1].records),
    );
  }, [prs]);
  const [allRecordsOpen, setAllRecordsOpen] = useState(false);

  const { current, previous } = comparison;

  return (
    <>
      <TabHeader
        title="Evolução"
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={Share2}
            onClick={() => setSummaryOpen(true)}
          >
            Resumo
          </Button>
        }
      />
      <SummarySheet open={summaryOpen} onClose={() => setSummaryOpen(false)} />
      <div className="app-column space-y-6 px-4 pt-2">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 -mx-4 bg-canvas/90 px-4 py-2 backdrop-blur-md">
          <SegmentedControl
            label="Período"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />
          <nav
            aria-label="Ir para"
            className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]"
          >
            {JUMPS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => jumpTo(id)}
                className="pressable text-caption h-7 shrink-0 rounded-full bg-raised px-3 font-semibold text-ink-2"
              >
                {label}
              </button>
            ))}
          </nav>
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

        <section aria-labelledby="stats-achievements">
          <SectionHeader id="stats-achievements" title="Nível e medalhas" />
          <Card className="p-4">
            <MedalPreview onOpenAll={() => push({ name: 'achievements' })} />
          </Card>
        </section>

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

        <section aria-labelledby="stats-year">
          <SectionHeader id="stats-year" title="Seu ano" />
          <Card className="p-4">
            <YearCalendar />
          </Card>
        </section>

        <StrengthCard />

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

        <MuscleBalanceCard />

        <section aria-labelledby="stats-records">
          <SectionHeader
            id="stats-records"
            title="Recordes pessoais"
            action={
              recordsByExercise.length > 0 ? (
                <span className="text-footnote text-ink-3">mais recentes</span>
              ) : undefined
            }
          />
          {recordsByExercise.length === 0 ? (
            <Card>
              <EmptyState
                art="trophy"
                title="Nenhum recorde ainda"
                message="Complete séries de trabalho nos treinos para registrar seus recordes."
              />
            </Card>
          ) : (
            <>
              <Card as="div" className="divide-y divide-line">
                {recordsByExercise.slice(0, 5).map(([exerciseId, entry]) => (
                  <RecordRow
                    key={exerciseId}
                    exerciseId={exerciseId}
                    name={entry.name}
                    records={entry.records}
                  />
                ))}
              </Card>
              {recordsByExercise.length > 5 && (
                <Button
                  variant="secondary"
                  block
                  className="mt-2"
                  onClick={() => setAllRecordsOpen(true)}
                >
                  Ver todos os recordes ({recordsByExercise.length})
                </Button>
              )}
              <AllRecordsSheet
                open={allRecordsOpen}
                onClose={() => setAllRecordsOpen(false)}
                entries={recordsByExercise}
              />
            </>
          )}
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
  const trend = useMemo(
    () => weightTrend(measurementSeries(measurements, 'weightKg')),
    [measurements],
  );

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
          {trend && (
            <p className="text-caption mt-1 text-ink-2 tabular">
              Tendência: {trend.perWeekKg > 0 ? '+' : ''}
              {formatNumber(trend.perWeekKg, 2)} kg/semana · em 4 semanas ≈{' '}
              <span className="text-ink">
                {formatNumber(trend.in4Weeks, 1)} kg
              </span>
            </p>
          )}
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
          <Art name="tape" size={44} className="shrink-0" />
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

/** Estimated 1RM per session of the most trained lifts, and where it heads. */
function StrengthCard() {
  const { history } = useAppStore();
  const { push } = useNavigation();
  const lifts = useMemo(() => trackedLifts(history), [history]);
  const [chosen, setChosen] = useState<string | null>(null);
  const lift = lifts.find((item) => item.exerciseId === chosen) ?? lifts[0];
  const trend = useMemo(
    () =>
      lift ? strengthTrend(history, lift.exerciseId, lift.exerciseName) : null,
    [history, lift],
  );

  return (
    <section aria-labelledby="stats-strength">
      <SectionHeader
        id="stats-strength"
        title="Evolução de força"
        action={
          lift && findExercise(lift.exerciseId) ? (
            <Button
              variant="ghost"
              size="sm"
              trailingIcon={ChevronRight}
              onClick={() =>
                push({ name: 'exercise', exerciseId: lift.exerciseId })
              }
            >
              Exercício
            </Button>
          ) : undefined
        }
      />
      {!lift || !trend ? (
        <Card className="p-4">
          <ProgressScene className="mx-auto max-w-xs" />
          <p className="text-callout mt-2 text-center text-ink-2">
            Faça o mesmo exercício com carga em 2 treinos para ver a evolução e
            a projeção de força.
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <div
            role="radiogroup"
            aria-label="Exercício"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"
          >
            {lifts.map((item) => (
              <button
                key={item.exerciseId}
                type="button"
                role="radio"
                aria-checked={item.exerciseId === lift.exerciseId}
                onClick={() => setChosen(item.exerciseId)}
                className={cx(
                  'pressable text-footnote h-8 max-w-56 shrink-0 truncate rounded-full border px-3.5 font-semibold',
                  item.exerciseId === lift.exerciseId
                    ? 'border-brand bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-ink-2',
                )}
              >
                {item.exerciseName}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label="1RM estimado"
              value={formatWeight(trend.latest)}
              unit="kg"
              size="sm"
            />
            <Stat
              label="Ritmo"
              value={
                trend.perMonthKg === null
                  ? '—'
                  : `${trend.perMonthKg > 0 ? '+' : ''}${formatNumber(trend.perMonthKg, 1)}`
              }
              unit={trend.perMonthKg === null ? undefined : 'kg/mês'}
              size="sm"
              tone={
                trend.perMonthKg !== null && trend.perMonthKg > 0
                  ? 'success'
                  : 'default'
              }
            />
            <Stat
              label="Em 3 meses"
              value={
                trend.projections.length > 0
                  ? formatWeight(trend.projections[1].oneRepMax)
                  : '—'
              }
              unit={trend.projections.length > 0 ? 'kg' : undefined}
              size="sm"
              tone={trend.projections.length > 0 ? 'brand' : 'default'}
            />
          </div>
          <div className="mt-3">
            <LineChart
              zoom
              height={150}
              data={trend.sessions.map((session) => ({
                key: session.date,
                label: formatShortDate(session.date),
                value: session.oneRepMax,
              }))}
              label={`1RM estimado de ${lift.exerciseName} por treino`}
              formatValue={(value) => `${formatWeight(value)} kg`}
              formatTick={(value) => formatNumber(value, 0)}
            />
          </div>
          <p className="text-caption mt-2 text-ink-3">
            {trend.perMonthKg === null
              ? 'Com 3 treinos desse exercício aparece o ritmo e a projeção.'
              : trend.projections.length > 0
                ? `Projeção pela tendência dos últimos 6 meses: ${formatWeight(trend.projections[0].oneRepMax)} kg em 4 semanas. Na prática o ganho desacelera com o tempo.`
                : 'Estável ou caindo nos últimos 6 meses: vale revisar carga, volume e descanso.'}
          </p>
        </Card>
      )}
    </section>
  );
}

const ZONES: Record<VolumeZone, { label: string; className: string }> = {
  low: { label: 'Pouco', className: 'bg-warmup-soft text-warmup' },
  ok: { label: 'Ideal', className: 'bg-success-soft text-success-ink' },
  high: { label: 'Alto', className: 'bg-danger-soft text-danger-ink' },
};

/** Working sets per week for each muscle over the last 4 weeks. */
function MuscleBalanceCard() {
  const { history } = useAppStore();
  const rows = useMemo(
    () =>
      weeklySetsByMuscle(history, 4, (exercise) =>
        exercise.exerciseId
          ? findExercise(exercise.exerciseId)?.primaryMuscleGroup
          : undefined,
      ),
    [history],
  );
  if (rows.length === 0) return null;
  const max = Math.max(20, ...rows.map((row) => row.weeklySets));
  return (
    <section aria-labelledby="stats-balance">
      <SectionHeader id="stats-balance" title="Séries por semana" />
      <Card as="div" className="p-4">
        <MuscleMapCard
          work={historyMuscleWork(
            history,
            addDays(startOfDay(new Date()), -27),
          )}
          full={48}
          height={130}
          className="mb-4 border-b border-line pb-4"
        />
        <p className="text-footnote mb-3 text-ink-2">
          Média das últimas 4 semanas. Entre 10 e 20 séries por músculo é a
          faixa mais usada para crescer.
        </p>
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.group}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-callout truncate font-medium">
                  {muscleLabel(row.group)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-footnote text-ink-2 tabular">
                    {formatNumber(row.weeklySets, 1)} séries
                  </span>
                  <span
                    className={cx(
                      'text-caption rounded-full px-2 py-0.5 font-semibold',
                      ZONES[row.zone].className,
                    )}
                  >
                    {ZONES[row.zone].label}
                  </span>
                </span>
              </div>
              <div
                className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 bg-success-soft"
                  style={{
                    left: `${(10 / max) * 100}%`,
                    width: `${(10 / max) * 100}%`,
                  }}
                />
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{ width: `${(row.weeklySets / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

type RecordEntry = [
  string,
  {
    name: string;
    records: Partial<Record<PersonalRecordType, PersonalRecordItem>>;
  },
];

/** One exercise's records in a line; opens the exercise. */
function RecordRow({
  exerciseId,
  name,
  records,
}: {
  exerciseId: string;
  name: string;
  records: RecordEntry[1]['records'];
}) {
  const { push } = useNavigation();
  return (
    <button
      type="button"
      onClick={() =>
        findExercise(exerciseId) && push({ name: 'exercise', exerciseId })
      }
      className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-raised"
    >
      <Medal size={22} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="text-callout block truncate font-medium">{name}</span>
        <span className="text-footnote mt-0.5 flex flex-wrap gap-x-3 text-ink-2">
          {(['weight', 'estimated_1rm', 'volume'] as PersonalRecordType[]).map(
            (type) =>
              records[type] ? (
                <span key={type}>
                  {RECORD_LABELS[type]}:{' '}
                  <span className="text-ink tabular">
                    {formatWeight(records[type]!.value)} kg
                  </span>
                </span>
              ) : null,
          )}
        </span>
      </span>
    </button>
  );
}

/** Every record, with a search box for long lists. */
function AllRecordsSheet({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: RecordEntry[];
}) {
  const [query, setQuery] = useState('');
  const key = searchKey(query);
  const shown = key
    ? entries.filter(([, entry]) => searchKey(entry.name).includes(key))
    : entries;
  return (
    <Sheet open={open} onClose={onClose} title="Recordes pessoais">
      <TextField
        label="Buscar exercício"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ex.: supino"
      />
      <div className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line">
        {shown.length === 0 ? (
          <p className="text-callout px-4 py-5 text-center text-ink-3">
            Nenhum recorde com esse nome.
          </p>
        ) : (
          shown.map(([exerciseId, entry]) => (
            <RecordRow
              key={exerciseId}
              exerciseId={exerciseId}
              name={entry.name}
              records={entry.records}
            />
          ))
        )}
      </div>
    </Sheet>
  );
}
