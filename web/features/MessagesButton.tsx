import { MessageCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { useNavigation } from '../navigation/Navigator';
import { IconButton } from '../ui/Button';
import { totalUnread, useFriends } from './useFriends';

/** Header shortcut to the conversations, with the unread count. */
export function MessagesButton() {
  const { currentUser } = useAppStore();
  const { push } = useNavigation();
  const unread = totalUnread(useFriends());
  if (!currentUser) return null;
  return (
    <span className="relative">
      <IconButton
        icon={MessageCircle}
        label={unread > 0 ? `Mensagens: ${unread} novas` : 'Mensagens'}
        onClick={() => push({ name: 'messages' })}
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
