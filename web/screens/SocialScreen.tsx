import { useMemo, useState } from 'react';
import { Check, Clock, UserCheck, Users } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import { formatCompact, formatNumber } from '../lib/format';
import { totalsBetween } from '../lib/training';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { Button } from '../ui/Button';
import { Avatar, Badge, InlineNotice } from '../ui/Feedback';
import { Tabs } from '../ui/Form';
import { Card, StackHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

type SocialTab = 'ranking' | 'challenges' | 'friends';

/* Sample athletes: the social backend does not exist yet (see Docs/26-29). */
const ATHLETES = [
  {
    id: 'f-1',
    name: 'Marina Costa',
    username: 'marina.costa',
    volumeKg: 42300,
    workouts: 14,
    pending: false,
  },
  {
    id: 'f-2',
    name: 'Rafael Santos',
    username: 'rafa.santos',
    volumeKg: 58900,
    workouts: 18,
    pending: false,
  },
  {
    id: 'f-3',
    name: 'Beatriz Lima',
    username: 'bia.lima',
    volumeKg: 31200,
    workouts: 12,
    pending: false,
  },
  {
    id: 'f-4',
    name: 'Lucas Almeida',
    username: 'lucas.almeida',
    volumeKg: 19800,
    workouts: 8,
    pending: true,
  },
];

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

export function SocialScreen() {
  const { userProfile, currentUser, history, social } = useAppStore();
  const { pop } = useNavigation();
  const toast = useToast();
  const [tab, setTab] = useState<SocialTab>('ranking');

  const myMonth = useMemo(() => {
    const end = addDays(startOfDay(new Date()), 1);
    return totalsBetween(history, addDays(end, -30), end);
  }, [history]);

  const ranking = useMemo(
    () =>
      [
        ...ATHLETES.filter(
          (athlete) =>
            !athlete.pending || social.acceptedFriends.includes(athlete.id),
        ).map((athlete) => ({
          ...athlete,
          me: false,
        })),
        {
          id: 'me',
          name: userProfile.name,
          username: userProfile.username,
          volumeKg: myMonth.volumeKg,
          workouts: myMonth.workouts,
          pending: false,
          me: true,
        },
      ].sort((a, b) => b.volumeKg - a.volumeKg),
    [myMonth, social.acceptedFriends, userProfile.name, userProfile.username],
  );

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
              { value: 'ranking', label: 'Ranking' },
              { value: 'challenges', label: 'Desafios' },
              { value: 'friends', label: 'Amigos' },
            ]}
          />
        </div>

        <div className="px-4 pt-4">
          <InlineNotice tone="info">
            Atletas e desafios de demonstração — os seus números são reais.
          </InlineNotice>
        </div>

        {tab === 'ranking' && (
          <section
            id="panel-ranking"
            role="tabpanel"
            aria-labelledby="tab-ranking"
            className="animate-fade-in pt-4"
          >
            <div className="px-4 pb-3">
              <h2 className="text-headline font-semibold">
                Ranking — volume em 30 dias
              </h2>
              <p className="text-footnote text-ink-2">
                Soma das séries de trabalho de você e seus amigos
              </p>
            </div>
            <ol className="divide-y divide-line bg-surface">
              {ranking.map((athlete, index) => (
                <li
                  key={athlete.id}
                  className={cx(
                    'flex items-center gap-3 px-4 py-3',
                    athlete.me && 'bg-brand-soft',
                  )}
                >
                  <span
                    className={cx(
                      'text-footnote grid size-7 shrink-0 place-items-center rounded-full font-bold tabular',
                      PODIUM[index] ?? 'bg-raised text-ink-2',
                    )}
                    aria-label={`${index + 1}º lugar`}
                  >
                    {index + 1}
                  </span>
                  <Avatar
                    name={athlete.name}
                    photoUrl={athlete.me ? currentUser?.photoURL : undefined}
                    size={40}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-body flex items-center gap-2 font-medium">
                      <span className="truncate">
                        {athlete.me ? 'Você' : athlete.name}
                      </span>
                    </span>
                    <span className="text-footnote block text-ink-2">
                      {formatNumber(athlete.workouts, 0)}{' '}
                      {athlete.workouts === 1 ? 'treino' : 'treinos'}
                    </span>
                  </span>
                  <span className="text-body shrink-0 text-ink-2 tabular">
                    {formatCompact(athlete.volumeKg)} kg
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === 'challenges' && (
          <section
            id="panel-challenges"
            role="tabpanel"
            aria-labelledby="tab-challenges"
            className="animate-fade-in space-y-3 px-4 pt-4"
          >
            {CHALLENGES.map((challenge) => {
              const joined = social.joinedChallenges.includes(challenge.id);
              return (
                <Card key={challenge.id} as="article" className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="warmup">{challenge.metric}</Badge>
                    <span className="text-footnote flex items-center gap-1 text-ink-2">
                      <Clock size={14} aria-hidden="true" />{' '}
                      {challenge.daysLeft} dias restantes
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
        )}

        {tab === 'friends' && (
          <section
            id="panel-friends"
            role="tabpanel"
            aria-labelledby="tab-friends"
            className="animate-fade-in pt-4"
          >
            <ul className="divide-y divide-line bg-surface" role="list">
              {ATHLETES.map((athlete) => {
                const isFriend =
                  !athlete.pending ||
                  social.acceptedFriends.includes(athlete.id);
                return (
                  <li
                    key={athlete.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar name={athlete.name} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="text-body block truncate font-medium">
                        {athlete.name}
                      </span>
                      <span className="text-footnote block truncate text-ink-2">
                        @{athlete.username}
                      </span>
                    </span>
                    {isFriend ? (
                      <Badge tone="success">
                        <UserCheck size={14} aria-hidden="true" /> Amigo
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          actions.acceptFriend(athlete.id);
                          toast({
                            tone: 'success',
                            title: 'Pedido aceito',
                            description: `${athlete.name} agora é seu amigo.`,
                          });
                        }}
                      >
                        Aceitar
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
