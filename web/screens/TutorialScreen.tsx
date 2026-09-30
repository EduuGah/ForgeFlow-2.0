import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, FileUp } from 'lucide-react';
import { useNavigation } from '../navigation/Navigator';
import {
  ImportDemo,
  ProgressDemo,
  RestRingDemo,
  SetTableDemo,
} from '../features/Demos';
import { Button, IconButton } from '../ui/Button';
import { cx, useBackLayer, useScrollLock } from '../ui/core';

interface Slide {
  title: string;
  text: string;
  demo: ReactNode;
}

const SLIDES: Slide[] = [
  {
    title: 'Registre cada série em segundos',
    text: 'Digite carga e repetições e toque em ✓. A coluna “Última vez” mostra o que você fez no treino anterior; aquecimentos aparecem como “A” e não contam no volume.',
    demo: <SetTableDemo loopMs={6000} />,
  },
  {
    title: 'O descanso corre sozinho',
    text: 'Ao concluir uma série, o cronômetro começa. Ajuste de 15 em 15 segundos e acompanhe o anel no botão Treinar, de qualquer tela.',
    demo: <RestRingDemo />,
  },
  {
    title: 'Veja sua evolução',
    text: 'Na aba Evolução você acompanha volume, duração e repetições por período. Recordes de carga e de 1RM estimado são detectados na hora.',
    demo: <ProgressDemo loopMs={6000} />,
  },
  {
    title: 'Seus dados, do seu jeito',
    text: 'Tudo funciona sem internet e sincroniza quando a conexão volta. Vindo de outro app? Importe seu histórico em CSV e continue de onde parou.',
    demo: <ImportDemo loopMs={7000} />,
  },
];

export function TutorialScreen({ onDone }: { onDone: () => void }) {
  const { push } = useNavigation();
  const [index, setIndex] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const last = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  useScrollLock(true);
  useBackLayer(true, onDone);

  const go = (next: number) =>
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, next)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight')
        setIndex((value) => Math.min(SLIDES.length - 1, value + 1));
      else if (event.key === 'ArrowLeft')
        setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="fixed inset-0 z-[70] flex animate-fade-in flex-col bg-canvas"
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const delta = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) > 60) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="app-column pt-safe flex w-full flex-1 flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4 pt-4">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {SLIDES.map((item, i) => (
              <span
                key={item.title}
                className="h-1 flex-1 overflow-hidden rounded-full bg-raised"
              >
                <span
                  className={cx(
                    'block h-full rounded-full bg-brand transition-transform duration-500 ease-standard',
                    i <= index ? 'translate-x-0' : '-translate-x-full',
                  )}
                />
              </span>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={onDone} className="-mr-2">
            Pular
          </Button>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div
            className="ember-glow pointer-events-none absolute inset-x-[-2.5rem] inset-y-0"
            aria-hidden="true"
          />
          <div key={index} className="relative w-full max-w-sm animate-rise">
            {slide.demo}
          </div>
        </div>

        <div key={`text-${index}`} className="animate-rise" aria-live="polite">
          <p className="text-footnote font-semibold text-brand-ink">
            {index + 1} de {SLIDES.length}
          </p>
          <h1 id="tutorial-title" className="text-title-lg mt-1 font-bold">
            {slide.title}
          </h1>
          <p className="text-body mt-2 min-h-[4.125rem] text-ink-2">
            {slide.text}
          </p>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {index > 0 && (
            <IconButton
              icon={ArrowLeft}
              label="Anterior"
              variant="raised"
              onClick={() => go(index - 1)}
            />
          )}
          <div className="min-w-0 flex-1">
            {last ? (
              <Button size="lg" block onClick={onDone} autoFocus>
                Começar a treinar
              </Button>
            ) : (
              <Button
                size="lg"
                block
                trailingIcon={ArrowRight}
                onClick={() => go(index + 1)}
                autoFocus
              >
                Próximo
              </Button>
            )}
          </div>
        </div>
        {last && (
          <Button
            variant="ghost"
            block
            icon={FileUp}
            className="mt-2"
            onClick={() => {
              onDone();
              push({ name: 'import' });
            }}
          >
            Importar histórico agora
          </Button>
        )}
      </div>
    </div>
  );
}
