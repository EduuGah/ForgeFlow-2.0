import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Check,
  Clock,
  Activity,
  Copy,
  Dumbbell,
  Inbox,
  Search,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { actions, useAppStore, useProfilePhoto } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatRelativeDay,
  formatTime,
} from '../lib/format';
import {
  buildRanking,
  inviteLink,
  relationTo,
  type FriendLink,
  type SocialProfile,
} from '../lib/friends';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import {
  SocialError,
  fetchFriendWorkouts,
  findByUsername,
  searchPeople,
} from '../social';
import type { CompletedWorkout } from '../lib/types';
import {
  friendActions,
  refreshFriends,
  totalUnread,
  useFriends,
  type FriendsState,
  type InboxShare,
} from '../features/useFriends';
import { describeShare } from '../lib/sharing';
import { clearInvite } from '../features/invite';
import { GoogleButton, useGoogleSignIn } from '../features/GoogleSignIn';
import { Button, Spinner } from '../ui/Button';
import {
  Avatar,
  Badge,
  EmptyState,
  InlineNotice,
  Skeleton,
} from '../ui/Feedback';
import { SegmentedControl, Switch, Tabs, TextField } from '../ui/Form';
import { Card, GroupLabel, StackHeader } from '../ui/Layout';
import { useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

type SocialTab = 'friends' | 'activity' | 'ranking' | 'challenges';

const CHALLENGES = [
  {
    id: 'ch-volume',
    title: '30 dias de volume',
    description:
      'Acumule o máximo de volume em 30 dias de treinos consistentes.',
    metric: 'Volume total',
    participants: 142,
    daysLeft: 18,
  },
  {
    id: 'ch-consistency',
    title: '20 treinos no mês',
    description: 'Complete 20 treinos válidos dentro do mês.',
    metric: 'Frequência',
    participants: 98,
    daysLeft: 22,
  },
  {
    id: 'ch-squat',
    title: 'Agachamento pesado',
    description:
      'Aumente sua carga de trabalho no agachamento livre com segurança.',
    metric: 'Carga máxima',
    participants: 65,
    daysLeft: 12,
  },
];

/* Medal metals: the same in both themes, always with dark text. */
const PODIUM = [
  'bg-[#ffd166] text-[#1b1400]',
  'bg-[#cfd6df] text-[#12151a]',
  'bg-[#e3a172] text-[#1b0e04]',
];

/** What went wrong, in words the person can act on. */
export function socialErrorMessage(error: unknown): string {
  if (!navigator.onLine) return 'Sem conexão. Amigos precisam de internet.';
  if (error instanceof SocialError) {
    if (error.kind === 'schema')
      return 'O banco ainda não tem as tabelas de amizade: rode o supabase-schema.sql atualizado no SQL Editor do Supabase.';
    if (error.kind === 'gone') return 'Esse pedido não existe mais.';
    if (error.kind === 'exists')
      return 'Vocês já têm um pedido ou amizade em andamento.';
  }
  return 'Não foi possível falar com o servidor. Tente de novo.';
}

export function SocialScreen({ invite }: { invite?: string }) {
  const { currentUser, isOnline } = useAppStore();
  const { pop } = useNavigation();
  const friends = useFriends();
  const [tab, setTab] = useState<SocialTab>(
    invite || currentUser ? 'friends' : 'challenges',
  );

  useEffect(() => {
    if (currentUser && isOnline) void refreshFriends();
  }, [currentUser, isOnline]);

  const needsAccount = !currentUser && tab !== 'challenges';
  const pending =
    friends.lists.incoming.length + friends.inbox.length + totalUnread(friends);

  return (
    <>
      <StackHeader title="Comunidade" onBack={pop} />
      <div className="app-column">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 bg-canvas/95 px-4 py-2 backdrop-blur-md">
          <Tabs
            label="Seções da comunidade"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'friends',
                label: pending ? `Amigos (${pending})` : 'Amigos',
              },
              { value: 'activity', label: 'Atividade' },
              { value: 'ranking', label: 'Ranking' },
              { value: 'challenges', label: 'Desafios' },
            ]}
          />
        </div>

        {needsAccount ? (
          <SignInPrompt invite={invite} />
        ) : (
          <>
            {!isOnline && tab !== 'challenges' && (
              <div className="px-4 pt-4">
                <InlineNotice tone="offline">
                  Sem conexão. Amigos e ranking precisam de internet.
                </InlineNotice>
              </div>
            )}
            {friends.status === 'error' && tab !== 'challenges' && (
              <div className="px-4 pt-4">
                <InlineNotice
                  tone="error"
                  action={
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void refreshFriends()}
                    >
                      Tentar de novo
                    </Button>
                  }
                >
                  {friends.error === 'schema'
                    ? socialErrorMessage(new SocialError('', 'schema'))
                    : 'Não foi possível carregar seus amigos.'}
                </InlineNotice>
              </div>
            )}
            {tab === 'friends' && (
              <FriendsPanel friends={friends} invite={invite} />
            )}
            {tab === 'activity' && <ActivityPanel friends={friends} />}
            {tab === 'ranking' && <RankingPanel friends={friends} />}
          </>
        )}
        {tab === 'challenges' && <ChallengesPanel />}
      </div>
    </>
  );
}

function SignInPrompt({ invite }: { invite?: string }) {
  const { signIn, signingIn } = useGoogleSignIn();
  return (
    <div className="px-4 pt-4">
      <EmptyState
        icon={Users}
        title={invite ? `Convite de @${invite}` : 'Treine com seus amigos'}
        message={
          invite
            ? 'Entre com a conta Google para aceitar o convite. Depois do login ele abre aqui sozinho.'
            : 'Entre com a conta Google para adicionar amigos, ver os treinos deles e disputar o ranking.'
        }
        action={
          <GoogleButton onClick={signIn} loading={signingIn} className="mt-2" />
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Friends                                                             */
/* ------------------------------------------------------------------ */

function PersonRow({
  person,
  subtitle,
  trailing,
  onClick,
}: {
  person: SocialProfile;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const identity = (
    <>
      <Avatar
        name={person.name || person.username}
        photoUrl={person.photoUrl}
        size={44}
      />
      <span className="min-w-0 flex-1 text-left">
        <span className="text-body block truncate font-medium">
          {person.name || `@${person.username}`}
        </span>
        <span className="text-footnote block truncate text-ink-2">
          {subtitle ?? `@${person.username}`}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="pressable flex min-w-0 flex-1 items-center gap-3"
        >
          {identity}
        </button>
      ) : (
        identity
      )}
      {trailing}
    </li>
  );
}

/** Add / accept / pending / friend, depending on where the two stand. */
function RelationAction({
  person,
  friends,
}: {
  person: SocialProfile;
  friends: FriendsState;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const relation = relationTo(friends.lists, person.userId);

  const run = async (
    action: () => Promise<void>,
    success: { title: string; description?: string },
  ) => {
    setBusy(true);
    try {
      await action();
      haptic('success');
      toast({ tone: 'success', ...success });
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  if (relation.kind === 'friend')
    return (
      <Badge tone="success">
        <UserCheck size={14} aria-hidden="true" /> Amigo
      </Badge>
    );
  if (relation.kind === 'outgoing')
    return <Badge tone="neutral">Pedido enviado</Badge>;
  if (relation.kind === 'incoming') {
    const link = relation.link;
    return (
      <Button
        size="sm"
        loading={busy}
        onClick={() =>
          void run(() => friendActions.accept(link), {
            title: 'Pedido aceito',
            description: `${person.name || person.username} agora é seu amigo.`,
          })
        }
      >
        Aceitar
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant="tinted"
      icon={UserPlus}
      loading={busy}
      onClick={() =>
        void run(() => friendActions.sendRequest(person), {
          title: 'Pedido enviado',
          description: `Quando @${person.username} aceitar, vocês viram amigos.`,
        })
      }
    >
      Adicionar
    </Button>
  );
}

async function shareInvite(username: string): Promise<'shared' | 'copied'> {
  const link = inviteLink(window.location.origin, username);
  const text = `Bora treinar junto no ForgeFlow? Me adiciona como amigo: ${link}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'ForgeFlow', text });
      return 'shared';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return 'shared';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

function MyCard({ friends }: { friends: FriendsState }) {
  const toast = useToast();
  const { push } = useNavigation();
  const me = friends.me;
  if (!me)
    return (
      <Card className="mx-4 mt-4 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </Card>
    );

  return (
    <Card className="mx-4 mt-4 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={me.name} photoUrl={me.photoUrl} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-headline truncate font-semibold">{me.name}</p>
          <p className="text-footnote text-ink-2">
            Seu @ na comunidade:{' '}
            <span className="font-semibold text-ink">@{me.username}</span>
          </p>
        </div>
      </div>
      {friends.takenUsername && (
        <InlineNotice
          tone="warning"
          className="mt-3"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => push({ name: 'editProfile' })}
            >
              Trocar
            </Button>
          }
        >
          @{friends.takenUsername} já é de outra pessoa; você continua como @
          {me.username}.
        </InlineNotice>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          icon={Share2}
          onClick={async () => {
            try {
              const result = await shareInvite(me.username);
              if (result === 'copied')
                toast({
                  tone: 'success',
                  title: 'Link de convite copiado',
                  description: 'Cole no WhatsApp para o seu amigo.',
                });
            } catch {
              toast({ tone: 'error', title: 'Não foi possível compartilhar' });
            }
          }}
        >
          Convidar
        </Button>
        <Button
          variant="secondary"
          icon={Copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`@${me.username}`);
              toast({ tone: 'success', title: `@${me.username} copiado` });
            } catch {
              toast({ tone: 'error', title: 'Não foi possível copiar' });
            }
          }}
        >
          Copiar @
        </Button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="min-w-0">
          <span className="text-body block">Mostrar meus treinos</span>
          <span className="text-footnote block text-ink-2">
            Amigos veem seus treinos, recordes e entram no ranking.
          </span>
        </span>
        <Switch
          label="Mostrar meus treinos para amigos"
          checked={me.shareStats}
          onChange={(value) => {
            friendActions
              .setShareStats(value)
              .catch((error: unknown) =>
                toast({ tone: 'error', title: socialErrorMessage(error) }),
              );
          }}
        />
      </div>
    </Card>
  );
}

function InviteCard({
  username,
  friends,
}: {
  username: string;
  friends: FriendsState;
}) {
  const [person, setPerson] = useState<SocialProfile | null | 'loading'>(
    'loading',
  );
  useEffect(() => {
    let alive = true;
    findByUsername(username)
      .then((found) => alive && setPerson(found))
      .catch(() => alive && setPerson(null));
    clearInvite();
    return () => {
      alive = false;
    };
  }, [username]);

  if (person === 'loading')
    return (
      <Card className="mx-4 mt-4 flex items-center gap-3 p-4">
        <Spinner size={18} /> Abrindo convite de @{username}…
      </Card>
    );
  if (!person)
    return (
      <div className="px-4 pt-4">
        <InlineNotice tone="warning">
          Não encontramos @{username}. O link pode estar errado ou a pessoa
          trocou de @.
        </InlineNotice>
      </div>
    );
  if (person.userId === friends.me?.userId)
    return (
      <div className="px-4 pt-4">
        <InlineNotice tone="info">
          Esse é o seu próprio convite: mande o link para um amigo.
        </InlineNotice>
      </div>
    );
  return (
    <section aria-label="Convite" className="mx-4 mt-4">
      <p className="text-footnote mb-1.5 font-semibold text-brand-ink">
        Convite recebido
      </p>
      <ul className="overflow-hidden rounded-lg border border-brand bg-surface">
        <PersonRow
          person={person}
          trailing={<RelationAction person={person} friends={friends} />}
        />
      </ul>
    </section>
  );
}

function SearchPeople({ friends }: { friends: FriendsState }) {
  const [query, setQuery] = useState('');
  // The answer for one term; anything else on screen is derived from it.
  const [answer, setAnswer] = useState<{
    term: string;
    results: SocialProfile[];
    failed: string | null;
  } | null>(null);
  const term = query.trim().replace(/^@/, '');
  const active = term.length >= 2;
  const current = active && answer?.term === term ? answer : null;
  const searching = active && !current;
  const results = current?.results ?? null;
  const failed = current?.failed ?? null;

  useEffect(() => {
    if (term.length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchPeople(term)
        .then(
          (found) => alive && setAnswer({ term, results: found, failed: null }),
        )
        .catch(
          (error: unknown) =>
            alive &&
            setAnswer({ term, results: [], failed: socialErrorMessage(error) }),
        );
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [term]);

  return (
    <section aria-labelledby="search-people" className="px-4 pt-5">
      <h2 id="search-people" className="sr-only">
        Buscar pessoas
      </h2>
      <div className="relative">
        <TextField
          label="Buscar pessoas"
          placeholder="Nome ou @usuário"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          type="search"
        />
        <span className="pointer-events-none absolute right-3 bottom-3.5 text-ink-3">
          {searching ? <Spinner size={18} /> : <Search size={18} />}
        </span>
      </div>
      {failed && (
        <InlineNotice tone="error" className="mt-2">
          {failed}
        </InlineNotice>
      )}
      {results && !failed && (
        <div className="mt-2" aria-live="polite">
          {results.length === 0 ? (
            <p className="text-footnote px-1 py-3 text-ink-2">
              Ninguém encontrado. Confira o @ ou mande o link de convite.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {results.map((person) => (
                <PersonRow
                  key={person.userId}
                  person={person}
                  trailing={
                    <RelationAction person={person} friends={friends} />
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function RequestRow({
  link,
  kind,
}: {
  link: FriendLink;
  kind: 'incoming' | 'outgoing';
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<'accept' | 'remove' | null>(null);
  const who = link.other.name || `@${link.other.username}`;

  const run = async (
    which: 'accept' | 'remove',
    action: () => Promise<void>,
    title: string,
  ) => {
    setBusy(which);
    try {
      await action();
      haptic('success');
      toast({ tone: 'success', title });
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
      setBusy(null);
    }
  };

  return (
    <PersonRow
      person={link.other}
      subtitle={`@${link.other.username} · ${formatRelativeDay(link.since)}`}
      trailing={
        kind === 'incoming' ? (
          <span className="flex shrink-0 gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              loading={busy === 'remove'}
              disabled={busy !== null}
              onClick={() =>
                void run(
                  'remove',
                  () => friendActions.remove(link),
                  'Pedido recusado',
                )
              }
            >
              Recusar
            </Button>
            <Button
              size="sm"
              loading={busy === 'accept'}
              disabled={busy !== null}
              onClick={() =>
                void run(
                  'accept',
                  () => friendActions.accept(link),
                  `${who} agora é seu amigo`,
                )
              }
            >
              Aceitar
            </Button>
          </span>
        ) : (
          <Button
            size="sm"
            variant="danger-ghost"
            loading={busy === 'remove'}
            onClick={() =>
              void run(
                'remove',
                () => friendActions.remove(link),
                'Pedido cancelado',
              )
            }
          >
            Cancelar
          </Button>
        )
      }
    />
  );
}

function InboxRow({ share }: { share: InboxShare }) {
  const toast = useToast();
  const { selectTab } = useNavigation();
  const [busy, setBusy] = useState<'save' | 'decline' | null>(null);
  const who = share.sender
    ? share.sender.name || `@${share.sender.username}`
    : 'Um amigo';

  const save = async () => {
    setBusy('save');
    try {
      const saved = await friendActions.saveShare(share);
      haptic('success');
      toast({
        tone: 'success',
        title:
          saved === 1
            ? 'Rotina salva nas suas rotinas'
            : `${saved} rotinas salvas nas suas rotinas`,
        action: { label: 'Ver', onPress: () => selectTab('routines') },
      });
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('decline');
    try {
      await friendActions.declineShare(share);
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
      setBusy(null);
    }
  };

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={who} photoUrl={share.sender?.photoUrl} size={44} />
        <span className="min-w-0 flex-1">
          <span className="text-body block truncate font-medium">
            {share.title}
          </span>
          <span className="text-footnote block truncate text-ink-2">
            {describeShare(share.kind, share.payload)} · de {who} ·{' '}
            {formatRelativeDay(share.createdAt)}
          </span>
        </span>
        <Inbox size={18} className="shrink-0 text-ink-3" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={busy === 'decline'}
          disabled={busy !== null}
          onClick={() => void decline()}
        >
          Recusar
        </Button>
        <Button
          size="sm"
          loading={busy === 'save'}
          disabled={busy !== null}
          onClick={() => void save()}
        >
          Salvar nas rotinas
        </Button>
      </div>
    </li>
  );
}

function FriendsPanel({
  friends,
  invite,
}: {
  friends: FriendsState;
  invite?: string;
}) {
  const { push } = useNavigation();
  const { incoming, outgoing } = friends.lists;
  const list = friends.lists.friends;
  const loading = friends.status === 'loading' && !friends.me;

  return (
    <section
      id="panel-friends"
      role="tabpanel"
      aria-labelledby="tab-friends"
      className="animate-fade-in pb-6"
    >
      <MyCard friends={friends} />
      {invite && friends.me && (
        <InviteCard username={invite} friends={friends} />
      )}
      {friends.me && <SearchPeople friends={friends} />}

      {friends.inbox.length > 0 && (
        <>
          <GroupLabel>Rotinas recebidas ({friends.inbox.length})</GroupLabel>
          <ul className="divide-y divide-line bg-surface">
            {friends.inbox.map((share) => (
              <InboxRow key={share.id} share={share} />
            ))}
          </ul>
        </>
      )}

      {incoming.length > 0 && (
        <>
          <GroupLabel>Pedidos recebidos ({incoming.length})</GroupLabel>
          <ul className="divide-y divide-line bg-surface">
            {incoming.map((link) => (
              <RequestRow key={link.id} link={link} kind="incoming" />
            ))}
          </ul>
        </>
      )}

      <GroupLabel>Amigos{list.length ? ` (${list.length})` : ''}</GroupLabel>
      {loading ? (
        <div className="space-y-3 px-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum amigo ainda"
          message="Toque em Convidar e mande o link, ou busque pelo @ de quem já usa o ForgeFlow."
          className="py-6"
        />
      ) : (
        <ul className="divide-y divide-line bg-surface">
          {list.map((link) => {
            const unread = friends.unread[link.other.userId] ?? 0;
            return (
              <PersonRow
                key={link.id}
                person={link.other}
                subtitle={
                  unread > 0
                    ? `${unread} ${unread === 1 ? 'mensagem nova' : 'mensagens novas'}`
                    : link.other.shareStats
                      ? `@${link.other.username}`
                      : `@${link.other.username} · treinos privados`
                }
                trailing={
                  unread > 0 ? (
                    <span
                      className="text-caption grid size-6 shrink-0 place-items-center rounded-full bg-brand font-bold text-on-brand tabular"
                      aria-label={`${unread} não lidas`}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : undefined
                }
                // New messages open the conversation straight away.
                onClick={() =>
                  push({
                    name: unread > 0 ? 'chat' : 'friend',
                    userId: link.other.userId,
                  })
                }
              />
            );
          })}
        </ul>
      )}

      {outgoing.length > 0 && (
        <>
          <GroupLabel>Pedidos enviados ({outgoing.length})</GroupLabel>
          <ul className="divide-y divide-line bg-surface">
            {outgoing.map((link) => (
              <RequestRow key={link.id} link={link} kind="outgoing" />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

const ACTIVITY_DAYS = 14;

function ActivityPanel({ friends }: { friends: FriendsState }) {
  const { isOnline } = useAppStore();
  const { push } = useNavigation();
  const [feed, setFeed] = useState<
    { friend: SocialProfile; workout: CompletedWorkout }[] | null
  >(null);
  const [failed, setFailed] = useState<string | null>(null);
  const list = friends.lists.friends;
  const sharing = list.filter((link) => link.other.shareStats);

  useEffect(() => {
    if (!isOnline || friends.status !== 'ready') return;
    const people = new Map(
      list
        .filter((link) => link.other.shareStats)
        .map((link) => [link.other.userId, link.other]),
    );
    let alive = true;
    fetchFriendWorkouts(
      [...people.keys()],
      addDays(startOfDay(new Date()), -ACTIVITY_DAYS),
    )
      .then((byFriend) => {
        if (!alive) return;
        const items = [...byFriend.entries()].flatMap(([id, workouts]) => {
          const friend = people.get(id);
          return friend ? workouts.map((workout) => ({ friend, workout })) : [];
        });
        items.sort((a, b) =>
          b.workout.completedAt.localeCompare(a.workout.completedAt),
        );
        setFeed(items.slice(0, 60));
        setFailed(null);
      })
      .catch((error: unknown) => alive && setFailed(socialErrorMessage(error)));
    return () => {
      alive = false;
    };
  }, [list, isOnline, friends.status]);

  return (
    <section
      id="panel-activity"
      role="tabpanel"
      aria-labelledby="tab-activity"
      className="animate-fade-in space-y-3 px-4 pt-4 pb-6"
    >
      {failed && <InlineNotice tone="error">{failed}</InlineNotice>}
      {list.length === 0 && friends.status === 'ready' ? (
        <EmptyState
          icon={Activity}
          title="Nada por aqui ainda"
          message="Adicione amigos na aba Amigos para ver os treinos deles."
        />
      ) : feed === null && !failed ? (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </>
      ) : feed && feed.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino recente"
          message={
            sharing.length === 0
              ? 'Seus amigos não compartilham os treinos.'
              : `Seus amigos não treinaram nos últimos ${ACTIVITY_DAYS} dias.`
          }
        />
      ) : (
        (feed ?? []).map(({ friend, workout }) => {
          const who = friend.name || `@${friend.username}`;
          const names = workout.exercises.map((e) => e.exerciseName);
          return (
            <button
              key={`${friend.userId}-${workout.id}`}
              type="button"
              onClick={() => push({ name: 'friend', userId: friend.userId })}
              className="pressable block w-full rounded-lg border border-line bg-surface p-4 text-left"
            >
              <span className="flex items-center gap-3">
                <Avatar name={who} photoUrl={friend.photoUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="text-callout block truncate">
                    <span className="font-semibold">{who}</span> treinou{' '}
                    <span className="font-semibold">{workout.name}</span>
                  </span>
                  <span className="text-footnote block text-ink-2">
                    {formatRelativeDay(workout.completedAt)},{' '}
                    {formatTime(workout.completedAt)}
                  </span>
                </span>
                {workout.prsAchieved.length > 0 && (
                  <Badge tone="record">
                    {workout.prsAchieved.length}{' '}
                    {workout.prsAchieved.length === 1 ? 'recorde' : 'recordes'}
                  </Badge>
                )}
              </span>
              <span className="text-footnote mt-3 flex gap-4 text-ink-2 tabular">
                <span>{formatDurationMinutes(workout.durationMinutes)}</span>
                <span>{formatCompact(workout.totalVolumeKg)} kg</span>
                <span>
                  {workout.totalSets}{' '}
                  {workout.totalSets === 1 ? 'série' : 'séries'}
                </span>
              </span>
              {names.length > 0 && (
                <span className="text-footnote mt-1 block truncate text-ink-3">
                  {names.slice(0, 4).join(' · ')}
                  {names.length > 4 && ` +${names.length - 4}`}
                </span>
              )}
            </button>
          );
        })
      )}
    </section>
  );
}

type Period = '7' | '30';

function RankingPanel({ friends }: { friends: FriendsState }) {
  const { history, userProfile, isOnline } = useAppStore();
  const photo = useProfilePhoto();
  const { push } = useNavigation();
  const [period, setPeriod] = useState<Period>('7');
  const [workouts, setWorkouts] = useState<Map<
    string,
    CompletedWorkout[]
  > | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const sharing = useMemo(
    () => friends.lists.friends.filter((link) => link.other.shareStats),
    [friends.lists.friends],
  );
  const sharingKey = sharing.map((link) => link.other.userId).join(',');

  useEffect(() => {
    if (!isOnline || friends.status !== 'ready') return;
    let alive = true;
    const since = addDays(startOfDay(new Date()), -30);
    fetchFriendWorkouts(sharingKey ? sharingKey.split(',') : [], since)
      .then((found) => {
        if (!alive) return;
        setWorkouts(found);
        setFailed(null);
      })
      .catch((error: unknown) => alive && setFailed(socialErrorMessage(error)));
    return () => {
      alive = false;
    };
  }, [sharingKey, isOnline, friends.status]);

  const ranking = useMemo(() => {
    const since = addDays(startOfDay(new Date()), -(Number(period) - 1));
    return buildRanking(
      [
        {
          userId: 'me',
          name: userProfile.name,
          photoUrl: photo,
          me: true,
          history,
        },
        ...sharing.map((link) => ({
          userId: link.other.userId,
          name: link.other.name || `@${link.other.username}`,
          photoUrl: link.other.photoUrl,
          me: false,
          history: workouts?.get(link.other.userId) ?? [],
        })),
      ],
      since,
    );
  }, [history, period, photo, sharing, userProfile.name, workouts]);

  const hidden = friends.lists.friends.length - sharing.length;

  return (
    <section
      id="panel-ranking"
      role="tabpanel"
      aria-labelledby="tab-ranking"
      className="animate-fade-in pt-4 pb-6"
    >
      <div className="flex items-end justify-between gap-3 px-4 pb-3">
        <div>
          <h2 className="text-headline font-semibold">Ranking de volume</h2>
          <p className="text-footnote text-ink-2">
            Séries de trabalho suas e dos seus amigos
          </p>
        </div>
        <SegmentedControl
          label="Período do ranking"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: '7 dias' },
            { value: '30', label: '30 dias' },
          ]}
        />
      </div>
      {failed && (
        <div className="px-4 pb-3">
          <InlineNotice tone="error">{failed}</InlineNotice>
        </div>
      )}
      <ol className="divide-y divide-line bg-surface">
        {ranking.map((athlete, index) => {
          const content = (
            <>
              <span
                className={cx(
                  'text-footnote grid size-7 shrink-0 place-items-center rounded-full font-bold tabular',
                  athlete.volumeKg > 0
                    ? (PODIUM[index] ?? 'bg-raised text-ink-2')
                    : 'bg-raised text-ink-2',
                )}
                aria-label={`${index + 1}º lugar`}
              >
                {index + 1}
              </span>
              <Avatar
                name={athlete.name}
                photoUrl={athlete.photoUrl}
                size={40}
              />
              <span className="min-w-0 flex-1 text-left">
                <span className="text-body block truncate font-medium">
                  {athlete.me ? 'Você' : athlete.name}
                </span>
                <span className="text-footnote block text-ink-2">
                  {formatNumber(athlete.workouts, 0)}{' '}
                  {athlete.workouts === 1 ? 'treino' : 'treinos'}
                </span>
              </span>
              <span className="text-body shrink-0 text-ink-2 tabular">
                {!athlete.me && workouts === null ? (
                  <Spinner size={16} />
                ) : (
                  `${formatCompact(athlete.volumeKg)} kg`
                )}
              </span>
            </>
          );
          return (
            <li
              key={athlete.userId}
              className={cx(athlete.me && 'bg-brand-soft')}
            >
              {athlete.me ? (
                <div className="flex items-center gap-3 px-4 py-3">
                  {content}
                </div>
              ) : (
                <button
                  type="button"
                  className="pressable flex w-full items-center gap-3 px-4 py-3"
                  onClick={() =>
                    push({ name: 'friend', userId: athlete.userId })
                  }
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {friends.lists.friends.length === 0 && friends.status === 'ready' && (
        <p className="text-footnote px-4 pt-3 text-ink-2">
          Adicione amigos na aba Amigos para disputar o ranking.
        </p>
      )}
      {hidden > 0 && (
        <p className="text-footnote px-4 pt-3 text-ink-3">
          {hidden === 1
            ? '1 amigo não compartilha os treinos e fica fora do ranking.'
            : `${hidden} amigos não compartilham os treinos e ficam fora do ranking.`}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Challenges (still sample data)                                      */
/* ------------------------------------------------------------------ */

function ChallengesPanel() {
  const { social } = useAppStore();
  const toast = useToast();
  return (
    <section
      id="panel-challenges"
      role="tabpanel"
      aria-labelledby="tab-challenges"
      className="animate-fade-in space-y-3 px-4 pt-4 pb-6"
    >
      <InlineNotice tone="info">
        Desafios de demonstração: em breve, disputados com seus amigos.
      </InlineNotice>
      {CHALLENGES.map((challenge) => {
        const joined = social.joinedChallenges.includes(challenge.id);
        return (
          <Card key={challenge.id} as="article" className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="warmup">{challenge.metric}</Badge>
              <span className="text-footnote flex items-center gap-1 text-ink-2">
                <Clock size={14} aria-hidden="true" /> {challenge.daysLeft} dias
                restantes
              </span>
            </div>
            <h3 className="text-headline mt-2 font-semibold">
              {challenge.title}
            </h3>
            <p className="text-callout mt-1 text-ink-2">
              {challenge.description}
            </p>
            <p className="text-footnote mt-2 flex items-center gap-1.5 text-ink-3">
              <Users size={14} aria-hidden="true" />{' '}
              {challenge.participants + (joined ? 1 : 0)} participantes
            </p>
            <Button
              block
              className="mt-4"
              variant={joined ? 'tinted' : 'primary'}
              icon={joined ? Check : undefined}
              aria-pressed={joined}
              onClick={() => {
                actions.toggleChallenge(challenge.id);
                haptic('tap');
                toast({
                  tone: 'success',
                  title: joined
                    ? 'Você saiu do desafio'
                    : 'Inscrição confirmada',
                  description: challenge.title,
                });
              }}
            >
              {joined ? 'Inscrito' : 'Participar'}
            </Button>
          </Card>
        );
      })}
    </section>
  );
}

/** Ends a friendship after asking; shared by the friend page. */
export function useRemoveFriend() {
  const confirm = useConfirm();
  const toast = useToast();
  return async (link: FriendLink): Promise<boolean> => {
    const ok = await confirm({
      title: 'Desfazer amizade?',
      message: `Vocês deixam de ver os treinos um do outro. Dá para adicionar ${
        link.other.name || `@${link.other.username}`
      } de novo depois.`,
      confirmLabel: 'Desfazer',
      tone: 'danger',
      icon: UserCheck,
    });
    if (!ok) return false;
    try {
      await friendActions.remove(link);
      toast({ tone: 'success', title: 'Amizade desfeita' });
      return true;
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
      return false;
    }
  };
}
