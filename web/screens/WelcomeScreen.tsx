import { useState } from 'react';
import { Check, CloudOff, LineChart, Timer } from 'lucide-react';
import { actions } from '../store';
import { describeLoginError, isLoginDismissed } from '../firebase';
import { Button } from '../ui/Button';
import { BrandMark, Medal } from '../ui/Feedback';
import { useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

const DEMO_SETS = [
  {
    label: 'W',
    previous: '40 kg × 10',
    weight: '40',
    reps: '10',
    warmup: true,
  },
  { label: '1', previous: '60 kg × 8', weight: '60', reps: '8' },
  {
    label: '2',
    previous: '60 kg × 8',
    weight: '62,5',
    reps: '8',
    record: true,
  },
];

/** A set table completing itself — the product in one glance. */
function SetTableDemo() {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-pop" aria-hidden="true">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-raised ring-1 ring-line-strong">
          <span className="font-metric text-footnote text-ink-2">PEI</span>
        </span>
        <div>
          <p className="text-headline font-semibold text-brand-ink">
            Supino reto com barra
          </p>
          <p className="text-footnote flex items-center gap-1 text-brand-ink">
            <Timer size={14} /> Descanso: 1min 30s
          </p>
        </div>
      </div>
      <div className="text-micro grid grid-cols-[2.25rem_1fr_3.5rem_3rem_2.75rem] gap-2 px-1 pb-1.5 font-semibold text-ink-3 uppercase">
        <span className="text-center">Série</span>
        <span>Anterior</span>
        <span className="text-center">kg</span>
        <span className="text-center">Reps</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {DEMO_SETS.map((set, index) => {
          const delay = 700 + index * 650;
          return (
            <div
              key={set.label}
              className="strike grid animate-row-done grid-cols-[2.25rem_1fr_3.5rem_3rem_2.75rem] items-center gap-2 rounded-md px-1 py-1"
              style={{
                animationDelay: `${delay}ms`,
                ['--strike-delay' as string]: `${delay}ms`,
              }}
            >
              <span
                className={cx(
                  'grid h-9 place-items-center rounded-sm bg-raised font-semibold',
                  set.warmup ? 'text-warmup' : 'text-ink',
                )}
              >
                {set.label}
              </span>
              <span className="text-callout truncate text-ink-3">
                {set.previous}
              </span>
              <span className="text-body grid h-9 place-items-center rounded-sm bg-raised font-semibold tabular">
                {set.weight}
              </span>
              <span className="text-body grid h-9 place-items-center rounded-sm bg-raised font-semibold tabular">
                {set.reps}
              </span>
              <span className="relative grid h-9 place-items-center">
                <span
                  className="grid size-9 animate-pop place-items-center rounded-sm bg-success text-white"
                  style={{ animationDelay: `${delay}ms` }}
                >
                  <Check size={18} strokeWidth={3} />
                </span>
                {set.record && (
                  <span
                    className="absolute -top-2 -right-1 animate-medal"
                    style={{ animationDelay: `${delay + 250}ms` }}
                  >
                    <Medal size={20} />
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PROMISES = [
  { icon: Timer, text: 'Séries, cargas e descanso registrados em segundos' },
  { icon: LineChart, text: 'Recordes pessoais e evolução por exercício' },
  { icon: CloudOff, text: 'Funciona sem internet e sincroniza depois' },
];

export function WelcomeScreen() {
  const toast = useToast();
  const [signingIn, setSigningIn] = useState(false);

  const signIn = async () => {
    setSigningIn(true);
    try {
      await actions.login();
    } catch (error) {
      if (!isLoginDismissed(error))
        toast({ tone: 'error', title: describeLoginError(error) });
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="app-column pt-safe flex min-h-dvh flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <header className="flex items-center gap-2.5 pt-5">
          <BrandMark size={32} />
          <span className="font-metric text-metric-sm tracking-[0.14em]">
            FORGEFLOW
          </span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <SetTableDemo />
          <h1 className="text-title-lg mt-9 font-bold">Cada série conta.</h1>
          <p className="text-body mt-2 text-ink-2">
            O diário de treino para quem leva força a sério: registre, bata
            recordes e veja sua evolução.
          </p>
          <ul className="mt-6 space-y-3" role="list">
            {PROMISES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="text-callout flex items-center gap-3 text-ink"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                  <Icon size={16} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </main>

        <footer className="space-y-3">
          <Button size="lg" block loading={signingIn} onClick={signIn}>
            Entrar com Google
          </Button>
          <Button
            size="lg"
            variant="secondary"
            block
            disabled={signingIn}
            onClick={actions.completeOnboarding}
          >
            Continuar sem conta
          </Button>
          <p className="text-footnote pt-1 text-center text-ink-3">
            Sem conta, seus dados ficam salvos apenas neste aparelho.
          </p>
        </footer>
      </div>
    </div>
  );
}
