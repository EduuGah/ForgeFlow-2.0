import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { useStoreValue } from '../store';
import { formatRelativeDay, formatTime } from '../lib/format';
import { reactionKey } from '../lib/friends';
import {
  addComment,
  deleteComment,
  fetchComments,
  type WorkoutComment,
} from '../social';
import { IconButton } from '../ui/Button';
import { Avatar } from '../ui/Feedback';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { pushToFriend } from './pushRegistration';
import { friendById, useFriends } from './useFriends';

/** Comments of a set of workouts (`ownerId/workoutId`), and writing them. */
export function useComments(targets: { ownerId: string; workoutId: string }[]) {
  const me = useStoreValue((state) => state.currentUser?.uid ?? null);
  const toast = useToast();
  const [comments, setComments] = useState<WorkoutComment[]>([]);
  const owners = [...new Set(targets.map((target) => target.ownerId))]
    .sort()
    .join(',');
  const workouts = [...new Set(targets.map((target) => target.workoutId))]
    .sort()
    .join(',');

  useEffect(() => {
    if (!me || !owners || !workouts || !navigator.onLine) return;
    let alive = true;
    fetchComments(owners.split(','), workouts.split(','))
      .then((found) => alive && setComments(found))
      .catch((error: unknown) => console.warn('ForgeFlow comentários:', error));
    return () => {
      alive = false;
    };
  }, [me, owners, workouts]);

  const of = useCallback(
    (ownerId: string, workoutId: string) =>
      comments.filter(
        (comment) =>
          reactionKey(comment.ownerId, comment.workoutId) ===
          reactionKey(ownerId, workoutId),
      ),
    [comments],
  );

  const add = useCallback(
    async (ownerId: string, workoutId: string, body: string) => {
      if (!me || !body.trim()) return false;
      try {
        const saved = await addComment(me, ownerId, workoutId, body);
        setComments((list) => [...list, saved]);
        if (ownerId !== me) pushToFriend({ type: 'comment', id: saved.id });
        return true;
      } catch (error) {
        console.warn('ForgeFlow comentários:', error);
        toast({
          tone: 'error',
          title: navigator.onLine
            ? 'Não foi possível comentar'
            : 'Sem conexão para comentar',
        });
        return false;
      }
    },
    [me, toast],
  );

  const remove = useCallback(
    async (comment: WorkoutComment) => {
      setComments((list) => list.filter((item) => item.id !== comment.id));
      try {
        await deleteComment(comment.id);
      } catch {
        setComments((list) => [...list, comment]);
        toast({ tone: 'error', title: 'Não foi possível apagar' });
      }
    },
    [toast],
  );

  return { of, add, remove, me };
}

/**
 * A workout's comments: a compact count that opens into the thread and a
 * box to write. The workout's owner and the author can delete a comment.
 */
export function CommentsThread({
  comments,
  me,
  ownerId,
  onAdd,
  onRemove,
  startOpen = false,
  className,
}: {
  comments: WorkoutComment[];
  me: string | null;
  ownerId: string;
  onAdd: (body: string) => Promise<boolean>;
  onRemove: (comment: WorkoutComment) => void;
  startOpen?: boolean;
  className?: string;
}) {
  const friends = useFriends();
  const [open, setOpen] = useState(startOpen);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const who = (userId: string) => {
    if (userId === me)
      return { name: 'Você', photoUrl: friends.me?.photoUrl ?? null };
    const friend = friendById(userId);
    return {
      name: friend ? friend.name || `@${friend.username}` : 'Amigo',
      photoUrl: friend?.photoUrl ?? null,
    };
  };

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    if (await onAdd(draft)) setDraft('');
    setSending(false);
  };

  return (
    <div className={className}>
      {!open ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className="text-footnote flex h-8 items-center gap-1.5 font-semibold text-ink-2"
        >
          <MessageCircle size={15} aria-hidden="true" />
          {comments.length === 0
            ? 'Comentar'
            : `${comments.length} ${comments.length === 1 ? 'comentário' : 'comentários'}`}
        </button>
      ) : (
        <div
          className="space-y-2.5"
          onClick={(event) => event.stopPropagation()}
        >
          {comments.length > 0 && (
            <ul className="space-y-2.5">
              {comments.map((comment) => {
                const author = who(comment.userId);
                const canDelete = me === comment.userId || me === ownerId;
                return (
                  <li key={comment.id} className="flex items-start gap-2">
                    <Avatar
                      name={author.name}
                      photoUrl={author.photoUrl}
                      size={28}
                    />
                    <div className="min-w-0 flex-1 rounded-lg bg-raised px-3 py-2">
                      <p className="text-caption text-ink-2">
                        <span className="font-semibold text-ink">
                          {author.name}
                        </span>{' '}
                        · {formatRelativeDay(comment.createdAt)},{' '}
                        {formatTime(comment.createdAt)}
                      </p>
                      <p className="text-callout break-words whitespace-pre-line">
                        {comment.body}
                      </p>
                    </div>
                    {canDelete && (
                      <IconButton
                        icon={Trash2}
                        label="Apagar comentário"
                        size="sm"
                        onClick={() => onRemove(comment)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {me && (
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">Escrever comentário</span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={300}
                  rows={1}
                  placeholder="Escreva um comentário…"
                  className="text-callout w-full resize-none rounded-lg bg-raised px-3 py-2 [field-sizing:content] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink"
                />
              </label>
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Enviar comentário"
                className={cx(
                  'pressable grid size-10 shrink-0 place-items-center rounded-full',
                  draft.trim()
                    ? 'bg-brand text-on-brand'
                    : 'bg-raised text-ink-3',
                )}
              >
                <Send size={17} aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
