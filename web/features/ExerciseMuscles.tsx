import { useState } from 'react';
import { HeartPulse, Info } from 'lucide-react';
import { SYNERGIST_GLOW, exerciseIntensity } from '../lib/bodyMap';
import { isCardio, muscleLabel } from '../lib/training';
import { BodyMap } from '../ui/BodyMap';
import { cx } from '../ui/core';

/*
 * The muscles one exercise works, at a glance: the main one in strong color
 * and the ones that help it (synergists) in a soft one, on the body map and
 * in a two-line legend.
 */

function Swatch({ glow }: { glow: number }) {
  return (
    <span
      className="mt-1 size-2.5 shrink-0 rounded-full bg-brand"
      style={{ opacity: glow }}
      aria-hidden="true"
    />
  );
}

export function ExerciseMuscles({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary: string[];
  className?: string;
}) {
  const [explain, setExplain] = useState(false);

  if (isCardio(primary))
    return (
      <div
        className={cx(
          'flex items-center gap-3 rounded-lg border border-line p-3',
          className,
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
          <HeartPulse size={20} aria-hidden="true" />
        </span>
        <p className="text-callout min-w-0">
          <span className="block font-semibold">Cardio</span>
          <span className="text-footnote block text-ink-2">
            Coração e pulmões. Registre tempo e distância em vez de carga.
          </span>
        </p>
      </div>
    );

  const helpers = secondary.map(muscleLabel);
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-lg border border-line p-3',
        className,
      )}
    >
      <BodyMap
        intensity={exerciseIntensity(primary, secondary)}
        height={118}
        captions={false}
        label={`Principal: ${muscleLabel(primary)}${helpers.length ? `. Sinergia: ${helpers.join(', ')}` : ''}`}
      />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex gap-2">
          <Swatch glow={1} />
          <p className="min-w-0">
            <span className="text-micro block font-semibold tracking-wider text-ink-3 uppercase">
              Principal
            </span>
            <span className="text-callout block font-semibold">
              {muscleLabel(primary)}
            </span>
          </p>
        </div>
        {helpers.length > 0 && (
          <div className="flex gap-2">
            <Swatch glow={SYNERGIST_GLOW} />
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setExplain(!explain)}
                aria-expanded={explain}
                className="text-micro flex items-center gap-1 font-semibold tracking-wider text-ink-3 uppercase"
              >
                Sinergia
                <Info size={12} aria-hidden="true" />
              </button>
              <span className="text-callout block">{helpers.join(' · ')}</span>
            </div>
          </div>
        )}
        {explain && (
          <p className="text-footnote animate-fade-in text-ink-2">
            Sinergistas ajudam o músculo principal a fazer o movimento. Nas
            séries semanais, cada série conta meia para eles.
          </p>
        )}
      </div>
    </div>
  );
}
