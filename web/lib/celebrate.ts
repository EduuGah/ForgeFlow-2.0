/*
 * A burst of confetti for a finished workout, a record or a goal.
 *
 * Drawn on a canvas by script, so the CSS "reduce motion" rule would not
 * stop it: it checks the preference itself and does nothing then. The
 * screen still says what happened; confetti is emphasis, not information.
 */

/** False when the person asked for less motion, or when it can't be told. */
export function allowsMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  color: string;
  round: boolean;
}

/** How long a burst lasts; the last part fades out. */
const DURATION_MS = 2700;
const FADE_MS = 700;
/** Physics steps are tuned for 60 fps; other refresh rates scale them. */
const FRAME_MS = 1000 / 60;

export function celebrate(strength: 'light' | 'strong' = 'light'): void {
  if (typeof document === 'undefined' || !allowsMotion()) return;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: '90',
  });
  document.body.appendChild(canvas);
  context.scale(ratio, ratio);

  const brand =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--color-brand')
      .trim() || '#ff7a1a';
  const colors = [brand, '#ffd166', '#2fbf71', '#5ec2e6', '#ffffff'];
  // Strong: two cannons from the sides; light: one from the middle.
  const origins =
    strength === 'strong'
      ? [
          { x: width * 0.15, angle: -Math.PI / 3 },
          { x: width * 0.85, angle: (-2 * Math.PI) / 3 },
        ]
      : [{ x: width / 2, angle: -Math.PI / 2 }];
  const perOrigin = strength === 'strong' ? 80 : 90;
  const pieces: Piece[] = origins.flatMap((origin, side) =>
    Array.from({ length: perOrigin }, (_, index) => {
      const angle = origin.angle + (Math.random() - 0.5) * 1.1;
      const speed = 8 + Math.random() * 9;
      return {
        x: origin.x,
        y: height * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        color: colors[(index + side) % colors.length],
        round: Math.random() < 0.3,
      };
    }),
  );

  const start = performance.now();
  let last = start;
  const draw = (now: number) => {
    const elapsed = now - start;
    // Same speed on 60 and 120 Hz screens; a stalled tab doesn't jump.
    const step = Math.min(3, (now - last) / FRAME_MS);
    last = now;
    context.clearRect(0, 0, width, height);
    const fade = Math.min(1, (DURATION_MS - elapsed) / FADE_MS);
    for (const piece of pieces) {
      const drag = 0.985 ** step;
      piece.vy += 0.32 * step;
      piece.vx *= drag;
      piece.vy *= drag;
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      piece.angle += piece.spin * step;
      context.save();
      context.globalAlpha = Math.max(0, fade);
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = piece.color;
      if (piece.round) {
        context.beginPath();
        context.arc(0, 0, piece.size / 2.6, 0, Math.PI * 2);
        context.fill();
      } else {
        // Flutter: the strip turns, so it looks thinner and wider.
        const turn = Math.abs(Math.cos(piece.angle * 2));
        context.fillRect(
          -piece.size / 2,
          (-piece.size / 4) * turn,
          piece.size,
          (piece.size / 2) * turn + 1,
        );
      }
      context.restore();
    }
    if (elapsed < DURATION_MS) requestAnimationFrame(draw);
    else canvas.remove();
  };
  requestAnimationFrame(draw);
}
