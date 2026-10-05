import { useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { restRemainingMs } from '../lib/rest';
import { formatClock } from '../lib/format';
import { haptic } from '../lib/haptics';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Overlay';
import { useNow } from '../ui/core';

export function useRestCountdown() {
  const { restTimer } = useAppStore();
  const active = restTimer.status !== 'idle';
  const now = useNow(250, restTimer.status === 'running');
  const remainingMs = active ? restRemainingMs(restTimer, now) : 0;
  return {
    timer: restTimer,
    active,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    progress:
      active && restTimer.totalSeconds > 0
        ? remainingMs / (restTimer.totalSeconds * 1000)
        : 0,
  };
}

/**
 * Floating rest capsule over the active workout: a countdown ring (tap to
 * pause), the time left and quick adjustments.
 */
export function RestTimerBar() {
  const { timer, active, remainingSeconds, progress } = useRestCountdown();
  if (!active) return null;
  const paused = timer.status === 'paused';
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, progress));

  return (
    <div className="pointer-events-none fixed right-0 bottom-0 left-[var(--sidebar-width)] z-10 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div
        className="app-column pointer-events-auto flex animate-rise items-center gap-2 rounded-2xl border border-line-strong bg-surface/95 p-2 pr-2.5 shadow-dock backdrop-blur-md"
        role="timer"
        aria-label={`Descanso: ${formatClock(remainingSeconds)} restantes${paused ? ', pausado' : ''}`}
      >
        <button
          type="button"
          onClick={actions.pauseResumeRestTimer}
          aria-label={paused ? 'Retomar descanso' : 'Pausar descanso'}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-0.5 pl-0.5 text-left active:opacity-70"
        >
          <span className="relative grid size-12 shrink-0 place-items-center">
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke="var(--color-raised)"
                strokeWidth="4"
              />
              <circle
                cx="24"
                cy="24"
                r={radius}
                fill="none"
                stroke={paused ? 'var(--color-warmup)' : 'var(--color-brand)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                style={{ transition: 'stroke-dashoffset 250ms linear' }}
              />
            </svg>
            {paused ? (
              <Play size={16} className="text-warmup" aria-hidden="true" />
            ) : (
              <Pause size={16} className="text-brand-ink" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="font-metric text-metric-sm block tabular">
              {formatClock(remainingSeconds)}
            </span>
            <span className="text-caption block truncate text-ink-2">
              {paused ? 'Pausado' : 'Descansando'}
              {timer.label ? ` · ${timer.label}` : ''}
            </span>
          </span>
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => actions.addRestTime(-15)}
          aria-label="Menos 15 segundos"
          className="px-2.5"
        >
          −15
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => actions.addRestTime(15)}
          aria-label="Mais 15 segundos"
          className="px-2.5"
        >
          +15
        </Button>
        <Button variant="primary" size="sm" onClick={actions.stopRestTimer}>
          Pular
        </Button>
      </div>
    </div>
  );
}

/**
 * Ends the rest when its deadline passes — also after the tab was in the
 * background — with a vibration and a toast (if rest alerts are enabled).
 */
export function RestTimerWatcher() {
  const { restTimer, notificationPrefs } = useAppStore();
  const toast = useToast();
  const now = useNow(500, restTimer.status === 'running');
  const firedFor = useRef<number | null>(null);
  const expired =
    restTimer.status === 'running' &&
    restTimer.endsAt !== null &&
    now >= restTimer.endsAt;

  useEffect(() => {
    if (
      !expired ||
      restTimer.endsAt === null ||
      firedFor.current === restTimer.endsAt
    )
      return;
    firedFor.current = restTimer.endsAt;
    actions.stopRestTimer();
    if (notificationPrefs.restTimerAlerts) {
      haptic('warning');
      toast({
        tone: 'success',
        title: 'Descanso concluído',
        description: 'Hora da próxima série.',
      });
    }
  }, [expired, restTimer.endsAt, notificationPrefs.restTimerAlerts, toast]);

  return null;
}
