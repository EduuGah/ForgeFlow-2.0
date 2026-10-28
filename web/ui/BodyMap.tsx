import type { BodyRegion } from '../lib/bodyMap';
import { cx } from './core';

/*
 * The body map: a front and a back figure whose muscles light up with the
 * theme colour as they are worked. Each figure is drawn as its left half
 * and mirrored. Decorative unless given a `label`; the lists next to it
 * carry the numbers.
 */

const SILHOUETTE =
  'M60 36 L46 37 C38 38 31 41 28 48 C25 55 25 63 24 70 C22 82 20 96 19 108 C18 116 17 124 18 130 L22 131 C24 124 26 116 28 108 C31 98 33 88 35 80 L38 72 C39 84 40 96 41 108 C41 112 40 116 40 120 C39 140 40 160 41 176 C41 196 42 214 43 236 L52 236 C53 216 55 196 56 178 C57 160 58 140 59 124 L60 124 Z';

type Muscle = [BodyRegion, string];

const FRONT: Muscle[] = [
  [
    'delts',
    'M30 46 C34 40 42 38 46 40 C44 46 41 51 36 55 C33 57 29 58 27 59 C27 54 28 50 30 46 Z',
  ],
  [
    'chest',
    'M47 41 C52 40 57 40 59.5 41 L59.5 62 C55 65 49 65 44 62 C41 58 40 53 42 48 C43 45 45 42 47 41 Z',
  ],
  [
    'biceps',
    'M27 62 C30 60 34 59 36 61 C36 68 35 76 32 82 C30 84 27 84 25 83 C24 76 25 68 27 62 Z',
  ],
  [
    'forearms',
    'M24 87 C27 86 31 86 32 88 C31 98 28 108 24 118 C22 119 20 119 19 118 C19 108 21 96 24 87 Z',
  ],
  [
    'abs',
    'M52 67 H59.5 V75 H52 Z M52 77 H59.5 V85 H52 Z M52 87 H59.5 V95 H52 Z M52.5 97 H59.5 V107 C56 107 53.5 105 52.5 102 Z',
  ],
  [
    'obliques',
    'M43 66 C46 67 49 68 50 69 L50 104 C47 104 44 102 42 98 C41 88 41 76 43 66 Z',
  ],
  [
    'quads',
    'M42 122 C46 119 52 119 57 121 C58 134 57 150 55 166 C52 170 47 170 44 167 C41 152 40 136 42 122 Z',
  ],
  [
    'shins',
    'M44 182 C47 180 51 180 53 182 C53 196 52 212 50 226 L46 226 C44 212 43 196 44 182 Z',
  ],
];

const BACK: Muscle[] = [
  [
    'traps',
    'M48 32 C53 33 57 35 59.5 36 L59.5 50 C55 47 50 45 44 43 C41 42 38 41 36 41 C40 37 44 33 48 32 Z',
  ],
  [
    'rearDelts',
    'M30 46 C34 41 38 41 42 43 C42 48 40 52 36 55 C33 57 29 58 27 59 C27 54 28 50 30 46 Z',
  ],
  [
    'midBack',
    'M45 46 C50 47 55 49 59.5 52 L59.5 74 C55 70 50 64 46 58 C44 54 44 50 45 46 Z',
  ],
  [
    'lats',
    'M42 58 C45 62 50 68 55 74 C55 84 52 94 48 102 C45 100 42 94 41 86 C40 76 40 66 42 58 Z',
  ],
  [
    'lowerBack',
    'M53 80 C55 82 58 84 59.5 85 L59.5 110 C56 110 53 108 51 106 C52 98 52 88 53 80 Z',
  ],
  [
    'triceps',
    'M27 61 C30 59 34 59 36 61 C36 69 34 77 31 83 C29 84 26 84 25 83 C24 75 25 67 27 61 Z',
  ],
  [
    'forearms',
    'M24 87 C27 86 31 86 32 88 C31 98 28 108 24 118 C22 119 20 119 19 118 C19 108 21 96 24 87 Z',
  ],
  [
    'glutes',
    'M43 112 C47 110 54 110 59.5 112 L59.5 132 C56 136 50 137 45 134 C41 130 40 120 43 112 Z',
  ],
  [
    'hamstrings',
    'M42 140 C46 139 52 139 57 141 C57 152 56 162 54 172 C51 175 47 175 44 172 C42 162 41 150 42 140 Z',
  ],
  [
    'calves',
    'M44 180 C47 177 52 177 54 180 C55 190 54 202 51 212 C49 214 46 214 45 212 C43 202 42 190 44 180 Z',
  ],
];

function Half({
  muscles,
  intensity,
}: {
  muscles: Muscle[];
  intensity: Partial<Record<BodyRegion, number>>;
}) {
  return (
    <>
      <path d={SILHOUETTE} fill="var(--color-raised)" />
      {muscles.map(([region, d]) => (
        <g key={region}>
          <path
            d={d}
            fill="var(--color-overlay)"
            stroke="var(--color-surface)"
            strokeWidth="1.2"
          />
          <path
            d={d}
            fill="var(--color-brand)"
            style={{
              fillOpacity: intensity[region] ?? 0,
              transition: 'fill-opacity 600ms var(--ease-decelerate)',
            }}
          />
        </g>
      ))}
    </>
  );
}

function Figure({
  muscles,
  intensity,
  height,
  caption,
}: {
  muscles: Muscle[];
  intensity: Partial<Record<BodyRegion, number>>;
  height: number;
  caption?: string;
}) {
  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 120 250"
        height={height}
        width={(height * 120) / 250}
        aria-hidden="true"
        focusable="false"
      >
        <ellipse
          cx="60"
          cy="18"
          rx="10.5"
          ry="12.5"
          fill="var(--color-raised)"
        />
        <rect
          x="54"
          y="28"
          width="12"
          height="10"
          rx="3"
          fill="var(--color-raised)"
        />
        <Half muscles={muscles} intensity={intensity} />
        <g transform="translate(120 0) scale(-1 1)">
          <Half muscles={muscles} intensity={intensity} />
        </g>
      </svg>
      {caption && (
        <figcaption className="text-micro mt-1 font-semibold tracking-wider text-ink-3 uppercase">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Front and back side by side, lit by `intensity` (0..1 per region). */
export function BodyMap({
  intensity,
  height = 160,
  label,
  captions = true,
  className,
}: {
  intensity: Partial<Record<BodyRegion, number>>;
  height?: number;
  /** Accessible summary; without it the map is decorative. */
  label?: string;
  captions?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cx('flex items-start justify-center gap-2', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Figure
        muscles={FRONT}
        intensity={intensity}
        height={height}
        caption={captions ? 'Frente' : undefined}
      />
      <Figure
        muscles={BACK}
        intensity={intensity}
        height={height}
        caption={captions ? 'Costas' : undefined}
      />
    </div>
  );
}
