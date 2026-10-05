import { CloudOff, FileUp, LineChart } from 'lucide-react';
import { actions } from '../store';
import { SetTableDemo } from '../features/Demos';
import { GoogleButton, useGoogleSignIn } from '../features/GoogleSignIn';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/Feedback';
import { useMediaQuery } from '../ui/core';

const PROMISES = [
  { icon: LineChart, text: 'Recordes automáticos' },
  { icon: CloudOff, text: 'Funciona offline' },
  { icon: FileUp, text: 'Importa seu histórico' },
];

export function WelcomeScreen() {
  const { signIn, signingIn } = useGoogleSignIn();
  const desktop = useMediaQuery('(min-width: 64rem)');

  const demo = (
    <div className="relative">
      <div
        className="ember-glow pointer-events-none absolute -inset-x-10 -inset-y-12"
        aria-hidden="true"
      />
      <SetTableDemo loopMs={7000} className="relative" />
    </div>
  );

  const intro = (
    <>
      <h1 className="text-display mt-7 font-bold lg:mt-0 lg:text-[3.5rem] lg:leading-[1.05]">
        Cada série <span className="text-brand-ink">conta.</span>
      </h1>
      <p className="text-body mt-2 text-ink-2 lg:mt-4 lg:text-lg">
        Seu diário de musculação: registre cargas em segundos, bata recordes e
        veja a evolução de cada exercício.
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5" role="list">
        {PROMISES.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="text-caption inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 font-medium"
          >
            <Icon size={13} className="text-brand-ink" aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>
    </>
  );

  const login = (
    <footer className="rounded-2xl border border-line bg-surface p-4 shadow-pop lg:p-5">
      <h2 className="text-headline font-semibold">Entre para começar</h2>
      <p className="text-footnote mt-0.5 mb-3.5 text-ink-2">
        Com a conta Google, seus treinos ficam salvos na nuvem e em todos os
        seus aparelhos.
      </p>
      <GoogleButton onClick={signIn} loading={signingIn} />
      <div
        className="text-caption my-2.5 flex items-center gap-3 text-ink-3"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>
      <Button
        size="lg"
        variant="secondary"
        block
        disabled={signingIn}
        onClick={actions.completeOnboarding}
      >
        Usar sem conta
      </Button>
      <p className="text-caption mt-2.5 text-center text-ink-3">
        Sem conta, os dados ficam só neste aparelho. Dá para entrar depois pelo
        Perfil.
      </p>
    </footer>
  );

  return (
    <div className="relative min-h-dvh overflow-hidden bg-canvas">
      <div className="app-column pt-safe relative flex min-h-dvh flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:max-w-[1120px] lg:px-10">
        <header className="flex items-center gap-2.5 pt-4">
          <BrandMark size={34} />
          <span className="text-title font-bold tracking-tight">ForgeFlow</span>
        </header>

        {desktop ? (
          // Desktop: the pitch and the sign-in on the left, the live demo on
          // the right.
          <main className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,30rem)] items-center gap-16 py-10">
            <div className="max-w-xl">
              {intro}
              <div className="mt-8 max-w-md">{login}</div>
            </div>
            {demo}
          </main>
        ) : (
          <>
            <main className="flex flex-1 flex-col justify-center py-5">
              {demo}
              {intro}
            </main>
            {login}
          </>
        )}
      </div>
    </div>
  );
}
