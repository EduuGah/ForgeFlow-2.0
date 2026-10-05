import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { exerciseMedia } from '../data/exerciseMedia';
import { cx } from '../ui/core';

/**
 * Start and end photos of the movement alternating like a GIF. Renders
 * nothing for exercises without photos (custom) or if the photos fail to load,
 * so callers can fall back to the muscle tag.
 */
export function ExerciseAnimation({
  exerciseId,
  name,
  className,
}: {
  exerciseId: string;
  name: string;
  className?: string;
}) {
  const media = exerciseMedia(exerciseId);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  if (!media || failed) return null;

  return (
    <figure
      className={cx(
        'relative overflow-hidden rounded-lg border border-line bg-white',
        className,
      )}
    >
      <div
        role="img"
        aria-label={`Demonstração de ${name}: posição inicial e final`}
        className="relative aspect-[3/2]"
      >
        <img
          src={media.start}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-contain"
        />
        <img
          src={media.end}
          alt=""
          decoding="async"
          onError={() => setFailed(true)}
          className={cx(
            'ex-swap absolute inset-0 size-full object-contain opacity-0',
            paused && '[animation-play-state:paused]',
          )}
        />
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? 'Retomar animação' : 'Pausar animação'}
        className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm active:bg-black/70"
      >
        {paused ? (
          <Play size={16} aria-hidden="true" />
        ) : (
          <Pause size={16} aria-hidden="true" />
        )}
      </button>
    </figure>
  );
}
