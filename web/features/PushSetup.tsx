import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useAppStore } from '../store';
import {
  askNotificationPermission,
  notificationPermission,
  type NotifyPermission,
} from '../lib/notify';
import { detectBrowser, isInstalled } from '../lib/install';
import { Button } from '../ui/Button';
import { InlineNotice } from '../ui/Feedback';
import { useToast } from '../ui/Overlay';
import { registerPush } from './pushRegistration';

/**
 * Turns phone notifications on: asks the browser, then registers this device
 * for notifications with the app closed (when signed in).
 */
export function PushSetup({ className }: { className?: string }) {
  const { currentUser } = useAppStore();
  const toast = useToast();
  const [permission, setPermission] = useState<NotifyPermission>(
    notificationPermission,
  );
  const [busy, setBusy] = useState(false);
  const iosBrowser =
    detectBrowser(navigator.userAgent) === 'ios' && !isInstalled();

  if (permission === 'granted') return null;

  if (permission === 'unsupported' || iosBrowser)
    return (
      <InlineNotice tone="info" className={className}>
        {iosBrowser
          ? 'No iPhone, instale o app (Compartilhar › Adicionar à Tela de Início) e ative as notificações por ele.'
          : 'Este navegador não mostra notificações. No celular, use o app instalado pelo Chrome, Opera ou Samsung Internet.'}
      </InlineNotice>
    );

  if (permission === 'denied')
    return (
      <InlineNotice tone="warning" className={className}>
        As notificações estão bloqueadas para o ForgeFlow. Libere nas
        configurações do site no navegador (ícone de cadeado › Notificações) e
        volte aqui.
      </InlineNotice>
    );

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-brand bg-surface p-3 ${className ?? ''}`}
    >
      <BellRing size={22} className="shrink-0 text-brand-ink" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="text-callout block font-semibold">
          Notificações no celular
        </span>
        <span className="text-footnote block text-ink-2">
          Mensagens, pedidos de amizade, fim do descanso e o treino em
          andamento.
        </span>
      </span>
      <Button
        size="sm"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          const result = await askNotificationPermission();
          setPermission(result);
          if (result === 'granted') {
            const pushed = currentUser ? await registerPush() : false;
            toast({
              tone: 'success',
              title: 'Notificações ativadas',
              description: pushed
                ? 'Chegam também com o app fechado.'
                : 'Chegam enquanto o app estiver aberto ou em segundo plano.',
            });
          }
          setBusy(false);
        }}
      >
        Ativar
      </Button>
    </div>
  );
}
