import { useLayoutEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { formatNumber, formatWeight } from '../lib/format';
import { yearGrid, type YearDay } from '../lib/summaries';
import { cx } from '../ui/core';

/* The last 12 months, one square per day, brighter on heavier days. */

const LEVEL_FILL: Record<YearDay['level'], string> = {
  0: 'var(--color-raised)',
  1: 'color-mix(in srgb, var(--color-brand) 30%, var(--color-raised))',
  2: 'color-mix(in srgb, var(--color-brand) 55%, var(--color-raised))',
  3: 'color-mix(in srgb, var(--color-brand) 80%, var(--color-raised))',
  4: 'var(--color-brand)',
};

const CELL = 11;
const GAP = 3;

export function YearCalendar() {
  const { history } = useAppStore();
  const weeks = useMemo(() => yearGrid(history), [history]);
  const scroller = useRef<HTMLDivElement>(null);
  const days = weeks.flat().filter((day) => !day.future);
  const trained = days.filter((day) => day.workouts > 0).length;

  // Starts at today, on the right; older months are a swipe away.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);

  return (
    <div>
      <p className="text-footnote mb-3 text-ink-2">
        <span className="font-semibold text-ink">
          {formatNumber(trained, 0)} {trained === 1 ? 'dia' : 'dias'}
        </span>{' '}
        de treino nos últimos 12 meses
      </p>
      <div
        ref={scroller}
        className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
      >
        <svg
          width={weeks.length * (CELL + GAP)}
          height={7 * (CELL + GAP) + 16}
          role="img"
          aria-label={`Calendário do ano: ${trained} dias com treino nos últimos 12 meses`}
        >
          {weeks.map((week, column) => {
            const first = week[0].date;
            const showMonth =
              first.getDate() <= 7 && (column > 0 || first.getDate() === 1);
            return (
              <g key={first.toISOString()}>
                {showMonth && (
                  <text
                    x={column * (CELL + GAP)}
                    y="10"
                    fontSize="10"
                    fill="var(--color-ink-3)"
                    fontFamily="inherit"
                  >
                    {first
                      .toLocaleDateString('pt-BR', { month: 'short' })
                      .replace('.', '')}
                  </text>
                )}
                {week.map((day, row) =>
                  day.future ? null : (
                    <rect
                      key={row}
                      x={column * (CELL + GAP)}
                      y={16 + row * (CELL + GAP)}
                      width={CELL}
                      height={CELL}
                      rx="3"
                      fill={LEVEL_FILL[day.level]}
                    >
                      <title>
                        {day.date.toLocaleDateString('pt-BR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {day.workouts > 0
                          ? `: ${formatWeight(day.volumeKg)} kg`
                          : ': sem treino'}
                      </title>
                    </rect>
                  ),
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="text-caption mt-2 flex items-center justify-end gap-1.5 text-ink-3">
        Menos
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={cx('inline-block size-2.5 rounded-[3px]')}
            style={{ background: LEVEL_FILL[level] }}
            aria-hidden="true"
          />
        ))}
        Mais
      </div>
    </div>
  );
}
