import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { formatRelativeDay, formatTime } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import { listConversations, type ConversationSummary } from '../social';
import {
  onIncomingMessage,
  refreshFriends,
  useFriends,
} from '../features/useFriends';
import { GoogleButton, useGoogleSignIn } from '../features/GoogleSignIn';
import { Button } from '../ui/Button';
import { Avatar, EmptyState, InlineNotice, Skeleton } from '../ui/Feedback';
import { GroupLabel, StackHeader } from '../ui/Layout';
import { cx } from '../ui/core';
import { socialErrorMessage } from './SocialScreen';

/** "11:41" today, "ontem", "há 3 dias"… */
function when(iso: string): string {
  const day = formatRelativeDay(iso);
  return day === 'hoje' ? formatTime(iso) : day;
}

/** All conversations in one place, newest first, then friends to talk to. */
export function MessagesScreen() {
  const { currentUser, isOnline } = useAppStore();
  const { pop, push } = useNavigation();
  const friends = useFriends();
  const { signIn, signingIn } = useGoogleSignIn();
  const [conversations, setConversations] = useState<
    ConversationSummary[] | null
  >(null);
  const [failed, setFailed] = useState<string | null>(null);
  const me = currentUser?.uid ?? null;

  useEffect(() => {
    if (!me || !isOnline) return;
    let alive = true;
    void refreshFriends();
    const load = () =>
      listConversations(me)
        .then((found) => {
          if (!alive) return;
          setConversations(found);
          setFailed(null);
        })
        .catch(
          (error: unknown) => alive && setFailed(socialErrorMessage(error)),
        );
    void load();
    const stop = onIncomingMessage(() => void load());
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [me, isOnline]);

  const profiles = new Map(
    friends.lists.friends.map((link) => [link.other.userId, link.other]),
  );
  const talking = (conversations ?? []).filter((item) =>
    profiles.has(item.friendId),
  );
  const talked = new Set(talking.map((item) => item.friendId));
  const others = friends.lists.friends.filter(
    (link) => !talked.has(link.other.userId),
  );

  return (
    <>
      <StackHeader title="Mensagens" onBack={pop} />
      <div className="app-column pb-6">
        {!currentUser ? (
          <EmptyState
            art="chat"
            title="Converse com seus amigos"
            message="Entre com a conta Google para trocar mensagens."
            action={<GoogleButton onClick={signIn} loading={signingIn} />}
          />
        ) : (
          <>
            {!isOnline && (
              <div className="px-4 pt-4">
                <InlineNotice tone="offline">
                  Sem conexão. Mensagens precisam de internet.
                </InlineNotice>
              </div>
            )}
            {failed && (
              <div className="px-4 pt-4">
                <InlineNotice tone="error">{failed}</InlineNotice>
              </div>
            )}

            {conversations === null && !failed && isOnline ? (
              <div className="space-y-3 px-4 pt-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : friends.status === 'ready' &&
              friends.lists.friends.length === 0 ? (
              <EmptyState
                art="friends"
                title="Nenhum amigo ainda"
                message="Adicione amigos para conversar com eles."
                action={
                  <Button onClick={() => push({ name: 'social' })}>
                    Adicionar amigos
                  </Button>
                }
              />
            ) : (
              <>
                {talking.length > 0 && (
                  <ul className="mt-2 divide-y divide-line bg-surface">
                    {talking.map((item) => {
                      const friend = profiles.get(item.friendId)!;
                      const name = friend.name || `@${friend.username}`;
                      const mine = item.last.senderId === me;
                      return (
                        <li key={item.friendId}>
                          <button
                            type="button"
                            onClick={() =>
                              push({ name: 'chat', userId: item.friendId })
                            }
                            className="pressable flex w-full items-center gap-3 px-4 py-3 text-left"
                          >
                            <Avatar
                              name={name}
                              photoUrl={friend.photoUrl}
                              size={48}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="text-body truncate font-semibold">
                                  {name}
                                </span>
                                <span
                                  className={cx(
                                    'text-caption shrink-0',
                                    item.unread > 0
                                      ? 'font-semibold text-brand-ink'
                                      : 'text-ink-3',
                                  )}
                                >
                                  {when(item.last.createdAt)}
                                </span>
                              </span>
                              <span className="mt-0.5 flex items-center gap-2">
                                <span
                                  className={cx(
                                    'text-footnote min-w-0 flex-1 truncate',
                                    item.unread > 0
                                      ? 'font-medium text-ink'
                                      : 'text-ink-2',
                                  )}
                                >
                                  {mine && 'Você: '}
                                  {item.last.body}
                                </span>
                                {item.unread > 0 && (
                                  <span className="text-caption grid min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 font-bold text-on-brand tabular">
                                    {item.unread > 9 ? '9+' : item.unread}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {others.length > 0 && (
                  <>
                    <GroupLabel>Começar conversa</GroupLabel>
                    <ul className="divide-y divide-line bg-surface">
                      {others.map((link) => (
                        <li key={link.id}>
                          <button
                            type="button"
                            onClick={() =>
                              push({
                                name: 'chat',
                                userId: link.other.userId,
                              })
                            }
                            className="pressable flex w-full items-center gap-3 px-4 py-3 text-left"
                          >
                            <Avatar
                              name={link.other.name || link.other.username}
                              photoUrl={link.other.photoUrl}
                              size={40}
                            />
                            <span className="text-body min-w-0 flex-1 truncate">
                              {link.other.name || `@${link.other.username}`}
                            </span>
                            <MessageCircle
                              size={18}
                              className="shrink-0 text-ink-3"
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
