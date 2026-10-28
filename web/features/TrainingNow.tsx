import { useEffect, useState } from 'react';
import { liveLabel, type LiveWorkout } from '../lib/friends';
import { useNavigation } from '../navigation/Navigator';
import { Avatar, ProgressBar } from '../ui/Feedback';
import { cx } from '../ui/core';
import { useFriends } from './useFriends';
import { useLiveFriends } from './liveWorkouts';

/** The green "live" dot. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block size-2 shrink-0 animate-pulse-dot rounded-full bg-success',
        className,
      )}
    />
  );
}

/** Re-renders every minute so "34 min" keeps counting. */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** "Treinando agora · Upper B · 5/12 séries · 34 min". */
export function LiveLine({ live }: { live: LiveWorkout }) {
  const now = useMinuteClock();
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-success-ink">
      <LiveDot />
      <span className="truncate">Treinando agora · {liveLabel(live, now)}</span>
    </span>
  );
}

/** Friends with a workout in progress; nothing when nobody is training. */
export function FriendsTrainingNow({ className }: { className?: string }) {
  const { push } = useNavigation();
  const friends = useFriends();
  const live = useLiveFriends();
  const now = useMinuteClock();
  const people = friends.lists.friends
    .map((link) => ({ person: link.other, live: live.get(link.other.userId) }))
    .filter((item): item is { person: typeof item.person; live: LiveWorkout } =>
      Boolean(item.live),
    );
  if (people.length === 0) return null;

  return (
    <section
      aria-label="Amigos treinando agora"
      className={cx(
        'overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <h2 className="text-micro flex items-center gap-2 px-4 pt-3 font-semibold tracking-wider text-ink-3 uppercase">
        <LiveDot /> Treinando agora
      </h2>
      <ul className="divide-y divide-line">
        {people.map(({ person, live: workout }) => {
          const name = person.name || `@${person.username}`;
          return (
            <li key={person.userId}>
              <button
                type="button"
                onClick={() => push({ name: 'friend', userId: person.userId })}
                className="pressable flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <Avatar name={name} photoUrl={person.photoUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="text-body block truncate font-medium">
                    {name}
                  </span>
                  <span className="text-footnote block truncate text-ink-2">
                    {liveLabel(workout, now)}
                    {workout.currentExercise && ` · ${workout.currentExercise}`}
                  </span>
                  {workout.totalSets > 0 && (
                    <ProgressBar
                      value={(workout.doneSets / workout.totalSets) * 100}
                      tone="success"
                      thickness="sm"
                      className="mt-1.5"
                      label={`${workout.doneSets} de ${workout.totalSets} séries`}
                    />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
