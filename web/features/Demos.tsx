import { useEffect, useState } from 'react';
import {
  Check,
  CloudOff,
  FileSpreadsheet,
  Pause,
  Plus,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { formatClock } from '../lib/format';
import { Medal } from '../ui/Feedback';
import { cx } from '../ui/core';

/*
 * Self-playing illustrations for the welcome screen and the tutorial. They
 * are decorative (aria-hidden): each slide's text carries the meaning.
 * `loopMs` remounts the scene so the animation replays.
 */

function useReplay(loopMs: number | undefined): number {
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!loopMs) return;
    const id = setInterval(() => setRound((value) => value + 1), loopMs);
    return () => clearInterval(id);
  }, [loopMs]);
  return round;
}

const DEMO_SETS = [
  { label: 'A', previous: '40 × 10', weight: '40', reps: '10', warmup: true },
  { label: '1', previous: '60 × 8', weight: '60', reps: '8' },
  { label: '2', previous: '60 × 8', weight: '62,5', reps: '8', record: true },
];

/** A set table completing itself — the product in one glance. */
export function SetTableDemo({
  loopMs,
  className,
}: {
  loopMs?: number;
  className?: string;
}) {
  const round = useReplay(loopMs);
  return (
    <div
      key={round}
      className={cx(
        'ember-edge rounded-xl bg-surface p-4 shadow-pop',
        className,
      )}
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="font-metric text-footnote grid size-10 place-items-center rounded-lg bg-raised text-ink-2 ring-1 ring-line-strong">
          PEI
        </span>
        <div className="min-w-0">
          <p className="text-headline truncate font-semibold">
            Supino reto com barra
          </p>
          <p className="text-footnote flex items-center gap-1 text-ink-2">
            <Timer size={14} /> Descanso 1:30
          </p>
        </div>
      </div>
      <div className="text-micro grid grid-cols-[2.25rem_1fr_3.5rem_3rem_2.5rem] gap-2 px-1 pb-1.5 font-semibold tracking-wider text-ink-3 uppercase">
        <span className="text-center">Série</span>
        <span>Última vez</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {DEMO_SETS.map((set, index) => {
          const delay = 700 + index * 650;
          return (
            <div
              key={set.label}
              className="strike grid animate-row-done grid-cols-[2.25rem_1fr_3.5rem_3rem_2.5rem] items-center gap-2 rounded-md px-1 py-1"
              style={{
                animationDelay: `${delay}ms`,
                ['--strike-delay' as string]: `${delay}ms`,
              }}
            >
              <span
                className={cx(
                  'grid h-9 place-items-center rounded-md font-semibold',
                  set.warmup
                    ? 'bg-warmup-soft text-warmup'
                    : 'bg-raised text-ink',
                )}
              >
                {set.label}
              </span>
              <span className="text-callout truncate text-ink-3 tabular">
                {set.previous}
              </span>
              <span className="text-body grid h-9 place-items-center rounded-md bg-raised font-semibold tabular">
                {set.weight}
              </span>
              <span className="text-body grid h-9 place-items-center rounded-md bg-raised font-semibold tabular">
                {set.reps}
              </span>
              <span className="relative grid h-9 place-items-center">
                <span
                  className="grid size-9 animate-pop place-items-center rounded-md bg-brand text-on-brand"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <Check size={18} strokeWidth={3} />
                </span>
                {set.record && (
                  <span
                    className="absolute -top-2 -right-1.5 animate-medal"
                    style={{ animationDelay: `${delay + 250}ms` }}
                  >
                    <Medal size={20} />
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Rest countdown ring, sped up so the whole cycle fits in a few seconds. */
export function RestRingDemo({ className }: { className?: string }) {
  const TOTAL = 90;
  const [left, setLeft] = useState(TOTAL);
  useEffect(() => {
    const id = setInterval(
      () => setLeft((value) => (value <= 0 ? TOTAL : value - 3)),
      100,
    );
    return () => clearInterval(id);
  }, []);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = left / TOTAL;
  const done = left <= 0;

  return (
    <div
      className={cx('flex flex-col items-center gap-5', className)}
      aria-hidden="true"
    >
      <div className="relative size-44">
        <svg className="size-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="var(--color-raised)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={done ? 'var(--color-success)' : 'var(--color-brand)'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 100ms linear' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-metric text-metric-lg tabular">
              {done ? 'Bora!' : formatClock(left)}
            </p>
            <p className="text-caption text-ink-2">
              {done ? 'Próxima série' : 'Descanso'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-callout inline-flex h-10 items-center gap-1.5 rounded-full bg-raised px-4 font-semibold">
          −15s
        </span>
        <span className="grid size-10 place-items-center rounded-full bg-raised">
          <Pause size={18} />
        </span>
        <span className="text-callout inline-flex h-10 items-center gap-1.5 rounded-full bg-raised px-4 font-semibold">
          <Plus size={14} strokeWidth={3} />
          15s
        </span>
      </div>
    </div>
  );
}

const BARS = [38, 46, 44, 58, 55, 67, 74, 88];

/** Weekly volume bars growing, with a record popping on the last one. */
export function ProgressDemo({
  loopMs,
  className,
}: {
  loopMs?: number;
  className?: string;
}) {
  const round = useReplay(loopMs);
  return (
    <div
      key={round}
      className={cx('rounded-xl bg-surface p-4 shadow-pop', className)}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption text-ink-2">Volume por semana</p>
          <p className="font-metric text-metric">18,4 t</p>
        </div>
        <span
          className="text-caption inline-flex animate-pop items-center gap-1 rounded-sm bg-success-soft px-2 py-1 font-semibold text-success-ink"
          style={{ animationDelay: '1300ms' }}
        >
          <TrendingUp size={14} /> +23%
        </span>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2">
        {BARS.map((height, index) => {
          const last = index === BARS.length - 1;
          return (
            <div key={index} className="relative flex h-full flex-1 items-end">
              <span
                className={cx(
                  'demo-grow block w-full rounded-t-md',
                  last
                    ? 'bg-linear-to-t from-brand-press to-brand'
                    : 'bg-overlay',
                )}
                style={{
                  height: `${height}%`,
                  animationDelay: `${150 + index * 90}ms`,
                }}
              />
              {last && (
                <span
                  className="absolute -top-7 left-1/2 -translate-x-1/2 animate-medal"
                  style={{ animationDelay: '1100ms' }}
                >
                  <Medal size={24} />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div
        className="text-footnote mt-3 flex animate-rise items-center gap-2 rounded-md bg-raised px-3 py-2"
        style={{ animationDelay: '1400ms' }}
      >
        <Medal size={16} />
        <span className="min-w-0 flex-1 truncate">
          Novo recorde · Agachamento 110 kg
        </span>
      </div>
    </div>
  );
}

const IMPORTED = [
  { day: '21', name: 'Upper A', meta: '1h 39min · 6.877 kg' },
  { day: '19', name: 'Lower B', meta: '1h 12min · 9.420 kg' },
  { day: '17', name: 'Pull', meta: '58min · 5.310 kg' },
];

/** A CSV file turning into logbook entries, with the offline badge. */
export function ImportDemo({
  loopMs,
  className,
}: {
  loopMs?: number;
  className?: string;
}) {
  const round = useReplay(loopMs);
  return (
    <div
      key={round}
      className={cx('relative space-y-2.5', className)}
      aria-hidden="true"
    >
      <div className="flex animate-rise items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-3">
        <span className="grid size-10 place-items-center rounded-md bg-success-soft text-success-ink">
          <FileSpreadsheet size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-callout block font-semibold">workouts.csv</span>
          <span className="text-caption text-ink-2">
            51 treinos · 731 séries
          </span>
        </span>
        <span
          className="grid size-7 animate-pop place-items-center rounded-full bg-brand text-on-brand"
          style={{ animationDelay: '500ms' }}
        >
          <Check size={15} strokeWidth={3} />
        </span>
      </div>
      {IMPORTED.map((workout, index) => (
        <div
          key={workout.day}
          className="flex animate-rise items-center gap-3 rounded-lg border border-line bg-surface p-3"
          style={{ animationDelay: `${800 + index * 220}ms` }}
        >
          <span className="flex w-11 flex-col items-center rounded-md bg-raised py-1.5">
            <span className="font-metric text-body leading-none">
              {workout.day}
            </span>
            <span className="text-micro mt-0.5 font-semibold text-ink-2">
              SET
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-callout block font-semibold">
              {workout.name}
            </span>
            <span className="text-caption text-ink-2 tabular">
              {workout.meta}
            </span>
          </span>
        </div>
      ))}
      <span
        className="text-caption absolute -top-3 -right-2 inline-flex animate-pop items-center gap-1.5 rounded-full bg-overlay px-2.5 py-1 font-semibold text-ink shadow-pop"
        style={{ animationDelay: '1700ms' }}
      >
        <CloudOff size={13} /> Funciona offline
      </span>
    </div>
  );
}
