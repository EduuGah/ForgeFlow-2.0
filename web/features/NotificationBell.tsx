import { Bell } from 'lucide-react';
import { useNavigation } from '../navigation/Navigator';
import { IconButton } from '../ui/Button';
import { unreadNotifications, useNotificationFeed } from './notificationFeed';

/** Header bell with the number of unread notifications. */
export function NotificationBell() {
  const { push } = useNavigation();
  const unread = unreadNotifications(useNotificationFeed());
  return (
    <span className="relative">
      <IconButton
        icon={Bell}
        label={unread > 0 ? `Notificações: ${unread} novas` : 'Notificações'}
        onClick={() => push({ name: 'notifications' })}
      />
      {unread > 0 && (
        <span
          className="text-micro pointer-events-none absolute top-1.5 right-1.5 grid min-w-4.5 place-items-center rounded-full bg-brand px-1 font-bold text-on-brand tabular"
          aria-hidden="true"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </span>
  );
}
