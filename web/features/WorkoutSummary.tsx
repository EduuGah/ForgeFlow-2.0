import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Target } from 'lucide-react';
import type { FinishResult } from '../store';
import {
  formatDurationMinutes,
  formatNumber,
  formatWeight,
} from '../lib/format';
import { RECORD_LABELS } from '../lib/training';
import { Button } from '../ui/Button';
import { Medal } from '../ui/Feedback';
import { Stat } from '../ui/Layout';
import { cx, useBackLayer, usePresence, useScrollLock } from '../ui/core';

/** Full-screen celebration after saving a workout. */
export function WorkoutSummary({
  result,
  onClose,
  onOpenWorkout,
}: {
  result: FinishResult | null;
  onClose: () => void;
  onOpenWorkout: (workoutId: string) => void;
}) {
  const open = result !== null;
  const { mounted, closing, onExited } = usePresence(open, 300);
  useBackLayer(open, onClose);
  useScrollLock(mounted);

  // Keep the last result on screen while the overlay fades out.
  const [lastResult, setLastResult] = useState(result);
  if (result && result !== lastResult) setLastResult(result);
  const shown = result ?? lastResult;

  if (!mounted || !shown) return null;
  const { workout, records, goalsReached, workoutNumber } = shown;
  const hasRecords = records.length > 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && closing) onExited();
      }}
      className={cx(
        'fixed inset-0 z-55 overflow-y-auto bg-canvas',
        closing ? 'animate-fade-out' : 'animate-fade-in',
      )}
    >
      <div className="app-column pt-safe flex min-h-dvh flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center pt-14 text-center">
          <div className="relative grid size-28 animate-pop place-items-center rounded-full bg-brand-soft">
            {hasRecords ? (
              <span
                className="animate-medal"
                style={{ animationDelay: '200ms' }}
              >
                <Medal size={64} />
              </span>
            ) : (
              <span className="font-metric text-metric-lg text-brand-ink">
                {workoutNumber}º
              </span>
            )}
          </div>
          <p
            className="text-callout mt-6 animate-rise text-brand-ink"
            style={{ animationDelay: '120ms' }}
          >
            {workoutNumber}º treino concluído
          </p>
          <h1
            id="summary-title"
            className="text-title-lg mt-1 animate-rise font-bold"
            style={{ animationDelay: '180ms' }}
          >
            {hasRecords
              ? 'Novo recorde pessoal!'
              : 'Treino salvo. Bom trabalho!'}
          </h1>
          <p
            className="text-body mt-1 animate-rise text-ink-2"
            style={{ animationDelay: '240ms' }}
          >
            {workout.name}
          </p>

          <div
            className="mt-8 grid w-full animate-rise grid-cols-3 gap-3 rounded-lg bg-surface p-4 text-left"
            style={{ animationDelay: '300ms' }}
          >
            <Stat
              label="Duração"
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
          </div>

          {hasRecords && (
            <section
              className="mt-4 w-full rounded-lg bg-surface p-4 text-left"
              aria-label="Recordes pessoais"
            >
              <h2 className="text-headline mb-2 font-semibold">
                {records.length}{' '}
                {records.length === 1 ? 'recorde pessoal' : 'recordes pessoais'}
              </h2>
              <ul className="divide-y divide-line" role="list">
                {records.map((record, index) => (
                  <li
                    key={record.id}
                    className="flex animate-rise items-center gap-3 py-2.5"
                    style={{ animationDelay: `${420 + index * 90}ms` }}
                  >
                    <Medal size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="text-callout truncate font-medium">
                        {record.exerciseName}
                      </p>
                      <p className="text-footnote text-ink-2">
                        {RECORD_LABELS[record.type]}
                      </p>
                    </div>
                    <p className="font-metric text-metric-sm text-record">
                      {formatWeight(record.value)} kg
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {goalsReached.length > 0 && (
            <section
              className="mt-4 w-full rounded-lg bg-success-soft p-4 text-left"
              aria-label="Metas atingidas"
            >
              {goalsReached.map((goal) => (
                <p
                  key={goal.id}
                  className="text-callout flex items-center gap-2 font-medium text-success-ink"
                >
                  <Target size={18} aria-hidden="true" /> Meta atingida:{' '}
                  {goal.title}
                </p>
              ))}
            </section>
          )}
        </div>

        <div className="mt-8 space-y-2">
          <Button size="lg" block onClick={onClose}>
            Concluir
          </Button>
          <Button
            size="lg"
            variant="ghost"
            block
            onClick={() => onOpenWorkout(workout.id)}
          >
            Ver detalhes do treino
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
