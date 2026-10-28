import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import {
  formatDurationMinutes,
  formatNumber,
  formatWeight,
} from '../lib/format';
import { percentChange } from '../lib/training';
import {
  periodSummary,
  summaryShareText,
  type PeriodSummary,
  type SummaryPeriod,
} from '../lib/summaries';
import { shareStory, type StoryContent } from '../lib/storyImage';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/Form';
import { Delta, Stat } from '../ui/Layout';
import { CountUp } from '../ui/Motion';
import { Sheet } from '../ui/Overlay';
import { ShareSheet } from './ShareSheet';
import { shareText } from './shareWorkout';

const PERIODS: { value: SummaryPeriod; label: string }[] = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
];

const PREVIOUS: Record<SummaryPeriod, string> = {
  day: 'vs ontem',
  week: 'vs semana passada',
  month: 'vs mês passado',
};

function summaryStory(summary: PeriodSummary): StoryContent {
  const rows: [string, string][] = [];
  if (summary.topMuscle) rows.push(['Mais treinado', summary.topMuscle]);
  if (summary.topExercise) rows.push([summary.topExercise, 'favorito']);
  return {
    eyebrow:
      summary.period === 'day'
        ? 'Meu treino de hoje'
        : summary.period === 'week'
          ? 'Minha semana de treinos'
          : 'Meu mês de treinos',
    title: summary.title,
    subtitle: `${summary.workouts} ${summary.workouts === 1 ? 'treino' : 'treinos'} · ${formatDurationMinutes(summary.durationMinutes)}`,
    stats: [
      { label: 'Treinos', value: formatNumber(summary.workouts, 0) },
      { label: 'Volume', value: `${formatWeight(summary.volumeKg)} kg` },
      { label: 'Séries', value: formatNumber(summary.sets, 0) },
      { label: 'Recordes', value: formatNumber(summary.records, 0) },
    ],
    rows,
    footer: '@forgeflow',
  };
}

/** Day, week or month in numbers, ready to share. */
export function SummarySheet({
  open,
  onClose,
  initial = 'week',
}: {
  open: boolean;
  onClose: () => void;
  initial?: SummaryPeriod;
}) {
  const { history, prs } = useAppStore();
  const [period, setPeriod] = useState<SummaryPeriod>(initial);
  const [sharing, setSharing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setPeriod(initial);
  }
  const summary = useMemo(
    () =>
      periodSummary(history, prs, period, (id) =>
        id ? findExercise(id)?.primaryMuscleGroup : undefined,
      ),
    [history, prs, period],
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Resumo"
        footer={
          <Button
            size="lg"
            block
            icon={Share2}
            disabled={summary.workouts === 0}
            onClick={() => setSharing(true)}
          >
            Compartilhar resumo
          </Button>
        }
      >
        <div className="space-y-4">
          <SegmentedControl
            label="Período do resumo"
            value={period}
            onChange={setPeriod}
            options={PERIODS}
          />
          <div>
            <h3 className="text-title font-bold">{summary.title}</h3>
            {summary.workouts > 0 && (
              <Delta
                value={percentChange(
                  summary.volumeKg,
                  summary.previousVolumeKg,
                )}
                suffix={`de volume ${PREVIOUS[period]}`}
              />
            )}
          </div>
          {summary.workouts === 0 ? (
            <p className="text-callout rounded-lg bg-raised p-4 text-ink-2">
              {period === 'day'
                ? 'Nenhum treino hoje ainda.'
                : 'Nenhum treino neste período ainda.'}
            </p>
          ) : (
            <>
              <div
                key={period}
                className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-lg bg-raised p-4"
              >
                <Stat
                  label="Treinos"
                  value={
                    <CountUp
                      value={summary.workouts}
                      format={(value) => formatNumber(Math.round(value), 0)}
                    />
                  }
                />
                <Stat
                  label="Tempo"
                  value={formatDurationMinutes(summary.durationMinutes)}
                />
                <Stat
                  label="Volume"
                  value={
                    <CountUp value={summary.volumeKg} format={formatWeight} />
                  }
                  unit="kg"
                />
                <Stat
                  label="Séries"
                  value={
                    <CountUp
                      value={summary.sets}
                      format={(value) => formatNumber(Math.round(value), 0)}
                    />
                  }
                />
                <Stat
                  label="Recordes"
                  value={formatNumber(summary.records, 0)}
                  tone={summary.records > 0 ? 'record' : 'default'}
                />
              </div>
              <ul className="text-callout space-y-1.5">
                {summary.topMuscle && (
                  <li>
                    🔥 Mais treinado:{' '}
                    <span className="font-semibold">{summary.topMuscle}</span>
                  </li>
                )}
                {summary.topExercise && (
                  <li>
                    ⭐ Exercício do período:{' '}
                    <span className="font-semibold">{summary.topExercise}</span>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </Sheet>
      <ShareSheet
        open={sharing}
        onClose={() => setSharing(false)}
        title="Compartilhar resumo"
        text={() =>
          shareText(summaryShareText(summary, window.location.origin))
        }
        image={() =>
          shareStory(summaryStory(summary), `forgeflow-resumo-${period}.png`)
        }
      />
    </>
  );
}
