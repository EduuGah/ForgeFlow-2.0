import { useEffect, useState } from 'react';
import { Check, CheckCheck, MessageCircle, Send } from 'lucide-react';
import { useAppStore, useProfilePhoto } from '../store';
import { formatShortDate, formatTime } from '../lib/format';
import { useNavigation, useScreen } from '../navigation/Navigator';
import { DOCK_GAP, NAV_HEIGHT } from '../navigation/BottomNav';
import {
  listConversation,
  markConversationRead,
  sendMessage,
  subscribeToReadReceipts,
  type ChatMessage,
} from '../social';
import {
  onIncomingMessage,
  refreshFriendsIfStale,
  setOpenChat,
  useFriends,
} from '../features/useFriends';
import { pushToFriend } from '../features/pushRegistration';
import { IconButton } from '../ui/Button';
import { Avatar, EmptyState, InlineNotice, Skeleton } from '../ui/Feedback';
import { StackHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { socialErrorMessage } from './SocialScreen';

/** Catches up even when Realtime is off for the project. */
const POLL_MS = 15_000;
const MAX_LENGTH = 1000;
/** The room the screen leaves for the floating dock (App's BOTTOM_INSET). */
const DOCK_SPACE = `calc(${NAV_HEIGHT + DOCK_GAP + 24}px + env(safe-area-inset-bottom))`;

/** ✓ sent, ✓✓ seen by the other person. */
function ReadMark({ read }: { read: boolean }) {
  const Icon = read ? CheckCheck : Check;
  return (
    <Icon
      size={14}
      strokeWidth={2.4}
      className={read ? 'text-on-brand' : 'text-on-brand/60'}
      aria-label={read ? 'Vista' : 'Enviada'}
    />
  );
}

/** A message still on its way: shown faded until the server answers. */
interface Draft extends ChatMessage {
  pending?: boolean;
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ChatScreen({ userId }: { userId: string }) {
  const { currentUser, isOnline, userProfile } = useAppStore();
  const myPhoto = useProfilePhoto();
  const myName = userProfile.name || 'Você';
  const { scrollRoot } = useScreen();
  const { pop } = useNavigation();
  const toast = useToast();
  const friends = useFriends();
  const link = friends.lists.friends.find(
    (item) => item.other.userId === userId,
  );
  const friend = link?.other;
  const me = currentUser?.uid ?? null;
  const [messages, setMessages] = useState<Draft[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [text, setText] = useState('');

  useEffect(() => refreshFriendsIfStale(), []);

  // Loads the conversation, keeps it current and marks it read while open.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    setOpenChat(userId);
    const load = () =>
      listConversation(me, userId)
        .then((loaded) => {
          if (!alive) return;
          setMessages((current) => [
            ...loaded,
            // Keep messages still being sent (not in the server copy yet).
            ...(current ?? []).filter((item) => item.pending),
          ]);
          setFailed(null);
          void markConversationRead(me, userId).catch(() => undefined);
        })
        .catch((error: unknown) => {
          if (alive) setFailed(socialErrorMessage(error));
        });
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    // The other person opened the conversation: ✓ becomes ✓✓.
    const stopReceipts = subscribeToReadReceipts(me, (read) => {
      if (read.recipientId !== userId) return;
      setMessages(
        (current) =>
          current?.map((item) =>
            item.id === read.id ? { ...item, readAt: read.readAt } : item,
          ) ?? current,
      );
    });
    const stop = onIncomingMessage((message) => {
      if (message.senderId !== userId) return;
      setMessages((current) =>
        current?.some((item) => item.id === message.id)
          ? current
          : [...(current ?? []), message],
      );
      void markConversationRead(me, userId).catch(() => undefined);
    });
    return () => {
      alive = false;
      clearInterval(timer);
      stop();
      stopReceipts();
      setOpenChat(null);
    };
  }, [me, userId]);

  // New messages (and opening the chat) show the end of the conversation.
  const count = messages?.length ?? 0;
  useEffect(() => {
    scrollRoot?.scrollTo({ top: scrollRoot.scrollHeight });
  }, [count, scrollRoot]);

  const send = async () => {
    const body = text.trim();
    if (!me || !body) return;
    const draft: Draft = {
      id: -Date.now(),
      senderId: me,
      recipientId: userId,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
      pending: true,
    };
    setText('');
    setMessages((current) => [...(current ?? []), draft]);
    try {
      const sent = await sendMessage(me, userId, body);
      pushToFriend({ type: 'message', id: sent.id });
      setMessages((current) =>
        (current ?? []).map((item) => (item.id === draft.id ? sent : item)),
      );
    } catch (error) {
      setMessages((current) =>
        (current ?? []).filter((item) => item.id !== draft.id),
      );
      setText(body);
      toast({ tone: 'error', title: socialErrorMessage(error) });
    }
  };

  const title = friend ? friend.name || `@${friend.username}` : 'Conversa';

  return (
    <>
      <StackHeader title={title} onBack={pop} />
      <div className="app-column flex min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col px-4 pt-4">
        {!link && friends.status === 'ready' && (
          <InlineNotice tone="warning" className="mb-3">
            Vocês não são mais amigos: não dá para mandar mensagens.
          </InlineNotice>
        )}
        {failed && (
          <InlineNotice tone="error" className="mb-3">
            {failed}
          </InlineNotice>
        )}

        {/* mt-auto: the conversation grows from the bottom, next to the
            composer, with the empty space above it (like any chat app). */}
        {messages === null && !failed ? (
          <div className="mt-auto space-y-3 pb-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : messages && messages.length === 0 ? (
          <EmptyState
            className="mt-auto"
            icon={MessageCircle}
            title="Comece a conversa"
            message={
              friend
                ? `Mande um oi para ${friend.name || `@${friend.username}`}.`
                : undefined
            }
          />
        ) : (
          <ol className="mt-auto flex flex-col gap-1 pb-3" aria-live="polite">
            {(messages ?? []).map((message, index) => {
              const mine = message.senderId === me;
              const previous = messages?.[index - 1];
              const next = messages?.[index + 1];
              const newDay =
                !previous || !sameDay(previous.createdAt, message.createdAt);
              // One photo per run of messages from the same person.
              const lastOfRun =
                !next ||
                next.senderId !== message.senderId ||
                !sameDay(next.createdAt, message.createdAt);
              return (
                <li
                  key={message.id}
                  className={cx('flex flex-col', lastOfRun && 'mb-1.5')}
                >
                  {newDay && (
                    <span className="text-caption my-2 self-center rounded-full bg-raised px-2.5 py-0.5 text-ink-2">
                      {formatShortDate(message.createdAt)}
                    </span>
                  )}
                  <div
                    className={cx(
                      'flex max-w-[85%] items-end gap-2',
                      mine ? 'flex-row-reverse self-end' : 'self-start',
                    )}
                  >
                    <span className="w-7 shrink-0">
                      {lastOfRun &&
                        (mine ? (
                          <Avatar name={myName} photoUrl={myPhoto} size={28} />
                        ) : (
                          friend && (
                            <Avatar
                              name={friend.name || friend.username}
                              photoUrl={friend.photoUrl}
                              size={28}
                            />
                          )
                        ))}
                    </span>
                    <div
                      className={cx(
                        'relative min-w-0 rounded-2xl px-3 py-1.5',
                        mine ? 'bg-brand text-on-brand' : 'bg-surface',
                        lastOfRun && (mine ? 'rounded-br-md' : 'rounded-bl-md'),
                        message.pending && 'opacity-60',
                      )}
                    >
                      <p className="text-body break-words whitespace-pre-wrap">
                        {message.body}
                        {/* Room on the last line for the time (WhatsApp-style). */}
                        <span
                          className={cx(
                            'inline-block',
                            mine ? 'w-[4.25rem]' : 'w-11',
                          )}
                          aria-hidden="true"
                        />
                      </p>
                      <span
                        className={cx(
                          'text-micro absolute right-2.5 bottom-1 flex items-center gap-0.5 tabular',
                          mine ? 'text-on-brand/70' : 'text-ink-3',
                        )}
                      >
                        {message.pending
                          ? 'enviando'
                          : formatTime(message.createdAt)}
                        {mine && !message.pending && (
                          <ReadMark read={Boolean(message.readAt)} />
                        )}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <form
          // Pinned to the bottom of the screen (the dock hides in a chat).
          // Screens keep room at the bottom for the dock, and sticky counts
          // that room too: the negative margin and offset give it back.
          className="sticky -mx-4 flex items-end gap-2 border-t border-line bg-canvas px-4 pt-2"
          style={{
            bottom: `calc(-1 * ${DOCK_SPACE})`,
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
            marginBottom: `calc(-1 * ${DOCK_SPACE})`,
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            Mensagem
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={text}
            maxLength={MAX_LENGTH}
            disabled={!link || !isOnline}
            placeholder={isOnline ? 'Mensagem' : 'Sem conexão'}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter breaks the line.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            className="text-body max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-brand disabled:opacity-60"
          />
          <IconButton
            icon={Send}
            label="Enviar mensagem"
            type="submit"
            variant="tinted"
            disabled={!text.trim() || !link || !isOnline}
          />
        </form>
      </div>
    </>
  );
}
