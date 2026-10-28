import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import {
  achievements,
  levelOf,
  totalXp,
  type Achievement,
  type MedalTier,
} from '../lib/achievements';
import { formatCompact, formatNumber } from '../lib/format';
import { ProgressBar, ProgressRing } from '../ui/Feedback';
import { Sheet } from '../ui/Overlay';
import { cx } from '../ui/core';

/* Levels from XP and a wall of painted medals. */

const TIERS: Record<
  MedalTier,
  { rim: string; face: string; ribbon: [string, string] }
> = {
  bronze: { rim: '#a85f2a', face: '#e3a172', ribbon: ['#c2410c', '#ea580c'] },
  silver: { rim: '#7f8a99', face: '#dfe5ec', ribbon: ['#1d4ed8', '#3b82f6'] },
  gold: { rim: '#c8942c', face: '#ffd166', ribbon: ['#b91c1c', '#ef4444'] },
};

/** A medal: ribbon, rim, face and the emoji; grey until it is won. */
export function MedalArt({
  achievement,
  size = 64,
}: {
  achievement: Achievement;
  size?: number;
}) {
  const won = achievement.progress >= achievement.target;
  const tier = TIERS[achievement.tier];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cx(!won && 'opacity-45 grayscale')}
    >
      <ellipse cx="32" cy="60" rx="14" ry="2.5" fill="rgb(0 0 0 / 0.22)" />
      <path d="M20 2h9l6 20h-9z" fill={tier.ribbon[0]} />
      <path d="M44 2h-9l-6 20h9z" fill={tier.ribbon[1]} />
      <circle cx="32" cy="38" r="20" fill={tier.rim} />
      <circle cx="32" cy="37.5" r="16.5" fill={tier.face} />
      <circle
        cx="32"
        cy="37.5"
        r="13"
        fill="none"
        stroke={tier.rim}
        strokeWidth="1.2"
        opacity={0.5}
      />
      <text x="32" y="43" textAnchor="middle" fontSize="16">
        {achievement.emoji}
      </text>
      <path
        d="M21 30a12 12 0 0 1 7-6"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.45}
        fill="none"
      />
    </svg>
  );
}

/** Level, title and the XP to the next one. */
export function LevelCard({ className }: { className?: string }) {
  const { history, goals } = useAppStore();
  const info = useMemo(
    () => levelOf(totalXp(history, goals)),
    [history, goals],
  );
  return (
    <div className={cx('flex items-center gap-4', className)}>
      <ProgressRing
        value={(info.into / info.span) * 100}
        size={68}
        stroke={7}
        label={`Nível ${info.level}: ${info.into} de ${info.span} XP`}
      >
        <span className="font-metric text-metric-sm leading-none">
          {info.level}
        </span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="text-micro font-semibold tracking-wider text-brand-ink uppercase">
          Nível {info.level}
        </p>
        <p className="text-headline font-semibold">{info.title}</p>
        <p className="text-footnote text-ink-2 tabular">
          {formatNumber(info.into, 0)} / {formatNumber(info.span, 0)} XP para o
          nível {info.level + 1}
        </p>
      </div>
    </div>
  );
}

function progressText(item: Achievement): string {
  if (item.progress >= item.target) return 'Conquistada';
  const big = item.target >= 10_000;
  const show = (value: number) =>
    big ? formatCompact(value) : formatNumber(value, 0);
  return `${show(item.progress)} / ${show(item.target)}`;
}

/** Every medal: won ones in colour, the rest grey with their progress. */
export function MedalWall() {
  const { history, prs } = useAppStore();
  const list = useMemo(() => achievements(history, prs), [history, prs]);
  const [open, setOpen] = useState<Achievement | null>(null);
  const won = list.filter((item) => item.progress >= item.target).length;
  // Won first, then the closest to being won.
  const ordered = [...list].sort(
    (a, b) =>
      Number(b.progress >= b.target) - Number(a.progress >= a.target) ||
      b.progress / b.target - a.progress / a.target,
  );
  return (
    <div>
      <p className="text-footnote mb-3 text-ink-2">
        <span className="font-semibold text-ink">
          {won} de {list.length}
        </span>{' '}
        medalhas conquistadas
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {ordered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpen(item)}
              className="pressable flex w-full flex-col items-center gap-1 rounded-lg bg-raised px-1.5 py-3 text-center"
            >
              <MedalArt achievement={item} size={56} />
              <span className="text-caption line-clamp-2 font-semibold">
                {item.title}
              </span>
              <span className="text-micro text-ink-3 tabular">
                {progressText(item)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.title ?? ''}
      >
        {open && (
          <div className="flex flex-col items-center gap-3 pb-2 text-center">
            <MedalArt achievement={open} size={110} />
            <p className="text-body text-ink-2">{open.description}</p>
            {open.progress < open.target && (
              <ProgressBar
                value={(open.progress / open.target) * 100}
                label={`Progresso de ${open.title}`}
                className="max-w-xs"
              />
            )}
            <p className="text-footnote text-ink-3 tabular">
              {progressText(open)}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
