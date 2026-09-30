import { useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { restRemainingMs } from '../lib/rest';
import { formatClock } from '../lib/format';
import { haptic } from '../lib/haptics';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Overlay';
import { cx, useNow } from '../ui/core';

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

/** Rest countdown docked at the bottom of the active workout. */
export function RestTimerBar() {
  const { timer, active, remainingSeconds, progress } = useRestCountdown();
  if (!active) return null;
  const paused = timer.status === 'paused';

  return (
    <div
      className="pb-safe fixed inset-x-0 bottom-0 z-10 animate-sheet-in border-t border-line-strong bg-raised/95 backdrop-blur-md"
      role="timer"
      aria-label={`Descanso: ${formatClock(remainingSeconds)} restantes${paused ? ', pausado' : ''}`}
    >
      <div className="h-1 bg-overlay" aria-hidden="true">
        <div
          className="h-full bg-brand-ink transition-[width] duration-300 ease-linear"
          style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        />
      </div>
      <div className="app-column flex items-center gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={actions.pauseResumeRestTimer}
          aria-label={paused ? 'Retomar descanso' : 'Pausar descanso'}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left active:opacity-70"
        >
          <span
            className={cx(
              'grid size-9 shrink-0 place-items-center rounded-full',
              paused
                ? 'bg-warmup-soft text-warmup'
                : 'bg-brand-soft text-brand-ink',
            )}
          >
            {paused ? (
              <Play size={16} aria-hidden="true" />
            ) : (
              <Pause size={16} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="text-headline block font-semibold tabular">
              {formatClock(remainingSeconds)}
            </span>
            <span className="text-caption block truncate text-ink-2">
              {paused ? 'Pausado' : 'Descanso'}
              {timer.label ? ` · ${timer.label}` : ''}
            </span>
          </span>
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => actions.addRestTime(-15)}
          aria-label="Menos 15 segundos"
        >
          −15
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => actions.addRestTime(15)}
          aria-label="Mais 15 segundos"
        >
          +15
        </Button>
        <Button variant="tinted" size="sm" onClick={actions.stopRestTimer}>
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
