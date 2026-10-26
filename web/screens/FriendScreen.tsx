import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, EyeOff, Send, Trophy, UserMinus } from 'lucide-react';
import { addDays, startOfDay } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatRelativeDay,
  formatShortDate,
} from '../lib/format';
import { totalsBetween } from '../lib/training';
import type { CompletedWorkout, PersonalRecordItem } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { fetchFriendRecords, fetchFriendWorkouts } from '../social';
import { refreshFriendsIfStale, useFriends } from '../features/useFriends';
import { PickRoutineSheet } from '../features/ShareSheets';
import { Button } from '../ui/Button';
import {
  Avatar,
  Badge,
  EmptyState,
  InlineNotice,
  Skeleton,
} from '../ui/Feedback';
import { Card, GroupLabel, StackHeader, Stat } from '../ui/Layout';
import { socialErrorMessage, useRemoveFriend } from './SocialScreen';

/** How far back a friend's page looks. */
const HISTORY_DAYS = 90;

export function FriendScreen({ userId }: { userId: string }) {
  const { pop } = useNavigation();
  const friends = useFriends();
  const removeFriend = useRemoveFriend();
  const link = friends.lists.friends.find(
    (item) => item.other.userId === userId,
  );
  const sharing = link?.other.shareStats ?? false;
  const [data, setData] = useState<{
    workouts: CompletedWorkout[];
    records: PersonalRecordItem[];
  } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => refreshFriendsIfStale(), []);

  useEffect(() => {
    if (!sharing) return;
    let alive = true;
    const since = addDays(startOfDay(new Date()), -HISTORY_DAYS);
    Promise.all([
      fetchFriendWorkouts([userId], since),
      fetchFriendRecords(userId),
    ])
      .then(([workouts, records]) => {
        if (!alive) return;
        setData({ workouts: workouts.get(userId) ?? [], records });
        setFailed(null);
      })
      .catch((error: unknown) => alive && setFailed(socialErrorMessage(error)));
    return () => {
      alive = false;
    };
  }, [userId, sharing]);

  const month = useMemo(() => {
    if (!data) return null;
    const end = addDays(startOfDay(new Date()), 1);
    return totalsBetween(data.workouts, addDays(end, -30), end);
  }, [data]);

  const topRecords = useMemo(
    () =>
      (data?.records ?? [])
        .filter((record) => record.type === 'weight' && record.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data],
  );

  const title = link ? link.other.name || `@${link.other.username}` : 'Amigo';

  if (!link)
    return (
      <>
        <StackHeader title={title} onBack={pop} />
        <div className="app-column px-4 pt-6">
          {friends.status === 'ready' || friends.status === 'error' ? (
            <EmptyState
              icon={UserMinus}
              title="Vocês não são amigos"
              message="A amizade foi desfeita ou o pedido ainda não foi aceito."
              action={<Button onClick={pop}>Voltar</Button>}
            />
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </div>
      </>
    );

  const person = link.other;

  return (
    <>
      <StackHeader title={title} onBack={pop} />
      <div className="app-column pb-8">
        <div className="flex flex-col items-center px-4 pt-6 text-center">
          <Avatar
            name={person.name || person.username}
            photoUrl={person.photoUrl}
            size={84}
          />
          <h1 className="text-title mt-3 font-bold">
            {person.name || `@${person.username}`}
          </h1>
          <p className="text-footnote text-ink-2">
            @{person.username} · amigos desde {formatShortDate(link.since)}
          </p>
          <Button
            variant="tinted"
            icon={Send}
            className="mt-4"
            onClick={() => setPicking(true)}
          >
            Enviar rotina
          </Button>
        </div>
        <PickRoutineSheet
          friend={person}
          open={picking}
          onClose={() => setPicking(false)}
        />

        {!sharing ? (
          <EmptyState
            icon={EyeOff}
            title="Treinos privados"
            message={`${person.name || `@${person.username}`} não compartilha os treinos com amigos.`}
          />
        ) : failed ? (
          <div className="px-4 pt-5">
            <InlineNotice tone="error">{failed}</InlineNotice>
          </div>
        ) : !data || !month ? (
          <div className="space-y-3 px-4 pt-5">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <>
            <Card className="mx-4 mt-5 grid grid-cols-3 gap-2 p-4">
              <Stat
                label="Treinos (30d)"
                value={formatNumber(month.workouts, 0)}
              />
              <Stat
                label="Volume (30d)"
                value={formatCompact(month.volumeKg)}
                unit="kg"
              />
              <Stat
                label="Tempo (30d)"
                value={formatDurationMinutes(month.durationMinutes)}
              />
            </Card>

            <GroupLabel>Últimos treinos</GroupLabel>
            {data.workouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="Nenhum treino recente"
                message={`Nada registrado nos últimos ${HISTORY_DAYS} dias.`}
                className="py-6"
              />
            ) : (
              <div className="space-y-3 px-4">
                {data.workouts.slice(0, 15).map((workout) => (
                  <FriendWorkoutCard key={workout.id} workout={workout} />
                ))}
              </div>
            )}

            {topRecords.length > 0 && (
              <>
                <GroupLabel>Maiores cargas</GroupLabel>
                <ul className="mx-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                  {topRecords.map((record) => (
                    <li
                      key={record.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Trophy
                        size={18}
                        className="shrink-0 text-record"
                        aria-hidden="true"
                      />
                      <span className="text-body min-w-0 flex-1 truncate">
                        {record.exerciseName}
                      </span>
                      <span className="text-body shrink-0 font-semibold tabular">
                        {formatNumber(record.value)} {record.unit || 'kg'}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <div className="px-4 pt-8">
          <Button
            block
            variant="danger-ghost"
            icon={UserMinus}
            onClick={async () => {
              if (await removeFriend(link)) pop();
            }}
          >
            Desfazer amizade
          </Button>
        </div>
      </div>
    </>
  );
}

function FriendWorkoutCard({ workout }: { workout: CompletedWorkout }) {
  const shown = workout.exercises.slice(0, 5);
  const more = workout.exercises.length - shown.length;
  return (
    <Card as="article" className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-headline truncate font-semibold">
            {workout.name}
          </h3>
          <p className="text-footnote text-ink-2">
            {formatRelativeDay(workout.completedAt)} ·{' '}
            {formatDurationMinutes(workout.durationMinutes)} ·{' '}
            {formatCompact(workout.totalVolumeKg)} kg
          </p>
        </div>
        {workout.prsAchieved.length > 0 && (
          <Badge tone="record">
            <Trophy size={13} aria-hidden="true" /> {workout.prsAchieved.length}{' '}
            {workout.prsAchieved.length === 1 ? 'recorde' : 'recordes'}
          </Badge>
        )}
      </div>
      <ul className="mt-3 space-y-1.5">
        {shown.map((exercise, index) => (
          <li
            key={`${exercise.exerciseName}-${index}`}
            className="text-callout flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate">{exercise.exerciseName}</span>
            <span className="text-footnote shrink-0 text-ink-2 tabular">
              {exercise.setsCount}{' '}
              {exercise.setsCount === 1 ? 'série' : 'séries'}
              {exercise.bestWeightKg > 0 &&
                ` · ${formatNumber(exercise.bestWeightKg)} kg`}
            </span>
          </li>
        ))}
        {more > 0 && (
          <li className="text-footnote text-ink-3">
            +{more} {more === 1 ? 'exercício' : 'exercícios'}
          </li>
        )}
      </ul>
    </Card>
  );
}
