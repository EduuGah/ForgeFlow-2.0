import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { formatClock, formatRelativeDay, formatTime } from '../lib/format';
import { summarizeActiveWorkout } from '../lib/training';
import { NAV_HEIGHT } from '../navigation/BottomNav';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton, Spinner } from '../ui/Button';
import { InlineNotice } from '../ui/Feedback';
import { Sheet, useConfirm, useToast } from '../ui/Overlay';
import { cx, useNow } from '../ui/core';
import { useRestCountdown } from './RestTimer';

export const MINI_PLAYER_HEIGHT = 64;

/** Pinned above the tab bar while a workout is minimized. */
export function MiniPlayer() {
  const { activeWorkout } = useAppStore();
  const { workoutOpen, openWorkout } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const rest = useRestCountdown();
  const now = useNow(1000, Boolean(activeWorkout) && !workoutOpen);

  if (!activeWorkout || workoutOpen) return null;
  const summary = summarizeActiveWorkout(activeWorkout);
  const elapsed = Math.floor(
    (now - new Date(activeWorkout.startedAt).getTime()) / 1000,
  );

  const discard = async () => {
    const ok = await confirm({
      title: 'Descartar treino?',
      message: 'As séries registradas neste treino serão perdidas.',
      confirmLabel: 'Descartar treino',
      cancelLabel: 'Continuar treinando',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.discardActiveWorkout();
    toast({ title: 'Treino descartado' });
  };

  return (
    <div
      className="fixed inset-x-0 z-40 animate-rise px-2"
      style={{
        bottom: `calc(${NAV_HEIGHT + 6}px + env(safe-area-inset-bottom))`,
      }}
    >
      <div
        className="app-column flex items-center gap-2 rounded-lg border border-line-strong bg-raised/95 py-2 pr-2 pl-3 shadow-pop backdrop-blur-md"
        style={{ minHeight: MINI_PLAYER_HEIGHT - 8 }}
      >
        <button
          type="button"
          onClick={openWorkout}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-label={`Retomar treino ${activeWorkout.name}`}
        >
          <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inset-0 animate-pulse-dot rounded-full bg-success-ink" />
          </span>
          <span className="min-w-0">
            <span className="text-callout block truncate font-semibold">
              {activeWorkout.name}
            </span>
            <span className="text-caption block truncate text-ink-2 tabular">
              {formatClock(Math.max(0, elapsed))} · {summary.completedSets}/
              {summary.totalSets} séries
              {rest.active && (
                <span className="text-brand-ink">
                  {' '}
                  · descanso {formatClock(rest.remainingSeconds)}
                </span>
              )}
            </span>
          </span>
        </button>
        <Button size="sm" onClick={openWorkout}>
          Retomar
        </Button>
        <IconButton
          icon={Trash2}
          label="Descartar treino"
          variant="danger"
          size="sm"
          onClick={discard}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sync status                                                         */
/* ------------------------------------------------------------------ */

export function SyncButton() {
  const { currentUser, syncStatus, isOnline } = useAppStore();
  const [open, setOpen] = useState(false);

  const icon = !currentUser
    ? HardDrive
    : !isOnline
      ? CloudOff
      : syncStatus === 'error'
        ? CloudOff
        : Cloud;
  const label = !currentUser
    ? 'Dados salvos neste aparelho'
    : !isOnline
      ? 'Offline'
      : syncStatus === 'syncing'
        ? 'Sincronizando'
        : syncStatus === 'error'
          ? 'Falha na sincronização'
          : 'Sincronizado';

  return (
    <>
      {syncStatus === 'syncing' ? (
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={() => setOpen(true)}
          className="grid size-11 place-items-center rounded-full text-brand-ink active:bg-raised"
        >
          <Spinner size={20} />
        </button>
      ) : (
        <IconButton
          icon={icon}
          label={label}
          onClick={() => setOpen(true)}
          className={cx(
            (syncStatus === 'error' || (!isOnline && currentUser)) &&
              'text-warmup',
          )}
        />
      )}
      <SyncSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SyncSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, syncStatus, isOnline, lastSyncedAt } = useAppStore();
  const last = lastSyncedAt
    ? `${formatRelativeDay(lastSyncedAt)}, às ${formatTime(lastSyncedAt)}`
    : 'ainda não sincronizado';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={currentUser ? 'Sincronização' : 'Modo local'}
    >
      <div className="space-y-4">
        {!currentUser ? (
          <p className="text-body text-ink-2">
            Seus treinos estão salvos apenas neste aparelho. Entre com Google em
            Perfil › Configurações para guardar tudo na nuvem e acessar de
            outros dispositivos.
          </p>
        ) : (
          <>
            <p className="text-body text-ink-2">
              Conectado como{' '}
              <span className="text-ink">{currentUser.email}</span>. Tudo é
              salvo primeiro neste aparelho e enviado para a nuvem em segundo
              plano.
            </p>
            {!isOnline && (
              <InlineNotice tone="offline">
                Você está offline. Continue treinando normalmente: as alterações
                serão enviadas quando a conexão voltar.
              </InlineNotice>
            )}
            {syncStatus === 'error' && isOnline && (
              <InlineNotice tone="warning">
                A última sincronização falhou. Seus dados continuam salvos neste
                aparelho.
              </InlineNotice>
            )}
            <p className="text-footnote text-ink-3">
              Última sincronização: {last}
            </p>
            <Button
              variant="secondary"
              block
              icon={RefreshCw}
              loading={syncStatus === 'syncing'}
              disabled={!isOnline}
              onClick={actions.retrySync}
            >
              Sincronizar agora
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Slim notice shown under tab headers while offline. */
export function OfflineNotice() {
  const { isOnline } = useAppStore();
  if (isOnline) return null;
  return (
    <InlineNotice tone="offline" className="animate-rise">
      Sem conexão. Tudo continua funcionando e fica salvo neste aparelho.
    </InlineNotice>
  );
}

/** Announces a failed cloud sync once, instead of failing silently. */
export function SyncWatcher() {
  const { syncStatus, isOnline, currentUser } = useAppStore();
  const toast = useToast();
  const announced = useRef(false);

  useEffect(() => {
    if (syncStatus !== 'error') {
      announced.current = false;
      return;
    }
    if (announced.current || !isOnline || !currentUser) return;
    announced.current = true;
    toast({
      tone: 'error',
      title: 'Não foi possível sincronizar',
      description: 'Seus dados estão salvos neste aparelho.',
      action: { label: 'Tentar de novo', onPress: actions.retrySync },
    });
  }, [syncStatus, isOnline, currentUser, toast]);

  return null;
}
