import type { BodyRegion } from '../lib/bodyMap';
import { cx } from './core';

/*
 * The body map: a front and a back figure whose muscles light up with the
 * theme colour as they are worked. Athletic proportions (broad shoulders,
 * V-shaped torso, full limbs), each figure drawn as its left half on a
 * 200 × 400 grid and mirrored. Decorative unless given a `label`; the
 * lists next to it carry the numbers.
 */

/** The whole outline, under the muscles: head to feet, left half. */
const SILHOUETTE = [
  'M100 52 L89 53',
  'C88 60 80 64 70 66',
  'C55 68 44 76 41 91',
  'C38 105 40 119 43 129',
  'C40 141 40 152 42 161',
  'C36 177 32 195 31 213',
  'C30 224 31 234 34 244',
  'C36 252 43 255 46 248',
  'C46 240 46 231 48 223',
  'C54 205 59 187 62 169',
  'C64 158 64 147 64 138',
  'C64 130 65 124 66 118',
  'C67 140 66 162 68 182',
  'C68 194 65 205 63 215',
  'C59 242 59 270 63 297',
  'C64 307 64 315 64 323',
  'C61 347 62 369 66 386',
  'C67 394 73 398 84 398',
  'C92 398 94 392 92 386',
  'C93 366 94 344 95 322',
  'C96 312 97 304 97.5 296',
  'C98.5 270 98.5 244 99 222',
  'L100 216 Z',
].join(' ');

type Muscle = [BodyRegion, string];

const FRONT: Muscle[] = [
  [
    'traps',
    'M89 55 C86 61 79 65 71 67 C79 70 87 69 93 65 C92 62 90 58 89 55 Z',
  ],
  [
    'delts',
    'M70 69 C57 70 47 77 44 90 C42 101 43 111 46 118 C51 109 57 100 62 93 C67 86 70 78 70 69 Z',
  ],
  [
    'chest',
    'M98.5 73 C90 70 80 70 73 73 C66 79 63 90 64 101 C67 110 76 115 87 115 C93 115 97 112 98.5 107 Z',
  ],
  [
    'biceps',
    'M47 121 C44 132 44 145 47 155 C51 158 57 154 60 146 C62 136 62 125 60 118 C56 116 51 117 47 121 Z',
  ],
  [
    'forearms',
    'M45 162 C40 176 36 192 35 208 C36 216 41 219 45 215 C51 201 56 185 60 169 C58 161 50 159 45 162 Z',
  ],
  [
    'abs',
    [
      'M87.5 119 H98.5 V134 H87.5 Q85.5 134 85.5 132 V121 Q85.5 119 87.5 119 Z',
      'M87.5 137 H98.5 V152 H87.5 Q85.5 152 85.5 150 V139 Q85.5 137 87.5 137 Z',
      'M87.5 155 H98.5 V170 H87.5 Q85.5 170 85.5 168 V157 Q85.5 155 87.5 155 Z',
      'M86.5 173 H98.5 V206 C93 205 88.5 199 86.5 190 Z',
    ].join(' '),
  ],
  [
    'obliques',
    'M70 119 C75 123 80 125 83 127 L83 191 C79 195 75 195 72 191 C68 173 67 147 70 119 Z',
  ],
  [
    'quads',
    [
      'M65 224 C61 248 62 276 67.5 296 C70.5 300 75.5 301 78.5 296 C80.5 274 81 248 80 226 C77 219 69 218 65 224 Z',
      'M82.5 222 C85 244 85.5 266 84 284 C88 285 92 288 94.5 293 C96.5 272 97 244 95.5 225 C92 218 86 217 82.5 222 Z',
      'M83.5 288 C86 287 91 289 93.5 294 C93.5 300 89.5 303 85.5 301.5 C83 298.5 82.5 293 83.5 288 Z',
    ].join(' '),
  ],
  [
    'shins',
    'M66.5 326 C64 344 64.5 364 68.5 380 L75.5 381 C77.5 362 78 344 76.5 327 C73.5 322 69.5 322 66.5 326 Z',
  ],
  [
    'calves',
    'M79.5 324 C84 330 89 340 90.5 352 C91 362 88.5 372 84.5 380 L79.5 380 C80.5 360 80.5 342 79.5 324 Z',
  ],
];

const BACK: Muscle[] = [
  [
    'traps',
    'M89 54 C85 61 78 65 70 69 C79 74 87 83 92 96 C95 104 97.5 110 99.5 113 L99.5 56 Z',
  ],
  [
    'rearDelts',
    'M69 70 C57 71 47 78 44 90 C42 101 43 111 46 118 C51 109 57 100 62 93 C66 85 69 78 69 70 Z',
  ],
  [
    'midBack',
    'M72 77 C80 83 87 92 91 104 C87 110 81 112 75 110 C71 102 70 90 72 77 Z',
  ],
  [
    'lats',
    'M70 113 C76 117 84 119 91 117 C93 133 91 151 85 169 C79 173 74 171 71 165 C68 147 68 129 70 113 Z',
  ],
  [
    'lowerBack',
    'M94 121 C96.5 124 98.5 126 99.5 126 L99.5 197 C95.5 197 91.5 193 89.5 187 C90.5 167 92.5 143 94 121 Z',
  ],
  [
    'triceps',
    'M47 121 C44 132 44 145 47 155 C51 158 57 154 60 146 C62 136 62 125 60 118 C56 116 51 117 47 121 Z',
  ],
  [
    'forearms',
    'M45 162 C40 176 36 192 35 208 C36 216 41 219 45 215 C51 201 56 185 60 169 C58 161 50 159 45 162 Z',
  ],
  [
    'glutes',
    'M66 205 C70 199 82 197 92 199 C97 201 99 205 99.5 209 L99.5 238 C94 246 84 250 74 246 C66 240 63 226 66 205 Z',
  ],
  [
    'hamstrings',
    [
      'M64.5 252 C62 270 64 290 68.5 303 C72.5 307 77.5 305 79.5 299 C81 281 81 265 80 252 C75 248 68.5 248 64.5 252 Z',
      'M82.5 252 C84.5 270 84.5 288 82.5 301 C87.5 308 94.5 304 95.5 293 C96.5 277 96.5 262 95 251 C91 247 86 247 82.5 252 Z',
    ].join(' '),
  ],
  [
    'calves',
    [
      'M65.5 326 C61.5 340 62 356 67.5 368 C71 373 76.5 371 78.5 364 C80.5 351 80 337 77.5 326 C73.5 320 68.5 320 65.5 326 Z',
      'M80.5 325 C83 337 83.5 351 82 364 C85 371 91.5 369 93 360 C95 347 94 334 90 325 C87 319 83 319 80.5 325 Z',
    ].join(' '),
  ],
];

const BASE = 'var(--color-raised)';
const IDLE = 'color-mix(in srgb, var(--color-ink) 16%, var(--color-surface))';

function Half({
  muscles,
  intensity,
}: {
  muscles: Muscle[];
  intensity: Partial<Record<BodyRegion, number>>;
}) {
  return (
    <>
      <path d={SILHOUETTE} fill={BASE} />
      {muscles.map(([region, d], index) => (
        <g key={`${region}-${index}`}>
          <path
            d={d}
            fill={IDLE}
            stroke="var(--color-surface)"
            strokeWidth="1.6"
            strokeLinejoin="round"
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
        viewBox="22 0 156 402"
        height={height}
        width={(height * 156) / 402}
        aria-hidden="true"
        focusable="false"
      >
        <ellipse cx="100" cy="30" rx="17" ry="21" fill={BASE} />
        <path d="M90 46 H110 L112 58 H88 Z" fill={BASE} />
        <Half muscles={muscles} intensity={intensity} />
        <g transform="translate(200 0) scale(-1 1)">
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
      className={cx('flex items-start justify-center gap-1', className)}
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
