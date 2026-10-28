import { useEffect, useState } from 'react';
import { allowsMotion } from '../lib/celebrate';

/**
 * A value that starts at `from` on the first frame and moves to `value` on
 * the next, so a bar or a ring with a CSS transition fills when it appears
 * instead of being born full. The transition itself lives in CSS.
 */
export function useAppear(value: number, from = 0): number {
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

/** A number that counts up from zero when it appears. */
export function CountUp({
  value,
  format,
  durationMs = 900,
}: {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const still = !allowsMotion();
    const tick = (now: number) => {
      const progress = still ? 1 : Math.min(1, (now - start) / durationMs);
      // Ease out: fast at first, settling on the number.
      setShown(value * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
