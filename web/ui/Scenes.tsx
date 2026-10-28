import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Art, P } from './Art';
import { cx } from './core';

/*
 * Scenes: small drawn frames (360 × 220) where one thing happens in three or
 * four beats — a bar gets loaded, a chart climbs, a friend reacts. They play
 * once, when they come into view; before that they wait on the first frame.
 * Reduced motion shows the last frame (index.css shortens every animation).
 *
 * Rules, so new ones stay coherent:
 * - real text only where a number makes the scene read ("+2,5 kg")
 * - surfaces use the theme tokens, objects use the figure palette (`P`)
 * - nothing loops except a "live" dot
 */

function Scene({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver !== 'function') {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cx('scene w-full', className)}
      data-visible={visible || undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 220" className="h-auto w-full" focusable="false">
        {children}
      </svg>
    </div>
  );
}

const at = (seconds: number, extra?: CSSProperties): CSSProperties => ({
  animationDelay: `${seconds}s`,
  ...extra,
});

const SURFACE = 'var(--color-surface)';
const RAISED = 'var(--color-raised)';
const LINE = 'var(--color-line)';
const INK_3 = 'var(--color-ink-3)';

/** A pill with a number that pops in. */
function Tag({
  x,
  y,
  width,
  text,
  delay,
  fill = P.gold,
  color = '#1b1400',
}: {
  x: number;
  y: number;
  width: number;
  text: string;
  delay: number;
  fill?: string;
  color?: string;
}) {
  return (
    <g className="play-pop" style={at(delay)}>
      <rect x={x} y={y} width={width} height="28" rx="14" fill={fill} />
      <text
        x={x + width / 2}
        y={y + 19}
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill={color}
        fontFamily="inherit"
      >
        {text}
      </text>
    </g>
  );
}

/** Plates slide onto a bar, it goes up, and the load ticks up. */
export function BarbellScene({ className }: { className?: string }) {
  const plates = [
    { x: 92, y: 66, w: 18, h: 108, fill: P.brand, from: -60, delay: 0.35 },
    { x: 74, y: 80, w: 16, h: 80, fill: P.brandDark, from: -60, delay: 0.6 },
    { x: 60, y: 96, w: 12, h: 48, fill: P.iron, from: -60, delay: 0.85 },
    { x: 250, y: 66, w: 18, h: 108, fill: P.brand, from: 60, delay: 0.35 },
    { x: 270, y: 80, w: 16, h: 80, fill: P.brandDark, from: 60, delay: 0.6 },
    { x: 288, y: 96, w: 12, h: 48, fill: P.iron, from: 60, delay: 0.85 },
  ];
  return (
    <Scene className={className}>
      <ellipse cx="180" cy="196" rx="132" ry="7" fill={P.shadow} />
      <g
        className="play-lift"
        style={at(1.35, { '--lift': '-16px' } as CSSProperties)}
      >
        <rect
          x="36"
          y="116"
          width="288"
          height="8"
          rx="4"
          fill={P.steel}
          className="play-type"
          style={at(0, { transformOrigin: 'center' })}
        />
        {plates.map((plate) => (
          <g
            key={`${plate.x}`}
            className="play-slide"
            style={at(plate.delay, {
              '--from-x': `${plate.from}px`,
            } as CSSProperties)}
          >
            <rect
              x={plate.x}
              y={plate.y}
              width={plate.w}
              height={plate.h}
              rx="5"
              fill={plate.fill}
            />
            <rect
              x={plate.x + 3}
              y={plate.y + 6}
              width="2.5"
              height={plate.h - 12}
              rx="1.25"
              fill="#fff"
              opacity={0.28}
            />
          </g>
        ))}
        <rect x="112" y="106" width="8" height="28" rx="2" fill={P.ironDark} />
        <rect x="240" y="106" width="8" height="28" rx="2" fill={P.ironDark} />
      </g>
      <Tag x={146} y={26} width={68} text="+2,5 kg" delay={1.9} />
      <g className="play-pop" style={at(2.1)}>
        <rect x="128" y="34" width="10" height="3" rx="1.5" fill={P.gold} />
        <rect x="222" y="34" width="10" height="3" rx="1.5" fill={P.gold} />
        <rect
          x="134"
          y="18"
          width="8"
          height="3"
          rx="1.5"
          fill={P.gold}
          transform="rotate(35 138 19)"
        />
        <rect
          x="218"
          y="18"
          width="8"
          height="3"
          rx="1.5"
          fill={P.gold}
          transform="rotate(-35 222 19)"
        />
      </g>
    </Scene>
  );
}

/** A strength line climbs, the trend points ahead, a trophy waits there. */
export function ProgressScene({ className }: { className?: string }) {
  const points: [number, number][] = [
    [62, 162],
    [108, 150],
    [154, 138],
    [200, 122],
    [246, 108],
  ];
  return (
    <Scene className={className}>
      <rect
        x="28"
        y="20"
        width="304"
        height="180"
        rx="18"
        fill={SURFACE}
        stroke={LINE}
        strokeWidth="1.5"
      />
      {[66, 108, 150].map((y) => (
        <rect key={y} x="48" y={y} width="264" height="1.5" fill={LINE} />
      ))}
      <path
        d={`M${points.map(([x, y]) => `${x} ${y}`).join(' L')}`}
        pathLength={1}
        stroke={P.brand}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="play-trace"
        style={at(0.2)}
      />
      {points.map(([x, y], index) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r="7"
          fill={P.brand}
          stroke={SURFACE}
          strokeWidth="3"
          className="play-pop"
          style={at(0.25 + index * 0.22)}
        />
      ))}
      <path
        d="M246 108 L296 78"
        stroke={P.green}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 9"
        fill="none"
        className="play-fade"
        style={at(1.45)}
      />
      <g className="play-pop" style={at(1.8)}>
        <Art name="trophy" size={56} x={272} y={30} />
      </g>
      <Tag
        x={60}
        y={40}
        width={96}
        text="+5 kg/mês"
        delay={2.1}
        fill="var(--color-success-soft)"
        color="var(--color-success-ink)"
      />
    </Scene>
  );
}

/** The week fills in, day by day, and the streak lights up. */
export function WeekScene({ className }: { className?: string }) {
  const heights = [62, 0, 86, 48, 0, 104, 0];
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  return (
    <Scene className={className}>
      {heights.map((height, index) => {
        const x = 46 + index * 40;
        return (
          <g key={index}>
            <rect x={x} y="68" width="28" height="112" rx="8" fill={RAISED} />
            {height > 0 && (
              <rect
                x={x}
                y={180 - height}
                width="28"
                height={height}
                rx="8"
                fill={P.brand}
                className="play-grow"
                style={at(0.2 + index * 0.16)}
              />
            )}
            <text
              x={x + 14}
              y="204"
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              fill={INK_3}
              fontFamily="inherit"
            >
              {days[index]}
            </text>
          </g>
        );
      })}
      <g className="play-pop" style={at(1.5)}>
        <Art name="flame" size={52} x={114} y={8} />
      </g>
      <Tag
        x={166}
        y={20}
        width={92}
        text="3 semanas"
        delay={1.75}
        fill="var(--color-brand-soft)"
        color="var(--color-brand-ink)"
      />
    </Scene>
  );
}

/** One friend trains live, the other cheers with a reaction. */
export function FriendsScene({ className }: { className?: string }) {
  const card = (x: number) => (
    <rect
      x={x}
      y="34"
      width="150"
      height="150"
      rx="18"
      fill={SURFACE}
      stroke={LINE}
      strokeWidth="1.5"
    />
  );
  const person = (cx: number, body: string, skin: string, hair: string) => (
    <g>
      <circle cx={cx} cy="72" r="20" fill={RAISED} />
      <circle cx={cx} cy="68" r="7.5" fill={skin} />
      <path
        d={`M${cx - 7.5} 67a7.5 7.5 0 0 1 15 0c-2.2-1.6-5.2-2.3-7.5-2.3s-5.3.7-7.5 2.3z`}
        fill={hair}
      />
      <path d={`M${cx - 12} 90c0-8 5.4-13 12-13s12 5 12 13z`} fill={body} />
    </g>
  );
  return (
    <Scene className={className}>
      {card(16)}
      {person(56, P.brand, P.skin, P.ironDark)}
      <circle
        cx="72"
        cy="56"
        r="6"
        fill={P.green}
        stroke={SURFACE}
        strokeWidth="3"
      />
      <circle
        cx="72"
        cy="56"
        r="6"
        fill={P.green}
        className="animate-pulse-dot"
        opacity={0.6}
      />
      <rect
        x="86"
        y="62"
        width="64"
        height="9"
        rx="4.5"
        fill={P.green}
        opacity={0.85}
        className="play-type"
        style={at(0.3)}
      />
      <rect
        x="86"
        y="77"
        width="44"
        height="7"
        rx="3.5"
        fill={LINE}
        className="play-type"
        style={at(0.45)}
      />
      <rect x="36" y="118" width="110" height="9" rx="4.5" fill={RAISED} />
      <rect
        x="36"
        y="118"
        width="72"
        height="9"
        rx="4.5"
        fill={P.green}
        className="play-type"
        style={at(0.7)}
      />
      <rect x="36" y="140" width="70" height="7" rx="3.5" fill={LINE} />
      <rect x="36" y="154" width="50" height="7" rx="3.5" fill={LINE} />

      {card(194)}
      {person(234, P.water, P.skinDark, P.goldDark)}
      <rect x="264" y="62" width="58" height="9" rx="4.5" fill={LINE} />
      <rect x="264" y="77" width="40" height="7" rx="3.5" fill={LINE} />
      {['🔥', '💪', '👏'].map((emoji, index) => (
        <g key={emoji} className="play-pop" style={at(1 + index * 0.2)}>
          <rect
            x={212 + index * 40}
            y="132"
            width="34"
            height="28"
            rx="14"
            fill={index === 0 ? 'var(--color-brand-soft)' : RAISED}
            stroke={index === 0 ? P.brand : 'none'}
            strokeWidth="1.5"
          />
          <text x={229 + index * 40} y="151" textAnchor="middle" fontSize="14">
            {emoji}
          </text>
        </g>
      ))}
      <text
        x="304"
        y="120"
        textAnchor="middle"
        fontSize="20"
        className="play-float"
        style={at(1.7)}
      >
        🔥
      </text>
      <path
        d="M168 108 C176 96, 184 96, 192 108"
        pathLength={1}
        stroke={P.brand}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="play-trace"
        style={at(0.9)}
      />
    </Scene>
  );
}
