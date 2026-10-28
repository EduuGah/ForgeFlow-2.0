import { useState } from 'react';
import { Check, FlaskConical, Users, X } from 'lucide-react';
import { useStoreValue } from '../store';
import { formatWeight } from '../lib/format';
import { haptic } from '../lib/haptics';
import type { LiveWorkout, SocialProfile } from '../lib/friends';
import { sendMessage } from '../social';
import { Button } from '../ui/Button';
import { Avatar, InlineNotice, ProgressBar } from '../ui/Feedback';
import { Sheet, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { duoActions, duoCandidates, useDuo } from './duoSession';
import { useFriends } from './useFriends';

function nameOf(person: SocialProfile | null): string {
  return person ? person.name || `@${person.username}` : 'Seu amigo';
}

/* ------------------------------------------------------------------ */
/* Inviting                                                            */
/* ------------------------------------------------------------------ */

export function DuoInviteSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const friends = useFriends();
  const [busy, setBusy] = useState<string | null>(null);
  const people = open ? duoCandidates() : [];

  const invite = async (person: SocialProfile) => {
    setBusy(person.userId);
    try {
      await duoActions.invite(person);
      haptic('success');
      toast({
        tone: 'success',
        title: 'Convite enviado',
        description: `Quando ${nameOf(person)} aceitar, vocês se veem aqui.`,
      });
      onClose();
    } catch (error) {
      console.warn('ForgeFlow dupla:', error);
      toast({
        tone: 'error',
        title: 'Não foi possível convidar',
        description: 'Rode o supabase-schema.sql atualizado ou tente de novo.',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Treinar junto"
      description="Vocês acompanham as séries um do outro ao vivo, cada um no seu celular."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            duoActions.startDemo();
            haptic('success');
            onClose();
          }}
          className="pressable flex w-full items-center gap-3 rounded-lg border border-dashed border-brand bg-brand-soft p-3 text-left"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
            <FlaskConical size={18} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-body block font-semibold">
              Parceiro de teste
            </span>
            <span className="text-footnote block text-ink-2">
              Simulação: ele faz uma série a cada 10 segundos, para você ver
              como funciona.
            </span>
          </span>
        </button>

        {!friends.me ? (
          <InlineNotice tone="info">
            Para treinar com um amigo de verdade, entre na Comunidade e adicione
            amigos.
          </InlineNotice>
        ) : people.length === 0 ? (
          <InlineNotice tone="info">
            Nenhum amigo compartilhando treinos ainda. Adicione amigos na
            Comunidade.
          </InlineNotice>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {people.map((person) => (
              <li key={person.userId}>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void invite(person)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-raised disabled:opacity-60"
                >
                  <Avatar
                    name={nameOf(person)}
                    photoUrl={person.photoUrl}
                    size={36}
                  />
                  <span className="text-body min-w-0 flex-1 truncate">
                    {nameOf(person)}
                  </span>
                  <span className="text-footnote font-semibold text-brand-ink">
                    {busy === person.userId ? 'Enviando…' : 'Convidar'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* An invitation received                                              */
/* ------------------------------------------------------------------ */

export function DuoInviteBanner({ className }: { className?: string }) {
  const duo = useDuo();
  const toast = useToast();
  const training = useStoreValue((state) => state.activeWorkout !== null);
  if (!duo.invite) return null;
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border border-brand bg-brand-soft p-3',
        className,
      )}
      role="status"
    >
      <Avatar
        name={nameOf(duo.inviter)}
        photoUrl={duo.inviter?.photoUrl}
        size={40}
      />
      <p className="text-callout min-w-0 flex-1">
        <span className="font-semibold">{nameOf(duo.inviter)}</span> te chamou
        para treinar junto
      </p>
      <Button
        size="sm"
        icon={Check}
        onClick={async () => {
          try {
            await duoActions.accept();
            haptic('success');
            toast({
              tone: 'success',
              title: 'Treino em dupla',
              description: training
                ? 'Veja o treino dele no topo do seu treino.'
                : 'Comece seu treino: vocês se veem na tela do treino.',
            });
          } catch {
            toast({ tone: 'error', title: 'Não foi possível aceitar' });
          }
        }}
      >
        Aceitar
      </Button>
      <button
        type="button"
        aria-label="Recusar"
        onClick={() => void duoActions.decline()}
        className="grid size-9 place-items-center rounded-full text-ink-2 active:bg-raised"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inside the workout                                                  */
/* ------------------------------------------------------------------ */

function lastSet(live: LiveWorkout | null): string | null {
  const exercises = live?.detail?.e ?? [];
  for (let i = exercises.length - 1; i >= 0; i -= 1) {
    const set = exercises[i].s.at(-1);
    // Numbers first: a long exercise name is what gets cut.
    if (set)
      return `${set[0] > 0 ? `${formatWeight(set[0])} kg × ` : ''}${set[1]} · ${exercises[i].n}`;
  }
  return null;
}

function currentLine(live: LiveWorkout): string {
  const exercise = live.detail?.e.find((item) => item.s.length < item.t);
  if (!exercise) return 'Terminou as séries';
  return `${exercise.n} · série ${exercise.s.length + 1} de ${exercise.t}`;
}

const CHEERS = [
  '💪 Força!',
  '🔥 Bora!',
  '⏱️ Acabou o descanso?',
  '👏 Boa série!',
];

export function DuoPanel() {
  const duo = useDuo();
  const toast = useToast();
  const self = useStoreValue((state) => state.currentUser?.uid ?? null);
  const [details, setDetails] = useState(false);
  const live = duo.partnerLive;
  // A cheer pops after the partner finishes a set.
  const [flash, setFlash] = useState(0);
  const done = live?.doneSets ?? 0;
  const [lastDone, setLastDone] = useState(done);
  if (done !== lastDone) {
    setLastDone(done);
    if (done > lastDone) setFlash((value) => value + 1);
  }
  if (!duo.session && !duo.demo) return null;
  const name = nameOf(duo.partner);

  if (duo.session?.status === 'invited')
    return (
      <section className="flex items-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface p-3">
        <Users size={18} className="shrink-0 text-ink-2" aria-hidden="true" />
        <p className="text-callout min-w-0 flex-1 text-ink-2">
          Esperando <span className="font-semibold text-ink">{name}</span>{' '}
          aceitar o convite…
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void duoActions.end()}
        >
          Cancelar
        </Button>
      </section>
    );

  const cheer = async (text: string) => {
    haptic('tap');
    if (duo.demo || !self || !duo.partner) {
      toast({ title: `Enviado: ${text}`, description: 'Simulação' });
      return;
    }
    try {
      await sendMessage(self, duo.partner.userId, text);
      toast({ tone: 'success', title: `Enviado para ${name}` });
    } catch {
      toast({ tone: 'error', title: 'Não foi possível enviar' });
    }
  };

  return (
    <section
      aria-label={`Treino em dupla com ${name}`}
      className="rounded-lg border border-brand bg-surface p-3"
    >
      <div className="flex items-center gap-3">
        <span className="relative">
          <Avatar name={name} photoUrl={duo.partner?.photoUrl} size={40} />
          <span
            className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface bg-success"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-micro font-semibold tracking-wider text-brand-ink uppercase">
            Treinando junto{duo.demo ? ' · teste' : ''}
          </p>
          <p className="text-body truncate font-semibold">{name}</p>
        </div>
        <button
          type="button"
          onClick={() => void duoActions.end()}
          className="text-footnote font-semibold text-ink-3"
        >
          Encerrar
        </button>
      </div>

      {live ? (
        <>
          <p className="text-callout mt-2 truncate">{currentLine(live)}</p>
          <ProgressBar
            value={live.totalSets ? (live.doneSets / live.totalSets) * 100 : 0}
            label={`${live.doneSets} de ${live.totalSets} séries`}
            thickness="sm"
            className="mt-1.5"
          />
          <p className="text-footnote mt-1.5 flex items-center justify-between gap-2 text-ink-2 tabular">
            <span className="truncate">
              {lastSet(live) ? (
                <span key={flash} className="inline-block animate-pop">
                  ✓ {lastSet(live)}
                </span>
              ) : (
                'Ainda não fez nenhuma série'
              )}
            </span>
            <span className="shrink-0">
              {live.doneSets}/{live.totalSets} séries
            </span>
          </p>
        </>
      ) : (
        <p className="text-footnote mt-2 text-ink-2">
          {name} ainda não começou o treino. Assim que começar, aparece aqui.
        </p>
      )}

      <div className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
        {live && (
          <button
            type="button"
            onClick={() => setDetails(true)}
            className="pressable text-footnote h-8 shrink-0 rounded-full bg-brand-soft px-3 font-semibold text-brand-ink"
          >
            Ver treino
          </button>
        )}
        {CHEERS.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => void cheer(text)}
            className="pressable text-footnote h-8 shrink-0 rounded-full bg-raised px-3 font-semibold text-ink-2"
          >
            {text}
          </button>
        ))}
      </div>
      <PartnerWorkoutSheet
        open={details}
        onClose={() => setDetails(false)}
        name={name}
        live={live}
      />
    </section>
  );
}

function PartnerWorkoutSheet({
  open,
  onClose,
  name,
  live,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  live: LiveWorkout | null;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Treino de ${name}`}
      description={live?.name}
    >
      {!live?.detail ? (
        <p className="text-callout text-ink-2">Sem séries ainda.</p>
      ) : (
        <ul className="space-y-3">
          {live.detail.e.map((exercise, index) => (
            <li
              key={`${exercise.n}-${index}`}
              className="rounded-lg border border-line p-3"
            >
              <p className="text-callout flex justify-between gap-2 font-semibold">
                <span className="truncate">{exercise.n}</span>
                <span className="shrink-0 text-ink-3 tabular">
                  {exercise.s.length}/{exercise.t}
                </span>
              </p>
              {exercise.s.length > 0 && (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {exercise.s.map(([kg, reps], set) => (
                    <li
                      key={set}
                      className="text-footnote rounded-md bg-brand-soft px-2 py-1 font-semibold text-brand-ink tabular"
                    >
                      {kg > 0 ? `${formatWeight(kg)} kg × ` : ''}
                      {reps}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
