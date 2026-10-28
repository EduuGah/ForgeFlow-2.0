import type { ReactNode } from 'react';

/*
 * Painted figures: the bigger pictures of the app, for empty states and
 * section openers, where a 24 px icon gets lost.
 *
 * Rules, so new ones stay coherent:
 * - 48 grid, filled shapes, no outlines; a shape is defined by its
 *   neighbours' colours
 * - one palette (`P`); the accent follows the chosen theme colour, the
 *   objects (iron, gold, water) keep their own
 * - each figure sits on a soft ground shadow instead of floating
 * - decorative: the text next to it carries the meaning (aria-hidden)
 */

export const P = {
  brand: 'var(--color-brand)',
  brandDark: 'var(--color-brand-press)',
  iron: '#5b6372',
  ironDark: '#3c424d',
  ironLight: '#9aa3b2',
  steel: '#cdd3dc',
  gold: '#ffd166',
  goldDark: '#d9a43b',
  green: '#2fbf71',
  greenDark: '#1f8f53',
  water: '#38bdf8',
  waterDark: '#1d8fc4',
  waterLight: '#c4ebfc',
  red: '#e8604c',
  meat: '#b5533c',
  wood: '#a8743f',
  cream: '#fff4e6',
  skin: '#f2c29b',
  skinDark: '#d99a6c',
  shadow: 'rgb(0 0 0 / 0.22)',
} as const;

function Ground({ cy = 43, rx = 15 }: { cy?: number; rx?: number }) {
  return <ellipse cx="24" cy={cy} rx={rx} ry="2.5" fill={P.shadow} />;
}

const FIGURES = {
  dumbbell: (
    <>
      <Ground cy={41} rx={18} />
      <g transform="rotate(-14 24 24)">
        <rect x="14" y="22" width="20" height="4" rx="2" fill={P.steel} />
        <rect
          x="5"
          y="17"
          width="4.5"
          height="14"
          rx="1.6"
          fill={P.brandDark}
        />
        <rect x="9" y="13" width="5.5" height="22" rx="2" fill={P.brand} />
        <rect x="33.5" y="13" width="5.5" height="22" rx="2" fill={P.brand} />
        <rect
          x="38.5"
          y="17"
          width="4.5"
          height="14"
          rx="1.6"
          fill={P.brandDark}
        />
        <rect x="14.5" y="20" width="2" height="8" rx="1" fill={P.iron} />
        <rect x="31.5" y="20" width="2" height="8" rx="1" fill={P.iron} />
        <rect
          x="10.2"
          y="14.5"
          width="1.4"
          height="19"
          rx="0.7"
          fill="#fff"
          opacity={0.3}
        />
        <rect
          x="34.7"
          y="14.5"
          width="1.4"
          height="19"
          rx="0.7"
          fill="#fff"
          opacity={0.3}
        />
      </g>
    </>
  ),
  trophy: (
    <>
      <Ground cy={44} rx={13} />
      <path
        d="M12.5 10H8.5a1.5 1.5 0 0 0-1.5 1.5v1.8c0 4.2 2.7 7.2 6.8 7.7M35.5 10h4a1.5 1.5 0 0 1 1.5 1.5v1.8c0 4.2-2.7 7.2-6.8 7.7"
        stroke={P.goldDark}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M12 8h24v5.5C36 21 30.6 27 24 27s-12-6-12-13.5z" fill={P.gold} />
      <rect x="11" y="6" width="26" height="3.2" rx="1.6" fill={P.goldDark} />
      <path d="M21 26.5h6V34h-6z" fill={P.goldDark} />
      <rect x="17" y="33.5" width="14" height="4" rx="1" fill={P.iron} />
      <rect x="15" y="37.5" width="18" height="4" rx="1.5" fill={P.ironDark} />
      <path
        d="M24 11l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z"
        fill={P.cream}
      />
      <path
        d="M15.5 11v2.5c0 3.2 1.2 5.8 2.8 7.4"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.4}
        fill="none"
      />
    </>
  ),
  flame: (
    <>
      <Ground cy={44} rx={11} />
      <path
        d="M24 3.5c2 6.2 10.5 10.3 10.5 21.5a10.5 10.5 0 0 1-21 0c0-5.3 2.6-8.4 4.7-10.4.5 3.1 2.1 5.2 4.2 5.7-.9-6.5-.6-11.5 1.6-16.8z"
        fill={P.brand}
      />
      <path
        d="M24 20.5c1.6 3.2 5.3 5.2 5.3 9.9a5.3 5.3 0 0 1-10.6 0c0-2.6 1.3-4.2 2.5-5.2.3 1.6 1.2 2.6 2.2 2.9-.3-2.6-.2-5.2.6-7.6z"
        fill={P.gold}
      />
    </>
  ),
  target: (
    <>
      <Ground cy={44} rx={14} />
      <circle cx="22" cy="26" r="16" fill={P.brand} />
      <circle cx="22" cy="26" r="12" fill={P.cream} />
      <circle cx="22" cy="26" r="8" fill={P.brand} />
      <circle cx="22" cy="26" r="4" fill={P.cream} />
      <path
        d="M22 26L38.5 9.5"
        stroke={P.ironDark}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path d="M37.5 10.5L40.5 3l1.3 4.7 4.7 1.3-7.5 3z" fill={P.green} />
      <circle cx="22" cy="26" r="1.6" fill={P.ironDark} />
    </>
  ),
  water: (
    <>
      <Ground cy={44} rx={13} />
      <rect x="19" y="4" width="10" height="5" rx="1.5" fill={P.waterDark} />
      <rect x="20" y="8" width="8" height="4" fill={P.waterLight} />
      <path
        d="M16.5 15a3.5 3.5 0 0 1 3.5-3.5h8a3.5 3.5 0 0 1 3.5 3.5v23a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4z"
        fill={P.waterLight}
      />
      <path
        d="M16.5 24c3 1.6 6 1.6 7.5 0s4.5-1.6 7.5 0v14a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4z"
        fill={P.water}
      />
      <rect
        x="19"
        y="15"
        width="2"
        height="22"
        rx="1"
        fill="#fff"
        opacity={0.55}
      />
      <path
        d="M39 20s-4 4.6-4 7.2a4 4 0 0 0 8 0c0-2.6-4-7.2-4-7.2z"
        fill={P.water}
      />
    </>
  ),
  meal: (
    <>
      <Ground cy={41} rx={20} />
      <ellipse cx="24" cy="29" rx="18.5" ry="9" fill={P.steel} />
      <ellipse cx="24" cy="28.2" rx="14" ry="6.4" fill={P.cream} />
      <ellipse cx="29" cy="27.6" rx="5.6" ry="3.2" fill={P.meat} />
      <ellipse cx="22" cy="30.4" rx="4.4" ry="2.1" fill="#fff" />
      <circle cx="17.5" cy="27" r="2.8" fill={P.green} />
      <circle cx="20.5" cy="25.4" r="2.4" fill={P.greenDark} />
      <rect x="2.5" y="14" width="2" height="20" rx="1" fill={P.ironLight} />
      <rect
        x="43.3"
        y="14"
        width="2.2"
        height="20"
        rx="1.1"
        fill={P.ironLight}
      />
    </>
  ),
  friends: (
    <>
      <Ground cy={44} rx={19} />
      <circle cx="31" cy="15" r="6" fill={P.skinDark} />
      <path
        d="M25 13.5a6 6 0 0 1 12 0c-1.7-1.2-4-1.8-6-1.8s-4.3.6-6 1.8z"
        fill={P.goldDark}
      />
      <path d="M21 41c0-8 4.5-13.5 10-13.5S41 33 41 41z" fill={P.water} />
      <circle cx="18" cy="18.5" r="7" fill={P.skin} />
      <path
        d="M11 17.5a7 7 0 0 1 14 0c-2-1.5-5-2.2-7-2.2s-5 .7-7 2.2z"
        fill={P.ironDark}
      />
      <path d="M6 43c0-8.8 5.4-15 12-15s12 6.2 12 15z" fill={P.brand} />
    </>
  ),
  chat: (
    <>
      <Ground cy={44} rx={17} />
      <path
        d="M5 10a4 4 0 0 1 4-4h19a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H15l-6.5 5v-5.3A4 4 0 0 1 5 20z"
        fill={P.brand}
      />
      <circle cx="12.5" cy="15" r="1.9" fill={P.cream} />
      <circle cx="18.5" cy="15" r="1.9" fill={P.cream} />
      <circle cx="24.5" cy="15" r="1.9" fill={P.cream} />
      <path
        d="M16 24a4 4 0 0 1 4-4h19a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-.5v5l-6.3-5H20a4 4 0 0 1-4-4z"
        fill={P.steel}
      />
      <rect
        x="20.5"
        y="25.5"
        width="17"
        height="2.6"
        rx="1.3"
        fill={P.ironLight}
      />
      <rect
        x="20.5"
        y="30.5"
        width="10"
        height="2.6"
        rx="1.3"
        fill={P.ironLight}
      />
    </>
  ),
  bell: (
    <>
      <Ground cy={45} rx={10} />
      <path
        d="M24 5.5a2.5 2.5 0 0 1 2.5 2.5v.9c5.6 1.2 9 6 9 11.6v7.2l3.5 5V35H9v-2.3l3.5-5v-7.2c0-5.6 3.4-10.4 9-11.6V8a2.5 2.5 0 0 1 2.5-2.5z"
        fill={P.gold}
      />
      <circle cx="24" cy="38.5" r="3.6" fill={P.goldDark} />
      <rect x="9" y="32.5" width="30" height="3.2" rx="1.6" fill={P.goldDark} />
      <path
        d="M17 22c0-3.4 1.6-6 4.2-7.3"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.45}
        fill="none"
      />
      <circle cx="35.5" cy="10.5" r="5" fill={P.brand} />
    </>
  ),
  clipboard: (
    <>
      <Ground cy={45} rx={15} />
      <rect x="10" y="7" width="28" height="36" rx="3" fill={P.wood} />
      <rect x="13" y="11" width="22" height="29" rx="1.5" fill={P.cream} />
      <rect x="18" y="4.5" width="12" height="6.5" rx="2" fill={P.iron} />
      <rect x="21" y="6.2" width="6" height="2.2" rx="1.1" fill={P.ironDark} />
      {[17, 24.5, 32].map((y, index) => (
        <g key={y}>
          <circle
            cx="17.5"
            cy={y}
            r="2.4"
            fill={index < 2 ? P.green : P.steel}
          />
          {index < 2 && (
            <path
              d={`M16.3 ${y}l.9.9 1.7-1.8`}
              stroke="#fff"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          <rect
            x="22"
            y={y - 1.3}
            width={index === 2 ? 7 : 10}
            height="2.6"
            rx="1.3"
            fill={P.ironLight}
          />
        </g>
      ))}
    </>
  ),
  calendar: (
    <>
      <Ground cy={44} rx={17} />
      <rect x="7" y="10" width="34" height="31" rx="4" fill={P.cream} />
      <path d="M7 14a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v5H7z" fill={P.brand} />
      <rect x="14" y="6" width="3" height="8" rx="1.5" fill={P.ironDark} />
      <rect x="31" y="6" width="3" height="8" rx="1.5" fill={P.ironDark} />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((column) => {
          const done = (row * 4 + column) % 3 === 1;
          return (
            <rect
              key={`${row}-${column}`}
              x={11 + column * 7}
              y={23 + row * 6}
              width="5"
              height="4"
              rx="1"
              fill={done ? P.brand : P.steel}
            />
          );
        }),
      )}
    </>
  ),
  search: (
    <>
      <Ground cy={44} rx={14} />
      <path
        d="M29 29l10 10"
        stroke={P.ironDark}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="13" fill={P.iron} />
      <circle cx="20" cy="20" r="9.5" fill={P.waterLight} />
      <path
        d="M14.5 18a6 6 0 0 1 4.5-4.5"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  tape: (
    <>
      <Ground cy={44} rx={18} />
      <rect x="20" y="32" width="23" height="7" rx="1" fill={P.gold} />
      {[24, 28, 32, 36, 40].map((x) => (
        <rect
          key={x}
          x={x}
          y="32"
          width="1.2"
          height={x % 8 === 0 ? 4 : 2.5}
          fill={P.ironDark}
        />
      ))}
      <rect x="42" y="30" width="2.8" height="11" rx="1" fill={P.iron} />
      <circle cx="19" cy="24" r="14" fill={P.gold} />
      <circle cx="19" cy="24" r="10" fill={P.goldDark} />
      <circle cx="19" cy="24" r="4.5" fill={P.gold} />
      <circle cx="19" cy="24" r="1.8" fill={P.ironDark} />
    </>
  ),
  pin: (
    <>
      <Ground cy={44} rx={8} />
      <path
        d="M24 3.5c-7.8 0-14 6-14 13.6C10 27.5 24 42 24 42s14-14.5 14-24.9C38 9.5 31.8 3.5 24 3.5z"
        fill={P.brand}
      />
      <circle cx="24" cy="17" r="7.5" fill={P.cream} />
      <rect x="19.5" y="16" width="9" height="2" rx="1" fill={P.ironDark} />
      <rect x="18" y="13.5" width="2.6" height="7" rx="1" fill={P.ironDark} />
      <rect x="27.4" y="13.5" width="2.6" height="7" rx="1" fill={P.ironDark} />
    </>
  ),
  lock: (
    <>
      <Ground cy={44} rx={14} />
      <path
        d="M16 21v-5a8 8 0 0 1 16 0v5"
        stroke={P.ironLight}
        strokeWidth={4}
        fill="none"
      />
      <rect x="11" y="19.5" width="26" height="22" rx="4" fill={P.gold} />
      <circle cx="24" cy="28.5" r="3" fill={P.goldDark} />
      <rect
        x="22.8"
        y="29.5"
        width="2.4"
        height="6.5"
        rx="1.2"
        fill={P.goldDark}
      />
    </>
  ),
  chart: (
    <>
      <Ground cy={44} rx={18} />
      <rect x="7" y="31" width="7" height="11" rx="1.5" fill={P.steel} />
      <rect x="16" y="25" width="7" height="17" rx="1.5" fill={P.steel} />
      <rect x="25" y="19" width="7" height="23" rx="1.5" fill={P.brand} />
      <rect x="34" y="12" width="7" height="30" rx="1.5" fill={P.brand} />
      <path
        d="M7 25l9.5-7 9 3.5L38.5 8"
        stroke={P.green}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32.5 7.5h6.5V14"
        stroke={P.green}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  ),
  medal: (
    <>
      <Ground cy={45} rx={11} />
      <path d="M15 3h7l5.5 15h-7z" fill={P.water} />
      <path d="M33 3h-7l-5.5 15h7z" fill={P.brand} />
      <circle cx="24" cy="29" r="12" fill={P.goldDark} />
      <circle cx="24" cy="28.5" r="10.5" fill={P.gold} />
      <path
        d="M24 22.5l2 4 4.4.7-3.2 3 .8 4.4-4-2.1-4 2.1.8-4.4-3.2-3 4.4-.7z"
        fill={P.cream}
      />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type ArtName = keyof typeof FIGURES;

/** One painted figure, `size` px square (`x`/`y` place it inside a scene). */
export function Art({
  name,
  size = 48,
  x,
  y,
  className,
}: {
  name: ArtName;
  size?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {FIGURES[name]}
    </svg>
  );
}
