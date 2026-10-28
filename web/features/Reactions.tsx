import { useCallback, useEffect, useState } from 'react';
import { useStoreValue } from '../store';
import {
  REACTIONS,
  reactionCounts,
  reactionKey,
  type ReactionEmoji,
  type WorkoutReaction,
} from '../lib/friends';
import { haptic } from '../lib/haptics';
import { fetchReactions, removeReaction, setReaction } from '../social';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { pushToFriend } from './pushRegistration';
import { friendById } from './useFriends';

/**
 * Reactions to a set of workouts (`ownerId/workoutId` pairs), and reacting
 * to a friend's: the same emoji again takes it back.
 */
export function useReactions(
  targets: { ownerId: string; workoutId: string }[],
) {
  const me = useStoreValue((state) => state.currentUser?.uid ?? null);
  const toast = useToast();
  const [reactions, setReactions] = useState<WorkoutReaction[]>([]);
  const owners = [...new Set(targets.map((target) => target.ownerId))]
    .sort()
    .join(',');
  const workouts = [...new Set(targets.map((target) => target.workoutId))]
    .sort()
    .join(',');

  useEffect(() => {
    if (!me || !owners || !workouts || !navigator.onLine) return;
    let alive = true;
    fetchReactions(owners.split(','), workouts.split(','))
      .then((found) => alive && setReactions(found))
      .catch((error: unknown) => console.warn('ForgeFlow reações:', error));
    return () => {
      alive = false;
    };
  }, [me, owners, workouts]);

  const of = useCallback(
    (ownerId: string, workoutId: string) =>
      reactions.filter(
        (reaction) =>
          reactionKey(reaction.ownerId, reaction.workoutId) ===
          reactionKey(ownerId, workoutId),
      ),
    [reactions],
  );

  const react = useCallback(
    async (ownerId: string, workoutId: string, emoji: ReactionEmoji) => {
      if (!me) return;
      const mine = (reaction: WorkoutReaction) =>
        reaction.ownerId === ownerId &&
        reaction.workoutId === workoutId &&
        reaction.userId === me;
      const before = reactions;
      const current = before.find(mine);
      const removing = current?.emoji === emoji;
      haptic('tap');
      setReactions([
        ...before.filter((reaction) => !mine(reaction)),
        ...(removing
          ? []
          : [
              {
                id: current?.id ?? -1,
                ownerId,
                workoutId,
                userId: me,
                emoji,
                createdAt: new Date().toISOString(),
              },
            ]),
      ]);
      try {
        if (removing) {
          await removeReaction(me, ownerId, workoutId);
          return;
        }
        const saved = await setReaction(me, ownerId, workoutId, emoji);
        if (saved.created) pushToFriend({ type: 'reaction', id: saved.id });
        setReactions((list) =>
          list.map((reaction) =>
            mine(reaction) ? { ...reaction, id: saved.id } : reaction,
          ),
        );
      } catch (error) {
        console.warn('ForgeFlow reações:', error);
        setReactions(before);
        toast({
          tone: 'error',
          title: navigator.onLine
            ? 'Não foi possível reagir'
            : 'Sem conexão para reagir',
        });
      }
    },
    [me, reactions, toast],
  );

  return { of, react, me };
}

/**
 * The four emojis under a friend's workout, with counts; the person's own
 * pick stands out.
 */
export function ReactionBar({
  reactions,
  me,
  onReact,
  className,
}: {
  reactions: WorkoutReaction[];
  me: string | null;
  onReact: (emoji: ReactionEmoji) => void;
  className?: string;
}) {
  const mine = reactions.find((reaction) => reaction.userId === me)?.emoji;
  return (
    <div
      role="group"
      aria-label="Reagir ao treino"
      className={cx('flex flex-wrap gap-1.5', className)}
    >
      {REACTIONS.map((emoji) => {
        const count = reactions.filter(
          (reaction) => reaction.emoji === emoji,
        ).length;
        const picked = mine === emoji;
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={picked}
            aria-label={`Reagir com ${emoji}${count ? ` (${count})` : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onReact(emoji);
            }}
            className={cx(
              'pressable text-callout flex h-8 min-w-11 items-center justify-center gap-1 rounded-full border px-2.5 tabular',
              picked
                ? 'border-brand bg-brand-soft text-brand-ink'
                : 'border-line bg-raised text-ink-2',
            )}
          >
            <span
              key={picked ? 'picked' : 'idle'}
              aria-hidden="true"
              className={cx('inline-block', picked && 'animate-pop')}
            >
              {emoji}
            </span>
            {count > 0 && <span className="text-footnote">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Reactions received on the person's own workout: who sent which. */
export function ReceivedReactions({
  reactions,
}: {
  reactions: WorkoutReaction[];
}) {
  if (reactions.length === 0) return null;
  const names = reactions.map((reaction) => {
    const friend = friendById(reaction.userId);
    return {
      id: reaction.userId,
      emoji: reaction.emoji,
      name: friend ? friend.name || `@${friend.username}` : 'Um amigo',
    };
  });
  return (
    <div className="space-y-2">
      <p className="text-callout flex flex-wrap gap-1.5">
        {reactionCounts(reactions).map(({ emoji, count }) => (
          <span
            key={emoji}
            className="flex h-8 items-center gap-1 rounded-full border border-line bg-raised px-2.5 tabular"
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="text-footnote text-ink-2">{count}</span>
          </span>
        ))}
      </p>
      <p className="text-footnote text-ink-2">
        {names.map((item) => `${item.emoji} ${item.name}`).join(' · ')}
      </p>
    </div>
  );
}
