import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, HardDrive, RefreshCw } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { formatRelativeDay, formatTime } from '../lib/format';
import { Button, IconButton, Spinner } from '../ui/Button';
import { InlineNotice } from '../ui/Feedback';
import { Sheet, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

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

/** Inline status pill (profile card); opens the same sync details sheet. */
export function SyncBadge({ className }: { className?: string }) {
  const { syncStatus, isOnline } = useAppStore();
  const [open, setOpen] = useState(false);
  const problem = !isOnline || syncStatus === 'error';
  const label = !isOnline
    ? 'Offline'
    : syncStatus === 'syncing'
      ? 'Sincronizando…'
      : syncStatus === 'error'
        ? 'Falha ao sincronizar'
        : 'Sincronizado';
  const Icon = problem ? CloudOff : Cloud;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          'text-caption inline-flex h-6 items-center gap-1.5 rounded-sm px-2 font-semibold',
          problem ? 'bg-raised text-warmup' : 'bg-raised text-ink-2',
          className,
        )}
      >
        {syncStatus === 'syncing' ? (
          <Spinner size={12} />
        ) : (
          <Icon size={13} aria-hidden="true" />
        )}
        {label}
      </button>
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
            Seus treinos estão salvos apenas neste aparelho. Entre com o Google
            na aba Perfil para guardar tudo na nuvem e acessar de outros
            dispositivos.
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
