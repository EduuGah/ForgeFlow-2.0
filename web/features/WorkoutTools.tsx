import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatClock, formatNumber, formatWeight } from '../lib/format';
import { haptic } from '../lib/haptics';
import { BARS, PLATE_COLORS, platesFor } from '../lib/plates';
import {
  playCountdownTick,
  playRestSound,
  primeRestSound,
  vibrateRestEnd,
} from '../lib/restAlert';
import { Button } from '../ui/Button';
import { NumberField, SegmentedControl } from '../ui/Form';
import { Sheet } from '../ui/Overlay';
import { cx, useNow } from '../ui/core';

/* ------------------------------------------------------------------ */
/* Plate calculator                                                    */
/* ------------------------------------------------------------------ */

const BAR_KEY = 'forgeflow_bar';

function savedBar(): string {
  try {
    const value = localStorage.getItem(BAR_KEY);
    return BARS.some((bar) => bar.value === value) ? (value as string) : '20';
  } catch {
    return '20';
  }
}

const PLATE_SIZE: Record<number, { h: number; w: number }> = {
  25: { h: 104, w: 15 },
  20: { h: 104, w: 13 },
  15: { h: 92, w: 12 },
  10: { h: 78, w: 11 },
  5: { h: 58, w: 9 },
  2.5: { h: 46, w: 8 },
  1.25: { h: 38, w: 7 },
};

/** The bar with its plates, drawn like the real thing. */
function LoadedBar({ perSide, barKg }: { perSide: number[]; barKg: number }) {
  const center = 160;
  // Plates start right outside the collars (96–103 and 217–224).
  const sleeveStart = 64;
  const plates = (direction: 1 | -1) => {
    let offset = sleeveStart;
    return perSide.map((plate, index) => {
      const size = PLATE_SIZE[plate] ?? PLATE_SIZE[1.25];
      const x = direction === 1 ? center + offset : center - offset - size.w;
      offset += size.w + 1.5;
      return (
        <rect
          key={`${direction}-${index}`}
          x={x}
          y={70 - size.h / 2}
          width={size.w}
          height={size.h}
          rx="3"
          fill={PLATE_COLORS[plate]}
          stroke="rgb(0 0 0 / 0.25)"
          className="play-pop"
          style={{ animationDelay: `${index * 0.06}s` }}
        />
      );
    });
  };
  return (
    <svg
      viewBox="0 0 320 140"
      className="scene h-auto w-full"
      data-visible
      aria-hidden="true"
    >
      {barKg > 0 && (
        <>
          <rect x="18" y="66" width="284" height="8" rx="4" fill="#cdd3dc" />
          <rect x="96" y="58" width="7" height="24" rx="2" fill="#5b6372" />
          <rect x="217" y="58" width="7" height="24" rx="2" fill="#5b6372" />
        </>
      )}
      {plates(1)}
      {plates(-1)}
    </svg>
  );
}

export function PlateCalculatorSheet({
  open,
  onClose,
  initialKg,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  initialKg: number;
  /** Puts the computed load in the set. */
  onUse?: (kg: number) => void;
}) {
  const [target, setTarget] = useState(initialKg || 60);
  const [bar, setBar] = useState(savedBar);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setTarget(initialKg || 60);
  }
  const barKg = BARS.find((item) => item.value === bar)?.kg ?? 20;
  const load = platesFor(target, barKg);
  const groups = load.perSide.reduce<{ plate: number; count: number }[]>(
    (list, plate) => {
      const last = list.at(-1);
      if (last?.plate === plate) last.count += 1;
      else list.push({ plate, count: 1 });
      return list;
    },
    [],
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Calculadora de anilhas"
      description="Quanto colocar de cada lado da barra."
      footer={
        onUse ? (
          <Button
            size="lg"
            block
            disabled={!(load.totalKg > 0)}
            onClick={() => {
              onUse(load.totalKg);
              onClose();
            }}
          >
            Usar {formatWeight(load.totalKg)} kg na série
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <NumberField
          label="Carga total"
          suffix="kg"
          decimal
          value={target}
          max={1000}
          onValueChange={setTarget}
        />
        <div>
          <p className="text-footnote mb-1.5 font-medium text-ink-2">Barra</p>
          <SegmentedControl
            label="Barra"
            value={bar}
            onChange={(value) => {
              setBar(value);
              try {
                localStorage.setItem(BAR_KEY, value);
              } catch {
                // Only remembered for this visit.
              }
            }}
            options={BARS.map((item) => ({
              value: item.value,
              label: item.short,
            }))}
          />
        </div>
        <div className="rounded-lg bg-raised p-3">
          <LoadedBar
            key={`${load.perSide.join('-')}-${barKg}`}
            perSide={load.perSide}
            barKg={barKg}
          />
          {groups.length === 0 ? (
            <p className="text-callout text-center text-ink-2">
              {target <= barKg
                ? 'Só a barra já dá essa carga.'
                : 'Sem anilhas para esse valor.'}
            </p>
          ) : (
            <p className="text-callout text-center">
              <span className="text-ink-2">Cada lado: </span>
              <span className="font-semibold tabular">
                {groups
                  .map(
                    ({ plate, count }) =>
                      `${count > 1 ? `${count}× ` : ''}${formatNumber(plate, 2)} kg`,
                  )
                  .join(' + ')}
              </span>
            </p>
          )}
          {load.missingKg > 0 && (
            <p className="text-footnote mt-1 text-center text-ink-2">
              Fecha em {formatWeight(load.totalKg)} kg: faltam{' '}
              {formatWeight(load.missingKg)} kg que as anilhas não fazem.
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Hold timer                                                          */
/* ------------------------------------------------------------------ */

const HOLD_PRESETS = [20, 30, 45, 60, 90, 120];

/**
 * A countdown for holds (prancha, isometria) or a free stopwatch; at the end
 * it sounds like the rest timer and can note the seconds in the set.
 */
export function HoldTimerSheet({
  open,
  onClose,
  exerciseName,
  onRecord,
}: {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  /** Notes the seconds in the next set and completes it. */
  onRecord?: (seconds: number) => void;
}) {
  const [goal, setGoal] = useState<number | null>(60);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const running = startedAt !== null;
  const now = useNow(100, running);
  const elapsedMs = banked + (running ? now - startedAt : 0);
  const elapsed = Math.floor(elapsedMs / 1000);
  const left = goal === null ? null : Math.max(0, goal - elapsed);
  const done = goal !== null && left === 0 && elapsedMs > 0;
  const finishedFor = useRef(false);
  const tickedAt = useRef<number | null>(null);

  // The end: sound and vibration once, then it stops.
  useEffect(() => {
    if (!done || finishedFor.current) return;
    finishedFor.current = true;
    playRestSound();
    vibrateRestEnd();
    const frame = requestAnimationFrame(() => {
      setBanked((goal ?? 0) * 1000);
      setStartedAt(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [done, goal]);

  useEffect(() => {
    if (!running || left === null || left < 1 || left > 3) return;
    if (tickedAt.current === left) return;
    tickedAt.current = left;
    playCountdownTick();
  }, [running, left]);

  const reset = () => {
    setStartedAt(null);
    setBanked(0);
    finishedFor.current = false;
    tickedAt.current = null;
  };
  const toggle = () => {
    primeRestSound();
    haptic('tap');
    if (running) {
      setBanked(elapsedMs);
      setStartedAt(null);
    } else {
      if (done) reset();
      setStartedAt(Date.now());
    }
  };

  const shown = left ?? elapsed;
  const fraction =
    goal === null ? (elapsed % 60) / 60 : Math.min(1, elapsed / goal);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const seconds = goal !== null && done ? goal : elapsed;

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Cronômetro"
      description={exerciseName}
    >
      <div className="space-y-5">
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Tempo"
        >
          {[...HOLD_PRESETS, null].map((preset) => (
            <button
              key={preset ?? 'free'}
              type="button"
              role="radio"
              aria-checked={goal === preset}
              disabled={running}
              onClick={() => {
                setGoal(preset);
                reset();
              }}
              className={cx(
                'pressable text-footnote h-9 rounded-full border px-3.5 font-semibold disabled:opacity-50',
                goal === preset
                  ? 'border-brand bg-brand-soft text-brand-ink'
                  : 'border-line bg-surface text-ink-2',
              )}
            >
              {preset === null ? 'Livre' : formatClock(preset)}
            </button>
          ))}
        </div>

        <div className="grid place-items-center">
          <div className="relative grid size-40 place-items-center">
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="var(--color-raised)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={
                  done ? 'var(--color-success-ink)' : 'var(--color-brand)'
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                style={{ transition: 'stroke-dashoffset 120ms linear' }}
              />
            </svg>
            <span
              className="font-metric text-metric-lg tabular"
              role="timer"
              aria-live="off"
            >
              {formatClock(shown)}
            </span>
          </div>
          <p className="text-footnote mt-2 text-ink-2" aria-live="polite">
            {done
              ? 'Tempo completo!'
              : running
                ? goal === null
                  ? 'Contando…'
                  : 'Segura firme…'
                : elapsed > 0
                  ? 'Pausado'
                  : goal === null
                    ? 'Conta até você parar'
                    : `Contagem de ${formatClock(goal)}`}
          </p>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button
            variant="secondary"
            size="lg"
            icon={RotateCcw}
            onClick={reset}
            aria-label="Zerar"
            disabled={elapsedMs === 0}
          >
            Zerar
          </Button>
          <Button size="lg" icon={running ? Pause : Play} onClick={toggle}>
            {running
              ? 'Pausar'
              : done
                ? 'De novo'
                : elapsed > 0
                  ? 'Continuar'
                  : 'Começar'}
          </Button>
        </div>
        {onRecord && seconds > 0 && !running && (
          <Button
            variant="tinted"
            size="lg"
            block
            onClick={() => {
              onRecord(seconds);
              reset();
              onClose();
            }}
          >
            Anotar {seconds} s na próxima série
          </Button>
        )}
      </div>
    </Sheet>
  );
}
