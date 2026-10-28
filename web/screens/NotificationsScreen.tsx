import { useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Flame,
  FolderInput,
  MessageCircle,
  Target,
  Trophy,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { formatRelativeDay, formatTime } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import {
  clearFeed,
  markAllRead,
  useNotificationFeed,
  type FeedKind,
} from '../features/notificationFeed';
import { PushSetup } from '../features/PushSetup';
import { useOpenLink } from '../features/useOpenLink';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { StackHeader } from '../ui/Layout';
import { cx } from '../ui/core';

const ICONS: Record<FeedKind, LucideIcon> = {
  message: MessageCircle,
  request: UserPlus,
  friend: UserCheck,
  share: FolderInput,
  record: Trophy,
  goal: Target,
  reaction: Flame,
};

export function NotificationsScreen() {
  const { pop } = useNavigation();
  const items = useNotificationFeed();
  const open = useOpenLink();
  // What was new when the screen opened stays highlighted until it closes.
  const unreadIds = new Set(
    items.filter((item) => !item.read).map((item) => item.id),
  );

  useEffect(() => () => markAllRead(), []);

  return (
    <>
      <StackHeader
        title="Notificações"
        onBack={pop}
        right={
          items.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              icon={CheckCheck}
              onClick={clearFeed}
            >
              Limpar
            </Button>
          ) : undefined
        }
      />
      <div className="app-column px-4 pt-4 pb-6">
        <PushSetup className="mb-4" />
        {items.length === 0 ? (
          <EmptyState
            art="bell"
            title="Nada novo por aqui"
            message="Pedidos de amizade, mensagens, rotinas recebidas e recordes aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {items.map((item) => {
              const Icon = ICONS[item.kind] ?? Bell;
              const fresh = unreadIds.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!item.link}
                    onClick={() => item.link && open(item.link)}
                    className={cx(
                      'pressable flex w-full items-start gap-3 px-4 py-3 text-left',
                      fresh && 'bg-brand-soft',
                    )}
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-raised text-brand-ink">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-callout block font-semibold">
                        {item.title}
                      </span>
                      <span className="text-footnote line-clamp-2 block text-ink-2">
                        {item.body}
                      </span>
                      <span className="text-caption mt-0.5 block text-ink-3">
                        {formatRelativeDay(item.createdAt)},{' '}
                        {formatTime(item.createdAt)}
                      </span>
                    </span>
                    {fresh && (
                      <span
                        className="mt-2 size-2 shrink-0 rounded-full bg-brand"
                        aria-label="Nova"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
