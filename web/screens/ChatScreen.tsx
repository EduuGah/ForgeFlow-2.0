import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { useAppStore } from '../store';
import { formatShortDate, formatTime } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import { DOCK_GAP, NAV_HEIGHT } from '../navigation/BottomNav';
import {
  listConversation,
  markConversationRead,
  sendMessage,
  type ChatMessage,
} from '../social';
import {
  onIncomingMessage,
  refreshFriendsIfStale,
  setOpenChat,
  useFriends,
} from '../features/useFriends';
import { IconButton } from '../ui/Button';
import { Avatar, EmptyState, InlineNotice, Skeleton } from '../ui/Feedback';
import { StackHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { socialErrorMessage } from './SocialScreen';

/** Catches up even when Realtime is off for the project. */
const POLL_MS = 15_000;
const MAX_LENGTH = 1000;

/** A message still on its way: shown faded until the server answers. */
interface Draft extends ChatMessage {
  pending?: boolean;
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ChatScreen({ userId }: { userId: string }) {
  const { currentUser, isOnline } = useAppStore();
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
  const bottomRef = useRef<HTMLDivElement>(null);

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
      setOpenChat(null);
    };
  }, [me, userId]);

  const count = messages?.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

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
      <div className="app-column flex min-h-[60dvh] flex-col px-4 pt-4">
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

        {messages === null && !failed ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/5" />
          </div>
        ) : messages && messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Comece a conversa"
            message={
              friend
                ? `Mande um oi para ${friend.name || `@${friend.username}`}.`
                : undefined
            }
          />
        ) : (
          <ol className="flex flex-col gap-1.5 pb-4" aria-live="polite">
            {(messages ?? []).map((message, index) => {
              const mine = message.senderId === me;
              const previous = messages?.[index - 1];
              const newDay =
                !previous || !sameDay(previous.createdAt, message.createdAt);
              return (
                <li key={message.id} className="flex flex-col">
                  {newDay && (
                    <span className="text-caption my-2 self-center rounded-full bg-raised px-2.5 py-0.5 text-ink-2">
                      {formatShortDate(message.createdAt)}
                    </span>
                  )}
                  <div
                    className={cx(
                      'flex max-w-[80%] items-end gap-2',
                      mine ? 'self-end' : 'self-start',
                    )}
                  >
                    {!mine && friend && (
                      <Avatar
                        name={friend.name || friend.username}
                        photoUrl={friend.photoUrl}
                        size={26}
                      />
                    )}
                    <div
                      className={cx(
                        'rounded-2xl px-3.5 py-2',
                        mine
                          ? 'rounded-br-md bg-brand text-on-brand'
                          : 'rounded-bl-md bg-surface',
                        message.pending && 'opacity-60',
                      )}
                    >
                      <p className="text-body break-words whitespace-pre-wrap">
                        {message.body}
                      </p>
                      <p
                        className={cx(
                          'text-micro mt-0.5 text-right',
                          mine ? 'text-on-brand/75' : 'text-ink-3',
                        )}
                      >
                        {message.pending
                          ? 'enviando…'
                          : formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />

        <form
          className="sticky mt-auto flex items-end gap-2 bg-canvas pt-2 pb-2"
          style={{
            bottom: `calc(${NAV_HEIGHT + DOCK_GAP + 12}px + env(safe-area-inset-bottom))`,
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
