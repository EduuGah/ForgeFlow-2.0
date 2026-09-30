import { useMemo, useState } from 'react';
import { Award, Calculator, Check, Lock } from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
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
} from '../lib/training';
import type { PersonalRecordItem, PersonalRecordType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { BarChart, RankedBars } from '../ui/Charts';
import { EmptyState, Medal, ProgressBar } from '../ui/Feedback';
import { NumberField, SegmentedControl } from '../ui/Form';
import { Card, Delta, SectionHeader, StackHeader, Stat } from '../ui/Layout';
import { cx } from '../ui/core';

type PeriodDays = '7' | '30' | '90';

const PERIODS: { value: PeriodDays; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

export function StatsScreen() {
  const { history, prs, streakWeeks } = useAppStore();
  const { pop, push } = useNavigation();
  const [period, setPeriod] = useState<PeriodDays>('30');
  const days = Number(period);

  const comparison = useMemo(
    () => comparePeriods(history, days),
    [history, days],
  );
  const volumeBuckets = useMemo(
    () =>
      days === 7
        ? bucketDays(history, 7, 'volume')
        : bucketHistory(history, days === 30 ? '1m' : '3m', 'volume'),
    [history, days],
  );
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
  const totalVolume = history.reduce(
    (total, workout) => total + workout.totalVolumeKg,
    0,
  );

  const achievements = [
    {
      title: 'Primeiro treino',
      description: 'Conclua seu primeiro treino.',
      progress: Math.min(1, history.length),
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
      progress: Math.min(10, history.length),
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
      <StackHeader title="Estatísticas" onBack={pop} />
      <div className="app-column space-y-6 px-4 pt-4">
        <SegmentedControl
          label="Período"
          options={PERIODS}
          value={period}
          onChange={setPeriod}
        />

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
            Variação comparada aos {days} dias anteriores.
          </p>
        </Card>

        <section aria-labelledby="stats-volume">
          <SectionHeader
            title={days === 7 ? 'Volume por dia' : 'Volume por semana'}
          />
          <h2 id="stats-volume" className="sr-only">
            Volume
          </h2>
          <Card className="p-4">
            <BarChart
              data={volumeBuckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.value,
              }))}
              label={
                days === 7
                  ? 'Volume de séries de trabalho por dia'
                  : 'Volume de séries de trabalho por semana'
              }
              formatValue={(value) => `${formatWeight(value)} kg`}
              formatTick={formatCompact}
            />
          </Card>
        </section>

        <section aria-labelledby="stats-muscles">
          <SectionHeader title="Séries por grupo muscular" />
          <h2 id="stats-muscles" className="sr-only">
            Séries por grupo muscular
          </h2>
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
          <SectionHeader title="Recordes pessoais" />
          <h2 id="stats-records" className="sr-only">
            Recordes pessoais
          </h2>
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
          <SectionHeader title="Conquistas" />
          <h2 id="stats-achievements" className="sr-only">
            Conquistas
          </h2>
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
