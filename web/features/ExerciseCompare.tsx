import { useMemo, useState } from 'react';
import { formatShortDate, formatWeight } from '../lib/format';
import { exerciseSessions } from '../lib/training';
import type { CompletedWorkout } from '../lib/types';
import { cx } from '../ui/core';

/*
 * One exercise, two lines: the person's estimated 1RM per session next to a
 * friend's, over the same 90 days.
 */

const DAY = 86_400_000;
const W = 320;
const H = 170;
const PAD = { left: 34, right: 10, top: 12, bottom: 24 };

type Point = { time: number; value: number };

function seriesOf(
  history: CompletedWorkout[],
  exerciseId: string,
  name: string,
  since: number,
): Point[] {
  return exerciseSessions(history, exerciseId, name)
    .filter(
      (session) =>
        session.bestOneRepMax > 0 && Date.parse(session.completedAt) >= since,
    )
    .map((session) => ({
      time: Date.parse(session.completedAt),
      value: Math.round(session.bestOneRepMax * 10) / 10,
    }))
    .reverse();
}

export function ExerciseCompare({
  mine,
  theirs,
  friendName,
}: {
  mine: CompletedWorkout[];
  theirs: CompletedWorkout[];
  friendName: string;
}) {
  // Fixed while the page is open.
  const [since] = useState(() => Date.now() - 90 * DAY);
  const shared = useMemo(() => {
    const count = (workouts: CompletedWorkout[]) => {
      const map = new Map<string, { name: string; sessions: number }>();
      for (const workout of workouts) {
        if (Date.parse(workout.completedAt) < since) continue;
        for (const exercise of workout.exercises) {
          if (!exercise.exerciseId || !(exercise.bestWeightKg > 0)) continue;
          const entry = map.get(exercise.exerciseId) ?? {
            name: exercise.exerciseName,
            sessions: 0,
          };
          entry.sessions += 1;
          map.set(exercise.exerciseId, entry);
        }
      }
      return map;
    };
    const a = count(mine);
    const b = count(theirs);
    return [...a.entries()]
      .filter(([id]) => b.has(id))
      .map(([id, entry]) => ({
        id,
        name: entry.name,
        sessions: entry.sessions + (b.get(id)?.sessions ?? 0),
      }))
      .sort((x, y) => y.sessions - x.sessions)
      .slice(0, 8);
  }, [mine, theirs, since]);
  const [chosen, setChosen] = useState<string | null>(null);
  const exercise = shared.find((item) => item.id === chosen) ?? shared[0];

  if (!exercise)
    return (
      <p className="text-footnote mx-4 rounded-lg border border-line bg-surface px-4 py-3 text-ink-2">
        Quando vocês dois fizerem o mesmo exercício com carga, dá para comparar
        a evolução aqui.
      </p>
    );

  const me = seriesOf(mine, exercise.id, exercise.name, since);
  const friend = seriesOf(theirs, exercise.id, exercise.name, since);
  const all = [...me, ...friend];
  const minTime = Math.min(...all.map((point) => point.time));
  const maxTime = Math.max(...all.map((point) => point.time), minTime + DAY);
  const low = Math.min(...all.map((point) => point.value));
  const high = Math.max(...all.map((point) => point.value));
  const margin = Math.max(2.5, (high - low) * 0.15);
  const minValue = Math.max(0, low - margin);
  const maxValue = high + margin;
  const x = (time: number) =>
    PAD.left +
    ((time - minTime) / (maxTime - minTime)) * (W - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top +
    (1 - (value - minValue) / (maxValue - minValue)) *
      (H - PAD.top - PAD.bottom);
  const line = (points: Point[]) =>
    points.map((point) => `${x(point.time)},${y(point.value)}`).join(' ');
  const last = (points: Point[]) => points.at(-1)?.value ?? 0;

  return (
    <div className="mx-4 rounded-lg border border-line bg-surface p-4">
      <div
        role="radiogroup"
        aria-label="Exercício para comparar"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"
      >
        {shared.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === exercise.id}
            onClick={() => setChosen(item.id)}
            className={cx(
              'pressable text-footnote h-8 max-w-56 shrink-0 truncate rounded-full border px-3.5 font-semibold',
              item.id === exercise.id
                ? 'border-brand bg-brand-soft text-brand-ink'
                : 'border-line bg-surface text-ink-2',
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`1RM estimado em ${exercise.name}: você ${formatWeight(last(me))} kg, ${friendName} ${formatWeight(last(friend))} kg`}
      >
        {[minValue, (minValue + maxValue) / 2, maxValue].map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--color-line)"
            />
            <text
              x={PAD.left - 6}
              y={y(value) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-ink-3)"
              fontFamily="inherit"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}
        <text
          x={PAD.left}
          y={H - 6}
          fontSize="10"
          fill="var(--color-ink-3)"
          fontFamily="inherit"
        >
          {formatShortDate(new Date(minTime).toISOString())}
        </text>
        <text
          x={W - PAD.right}
          y={H - 6}
          textAnchor="end"
          fontSize="10"
          fill="var(--color-ink-3)"
          fontFamily="inherit"
        >
          {formatShortDate(new Date(maxTime).toISOString())}
        </text>
        {[
          { points: friend, color: 'var(--color-water)' },
          { points: me, color: 'var(--color-brand)' },
        ].map(({ points, color }) => (
          <g key={color}>
            <polyline
              points={line(points)}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((point) => (
              <circle
                key={point.time}
                cx={x(point.time)}
                cy={y(point.value)}
                r="3.5"
                fill={color}
                stroke="var(--color-surface)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ))}
      </svg>
      <div className="text-footnote mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand" aria-hidden="true" />
          Você:{' '}
          <span className="font-semibold">{formatWeight(last(me))} kg</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-water" aria-hidden="true" />
          {friendName}:{' '}
          <span className="font-semibold">{formatWeight(last(friend))} kg</span>
        </span>
        <span className="text-ink-3">1RM estimado, últimos 90 dias</span>
      </div>
    </div>
  );
}
