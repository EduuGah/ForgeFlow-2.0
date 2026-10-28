import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, LogOut, Swords, Trash2, UserPlus, Users } from 'lucide-react';
import { useAppStore, useProfilePhoto } from '../store';
import { addDays, startOfDay, toLocalDateInput } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatShortDate,
} from '../lib/format';
import {
  buildRanking,
  rankingValue,
  type RankingMetric,
  type SocialProfile,
} from '../lib/friends';
import { haptic } from '../lib/haptics';
import type { CompletedWorkout } from '../lib/types';
import {
  createGroup,
  deleteGroup,
  fetchFriendWorkouts,
  getSocialProfiles,
  inviteToGroup,
  joinGroup,
  leaveGroup,
  listGroups,
  type FriendGroup,
  type GroupMetric,
} from '../social';
import { Button } from '../ui/Button';
import {
  Avatar,
  Badge,
  EmptyState,
  InlineNotice,
  Skeleton,
} from '../ui/Feedback';
import { SegmentedControl, TextField } from '../ui/Form';
import { Card, GroupLabel } from '../ui/Layout';
import { Sheet, useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { pushToFriend } from './pushRegistration';
import type { FriendsState } from './useFriends';

/*
 * Groups (a named circle of friends with its own ranking) and challenges
 * (a group with a metric and an end date). Workouts only count for people
 * who are your friends and share them.
 */

const METRICS: { value: GroupMetric; label: string }[] = [
  { value: 'volume', label: 'Volume' },
  { value: 'workouts', label: 'Treinos' },
  { value: 'sets', label: 'Séries' },
  { value: 'minutes', label: 'Tempo' },
];

const FORMAT: Record<GroupMetric, (value: number) => string> = {
  volume: (value) => `${formatCompact(value)} kg`,
  workouts: (value) =>
    `${formatNumber(value, 0)} ${value === 1 ? 'treino' : 'treinos'}`,
  sets: (value) =>
    `${formatNumber(value, 0)} ${value === 1 ? 'série' : 'séries'}`,
  minutes: formatDurationMinutes,
};

const PODIUM = [
  'bg-[#ffd166] text-[#1b1400]',
  'bg-[#cfd6df] text-[#12151a]',
  'bg-[#e3a172] text-[#1b0e04]',
];

function daysLeft(group: FriendGroup): number | null {
  if (!group.endsOn) return null;
  const end = new Date(`${group.endsOn}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}

function describe(group: FriendGroup): string {
  const joined = group.members.filter((m) => m.status === 'joined').length;
  const people = `${joined} ${joined === 1 ? 'participante' : 'participantes'}`;
  if (!group.metric) return people;
  const left = daysLeft(group) ?? 0;
  const metric = METRICS.find((item) => item.value === group.metric)?.label;
  return `${metric} · ${left > 0 ? `${left} ${left === 1 ? 'dia' : 'dias'} restantes` : 'encerrado'} · ${people}`;
}

export function useGroups(me: string | null) {
  const [groups, setGroups] = useState<FriendGroup[] | null>(null);
  const [failed, setFailed] = useState(false);
  const reload = useCallback(async () => {
    if (!me || !navigator.onLine) return;
    try {
      setGroups(await listGroups());
      setFailed(false);
    } catch (error) {
      console.warn('ForgeFlow grupos:', error);
      setFailed(true);
    }
  }, [me]);
  useEffect(() => {
    if (!me || !navigator.onLine) return;
    let alive = true;
    listGroups()
      .then((found) => alive && setGroups(found))
      .catch((error: unknown) => {
        console.warn('ForgeFlow grupos:', error);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [me]);
  return { groups, failed, reload };
}

/* ------------------------------------------------------------------ */
/* The tab                                                             */
/* ------------------------------------------------------------------ */

export function GroupsPanel({ friends }: { friends: FriendsState }) {
  const me = friends.me?.userId ?? null;
  const toast = useToast();
  const { groups, failed, reload } = useGroups(me);
  const [creating, setCreating] = useState<'challenge' | 'group' | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const invites = (groups ?? []).filter((group) =>
    group.members.some((m) => m.userId === me && m.status === 'invited'),
  );
  const mine = (groups ?? []).filter((group) => !invites.includes(group));
  const open = (groups ?? []).find((group) => group.id === openId) ?? null;

  if (!friends.me)
    return (
      <EmptyState
        art="friends"
        title="Entre na comunidade"
        message="Abra a aba Amigos uma vez para criar seu perfil e depois volte aqui."
      />
    );

  return (
    <section
      className="animate-fade-in space-y-3 px-4 pt-4 pb-6"
      aria-label="Grupos e desafios"
    >
      <div className="grid grid-cols-2 gap-2">
        <Button icon={Swords} onClick={() => setCreating('challenge')}>
          Novo desafio
        </Button>
        <Button
          variant="secondary"
          icon={Users}
          onClick={() => setCreating('group')}
        >
          Novo grupo
        </Button>
      </div>
      {failed && (
        <InlineNotice tone="error">
          Não foi possível carregar os grupos. Rode o supabase-schema.sql
          atualizado ou tente de novo.
        </InlineNotice>
      )}
      {groups === null && !failed ? (
        <>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </>
      ) : null}

      {invites.length > 0 && (
        <GroupLabel>Convites ({invites.length})</GroupLabel>
      )}
      {invites.map((group) => (
        <Card key={group.id} className="p-4">
          <p className="text-headline font-semibold">{group.name}</p>
          <p className="text-footnote text-ink-2">{describe(group)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              icon={Check}
              onClick={async () => {
                try {
                  await joinGroup(me as string, group.id);
                  haptic('success');
                  toast({
                    tone: 'success',
                    title: 'Você entrou',
                    description: group.name,
                  });
                  void reload();
                } catch {
                  toast({ tone: 'error', title: 'Não foi possível entrar' });
                }
              }}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await leaveGroup(group.id, me as string).catch(() => undefined);
                void reload();
              }}
            >
              Recusar
            </Button>
          </div>
        </Card>
      ))}

      {groups !== null && mine.length === 0 && invites.length === 0 && (
        <EmptyState
          art="trophy"
          title="Dispute com seus amigos"
          message="Crie um desafio (quem faz mais volume em 30 dias?) ou um grupo com ranking só da sua turma."
        />
      )}
      {mine.length > 0 && <GroupLabel>Seus desafios e grupos</GroupLabel>}
      {mine.map((group) => {
        const ended = group.metric !== null && (daysLeft(group) ?? 0) <= 0;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => setOpenId(group.id)}
            className="pressable flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left"
          >
            <span
              className={cx(
                'grid size-11 shrink-0 place-items-center rounded-full',
                group.metric
                  ? 'bg-brand-soft text-brand-ink'
                  : 'bg-raised text-ink-2',
              )}
            >
              {group.metric ? (
                <Swords size={20} aria-hidden="true" />
              ) : (
                <Users size={20} aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-body block truncate font-semibold">
                {group.name}
              </span>
              <span className="text-footnote block truncate text-ink-2">
                {describe(group)}
              </span>
            </span>
            {group.metric && (
              <Badge tone={ended ? 'neutral' : 'brand'}>
                {ended ? 'Fim' : 'Desafio'}
              </Badge>
            )}
          </button>
        );
      })}

      <CreateGroupSheet
        kind={creating}
        friends={friends}
        onClose={() => setCreating(null)}
        onCreated={(id) => {
          setCreating(null);
          void reload().then(() => setOpenId(id));
        }}
      />
      <GroupSheet
        group={open}
        friends={friends}
        onClose={() => setOpenId(null)}
        onChanged={() => void reload()}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Creating                                                            */
/* ------------------------------------------------------------------ */

function FriendPicker({
  people,
  chosen,
  onToggle,
}: {
  people: SocialProfile[];
  chosen: string[];
  onToggle: (userId: string) => void;
}) {
  if (people.length === 0)
    return (
      <p className="text-footnote text-ink-2">
        Nenhum amigo para convidar ainda.
      </p>
    );
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {people.map((person) => {
        const on = chosen.includes(person.userId);
        return (
          <li key={person.userId}>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(person.userId)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <Avatar
                name={person.name || person.username}
                photoUrl={person.photoUrl}
                size={34}
              />
              <span className="text-body min-w-0 flex-1 truncate">
                {person.name || `@${person.username}`}
              </span>
              <span
                className={cx(
                  'grid size-6 place-items-center rounded-md border',
                  on
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line-strong',
                )}
              >
                {on && <Check size={15} strokeWidth={3} aria-hidden="true" />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function CreateGroupSheet({
  kind,
  friends,
  onClose,
  onCreated,
}: {
  kind: 'challenge' | 'group' | null;
  friends: FriendsState;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<GroupMetric>('volume');
  const [days, setDays] = useState<'7' | '14' | '30'>('30');
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastKind, setLastKind] = useState(kind);
  if (lastKind !== kind) {
    setLastKind(kind);
    if (kind) {
      setName('');
      setChosen([]);
    }
  }
  const challenge = kind === 'challenge';
  const metricLabel =
    METRICS.find((item) => item.value === metric)?.label ?? '';
  const suggestion = challenge
    ? `${metricLabel} em ${days} dias`
    : 'Minha turma';
  const people = friends.lists.friends.map((link) => link.other);

  const create = async () => {
    const me = friends.me?.userId;
    if (!me || busy) return;
    setBusy(true);
    try {
      const today = startOfDay(new Date());
      const id = await createGroup(
        me,
        {
          name: name.trim() || suggestion,
          metric: challenge ? metric : null,
          startsOn: challenge ? toLocalDateInput(today) : null,
          endsOn: challenge
            ? toLocalDateInput(addDays(today, Number(days) - 1))
            : null,
        },
        chosen,
      );
      if (chosen.length > 0) pushToFriend({ type: 'group', id });
      haptic('success');
      toast({
        tone: 'success',
        title: challenge ? 'Desafio criado' : 'Grupo criado',
      });
      onCreated(id);
    } catch (error) {
      console.warn('ForgeFlow grupos:', error);
      toast({ tone: 'error', title: 'Não foi possível criar' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={kind !== null}
      onClose={onClose}
      title={challenge ? 'Novo desafio' : 'Novo grupo'}
      description={
        challenge
          ? 'Começa hoje. Ganha quem tiver mais no fim do prazo.'
          : 'Um ranking só seu e dos amigos que você escolher.'
      }
      footer={
        <Button size="lg" block disabled={busy} onClick={() => void create()}>
          {challenge ? 'Criar desafio' : 'Criar grupo'}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Nome"
          value={name}
          maxLength={60}
          placeholder={suggestion}
          onChange={(event) => setName(event.target.value)}
        />
        {challenge && (
          <>
            <div>
              <p className="text-footnote mb-1.5 font-medium text-ink-2">
                Quem tiver mais
              </p>
              <SegmentedControl
                label="Medida do desafio"
                value={metric}
                onChange={setMetric}
                options={METRICS}
              />
            </div>
            <div>
              <p className="text-footnote mb-1.5 font-medium text-ink-2">
                Duração
              </p>
              <SegmentedControl
                label="Duração do desafio"
                value={days}
                onChange={setDays}
                options={[
                  { value: '7', label: '7 dias' },
                  { value: '14', label: '14 dias' },
                  { value: '30', label: '30 dias' },
                ]}
              />
            </div>
          </>
        )}
        <div>
          <p className="text-footnote mb-1.5 font-medium text-ink-2">
            Convidar amigos
          </p>
          <FriendPicker
            people={people}
            chosen={chosen}
            onToggle={(id) =>
              setChosen((list) =>
                list.includes(id)
                  ? list.filter((item) => item !== id)
                  : [...list, id],
              )
            }
          />
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* A group: ranking, people, leaving                                   */
/* ------------------------------------------------------------------ */

function GroupSheet({
  group,
  friends,
  onClose,
  onChanged,
}: {
  group: FriendGroup | null;
  friends: FriendsState;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { history, userProfile } = useAppStore();
  const photo = useProfilePhoto();
  const confirm = useConfirm();
  const toast = useToast();
  const me = friends.me?.userId ?? null;
  const [metricChoice, setMetricChoice] = useState<RankingMetric>('volume');
  const [profiles, setProfiles] = useState<Map<string, SocialProfile>>(
    new Map(),
  );
  const [workouts, setWorkouts] = useState<Map<
    string,
    CompletedWorkout[]
  > | null>(null);
  const [inviting, setInviting] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);

  const joined = useMemo(
    () =>
      (group?.members ?? [])
        .filter((m) => m.status === 'joined')
        .map((m) => m.userId),
    [group],
  );
  const friendIds = new Set(
    friends.lists.friends
      .filter((l) => l.other.shareStats)
      .map((l) => l.other.userId),
  );
  const visible = joined.filter((id) => id !== me && friendIds.has(id));
  const visibleKey = visible.sort().join(',');
  const memberKey = (group?.members ?? [])
    .map((m) => m.userId)
    .sort()
    .join(',');
  const since = group?.startsOn
    ? new Date(`${group.startsOn}T00:00:00`)
    : addDays(startOfDay(new Date()), -29);
  const until = group?.endsOn ? new Date(`${group.endsOn}T23:59:59`) : null;
  const sinceTime = since.getTime();

  useEffect(() => {
    if (!group || !memberKey) return;
    let alive = true;
    getSocialProfiles(memberKey.split(','))
      .then((found) => alive && setProfiles(found))
      .catch(() => undefined);
    fetchFriendWorkouts(
      visibleKey ? visibleKey.split(',') : [],
      new Date(sinceTime),
    )
      .then((found) => alive && setWorkouts(found))
      .catch(() => alive && setWorkouts(new Map()));
    return () => {
      alive = false;
    };
  }, [group, memberKey, visibleKey, sinceTime]);

  if (!group)
    return (
      <Sheet open={false} onClose={onClose} title="">
        {null}
      </Sheet>
    );

  const metric: RankingMetric = group.metric ?? metricChoice;
  const inWindow = (list: CompletedWorkout[]) =>
    until
      ? list.filter((w) => Date.parse(w.completedAt) <= until.getTime())
      : list;
  const ranking = buildRanking(
    joined
      .filter((id) => id === me || friendIds.has(id))
      .map((id) => {
        const profile = profiles.get(id);
        return {
          userId: id,
          name:
            id === me
              ? userProfile.name
              : profile?.name || `@${profile?.username ?? 'amigo'}`,
          photoUrl: id === me ? photo : (profile?.photoUrl ?? null),
          me: id === me,
          history: inWindow(id === me ? history : (workouts?.get(id) ?? [])),
        };
      }),
    since,
    metric,
  );
  const hidden = joined.filter((id) => id !== me && !friendIds.has(id));
  const pending = group.members.filter((m) => m.status === 'invited');
  const owner = group.ownerId === me;
  const left = daysLeft(group);
  const ended = group.metric !== null && (left ?? 0) <= 0;
  const format = FORMAT[metric as GroupMetric] ?? FORMAT.volume;
  const invitable = friends.lists.friends
    .map((link) => link.other)
    .filter((person) => !group.members.some((m) => m.userId === person.userId));

  return (
    <Sheet
      open
      onClose={onClose}
      title={group.name}
      description={describe(group)}
    >
      <div className="space-y-4">
        {group.metric ? (
          <p className="text-footnote text-ink-2">
            De {formatShortDate(since.toISOString())} a{' '}
            {formatShortDate((until ?? new Date()).toISOString())}
            {ended && ranking[0] && rankingValue(ranking[0], metric) > 0
              ? ` · 🏆 ${ranking[0].me ? 'Você venceu!' : `${ranking[0].name} venceu`}`
              : ''}
          </p>
        ) : (
          <SegmentedControl
            label="Medida do ranking"
            value={
              metricChoice === 'records'
                ? 'volume'
                : (metricChoice as GroupMetric)
            }
            onChange={setMetricChoice}
            options={METRICS}
          />
        )}
        {!group.metric && (
          <p className="text-footnote -mt-2 text-ink-3">Últimos 30 dias</p>
        )}

        <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {ranking.map((athlete, index) => (
            <li
              key={athlete.userId}
              className={cx(
                'flex items-center gap-3 px-3 py-2.5',
                athlete.me && 'bg-brand-soft',
              )}
            >
              <span
                className={cx(
                  'text-footnote grid size-7 shrink-0 place-items-center rounded-full font-bold tabular',
                  rankingValue(athlete, metric) > 0
                    ? (PODIUM[index] ?? 'bg-raised text-ink-2')
                    : 'bg-raised text-ink-2',
                )}
              >
                {index + 1}
              </span>
              <Avatar
                name={athlete.name}
                photoUrl={athlete.photoUrl}
                size={34}
              />
              <span className="text-body min-w-0 flex-1 truncate font-medium">
                {athlete.me ? 'Você' : athlete.name}
              </span>
              <span className="text-callout shrink-0 tabular text-ink-2">
                {format(rankingValue(athlete, metric))}
              </span>
            </li>
          ))}
        </ol>
        {hidden.length > 0 && (
          <p className="text-footnote text-ink-3">
            {hidden.length === 1
              ? '1 participante não é seu amigo'
              : `${hidden.length} participantes não são seus amigos`}{' '}
            (ou não compartilha os treinos) e fica fora da sua visão do ranking.
          </p>
        )}
        {pending.length > 0 && (
          <p className="text-footnote text-ink-2">
            Aguardando:{' '}
            {pending
              .map((m) => {
                const profile = profiles.get(m.userId);
                return profile
                  ? profile.name || `@${profile.username}`
                  : 'amigo';
              })
              .join(', ')}
          </p>
        )}

        {owner && !ended && (
          <div className="space-y-2">
            {inviting ? (
              <>
                <FriendPicker
                  people={invitable}
                  chosen={chosen}
                  onToggle={(id) =>
                    setChosen((list) =>
                      list.includes(id)
                        ? list.filter((item) => item !== id)
                        : [...list, id],
                    )
                  }
                />
                <Button
                  block
                  disabled={chosen.length === 0}
                  onClick={async () => {
                    try {
                      await inviteToGroup(group.id, chosen);
                      pushToFriend({ type: 'group', id: group.id });
                      setChosen([]);
                      setInviting(false);
                      onChanged();
                      toast({ tone: 'success', title: 'Convites enviados' });
                    } catch {
                      toast({
                        tone: 'error',
                        title: 'Não foi possível convidar',
                      });
                    }
                  }}
                >
                  Convidar {chosen.length > 0 ? `(${chosen.length})` : ''}
                </Button>
              </>
            ) : (
              <Button
                block
                variant="secondary"
                icon={UserPlus}
                onClick={() => setInviting(true)}
              >
                Convidar amigos
              </Button>
            )}
          </div>
        )}
        <Button
          block
          variant="danger-ghost"
          icon={owner ? Trash2 : LogOut}
          onClick={async () => {
            const ok = await confirm({
              title: owner ? 'Excluir para todos?' : 'Sair do grupo?',
              message: owner
                ? 'O grupo e o ranking somem para todos os participantes.'
                : 'Você deixa de aparecer no ranking. Dá para ser convidado de novo.',
              confirmLabel: owner ? 'Excluir' : 'Sair',
              tone: 'danger',
            });
            if (!ok) return;
            try {
              if (owner) await deleteGroup(group.id);
              else if (me) await leaveGroup(group.id, me);
              onClose();
              onChanged();
            } catch {
              toast({ tone: 'error', title: 'Não foi possível concluir' });
            }
          }}
        >
          {owner
            ? group.metric
              ? 'Excluir desafio'
              : 'Excluir grupo'
            : 'Sair'}
        </Button>
      </div>
    </Sheet>
  );
}
