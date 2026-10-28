import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import {
  MEDAL_CATEGORIES,
  achievements,
  levelOf,
  totalXp,
  type Achievement,
  type MedalTier,
} from '../lib/achievements';
import { formatCompact, formatNumber } from '../lib/format';
import { ProgressBar, ProgressRing } from '../ui/Feedback';
import { Sheet } from '../ui/Overlay';
import { Button } from '../ui/Button';
import { useFriends } from './useFriends';
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

/** Every medal from the person's data (workouts, records, goals, friends). */
export function useAchievements(): Achievement[] {
  const { history, prs, goals, measurements } = useAppStore();
  const friendCount = useFriends().lists.friends.length;
  return useMemo(
    () =>
      achievements(history, prs, {
        goals,
        measurements: measurements.length,
        friends: friendCount,
      }),
    [history, prs, goals, measurements, friendCount],
  );
}

const won = (item: Achievement) => item.progress >= item.target;

function MedalTile({
  item,
  onOpen,
}: {
  item: Achievement;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
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
  );
}

function MedalSheet({
  item,
  onClose,
}: {
  item: Achievement | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={item !== null} onClose={onClose} title={item?.title ?? ''}>
      {item && (
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <MedalArt achievement={item} size={110} />
          <p className="text-body text-ink-2">{item.description}</p>
          {!won(item) && (
            <ProgressBar
              value={(item.progress / item.target) * 100}
              label={`Progresso de ${item.title}`}
              className="max-w-xs"
            />
          )}
          <p className="text-footnote text-ink-3 tabular">
            {item.category} · {progressText(item)}
          </p>
        </div>
      )}
    </Sheet>
  );
}

/** Every medal, by category: won ones in colour, the rest with progress. */
export function MedalWall() {
  const list = useAchievements();
  const [open, setOpen] = useState<Achievement | null>(null);
  return (
    <div className="space-y-5">
      {MEDAL_CATEGORIES.map((category) => {
        const items = list
          .filter((item) => item.category === category)
          // Won first, then the closest to being won.
          .sort(
            (a, b) =>
              Number(won(b)) - Number(won(a)) ||
              b.progress / b.target - a.progress / a.target,
          );
        if (items.length === 0) return null;
        return (
          <section key={category} aria-label={category}>
            <h3 className="text-footnote mb-2 flex items-baseline justify-between font-semibold">
              {category}
              <span className="text-caption font-normal text-ink-3 tabular">
                {items.filter(won).length}/{items.length}
              </span>
            </h3>
            <ul className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  <MedalTile item={item} onOpen={() => setOpen(item)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <MedalSheet item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/** A short look: level, how many medals, the best ones won and a link. */
export function MedalPreview({ onOpenAll }: { onOpenAll: () => void }) {
  const list = useAchievements();
  const [open, setOpen] = useState<Achievement | null>(null);
  const tierRank = { gold: 3, silver: 2, bronze: 1 };
  const best = list
    .filter(won)
    .sort((a, b) => tierRank[b.tier] - tierRank[a.tier])
    .slice(0, 3);
  const next = list
    .filter((item) => !won(item))
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  return (
    <div className="space-y-4">
      <LevelCard />
      <p className="text-footnote text-ink-2">
        <span className="font-semibold text-ink">
          {list.filter(won).length} de {list.length}
        </span>{' '}
        medalhas conquistadas
        {next && (
          <>
            {' '}
            · próxima: <span className="text-ink">{next.title}</span> (
            {progressText(next)})
          </>
        )}
      </p>
      {best.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {best.map((item) => (
            <li key={item.id}>
              <MedalTile item={item} onOpen={() => setOpen(item)} />
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" block onClick={onOpenAll}>
        Ver todas as conquistas
      </Button>
      <MedalSheet item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
