import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cx } from './core';

export interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

interface ChartProps {
  data: ChartDatum[];
  /** Accessible name; the visible title lives outside the chart. */
  label: string;
  formatValue: (value: number) => string;
  formatTick?: (value: number) => string;
  height?: number;
  emptyMessage?: string;
}

const PAD = { top: 12, right: 8, bottom: 26 };

/** Left gutter wide enough for the longest y-axis label (≈6.6px per char at 11px). */
function gutterFor(
  max: number,
  formatTick: (v: number) => string,
  min = 0,
): number {
  const longest = Math.max(
    ...[min, (min + max) / 2, max].map((tick) => formatTick(tick).length),
  );
  return Math.ceil(Math.max(28, longest * 6.6 + 12));
}

/**
 * Range fitted to the data (body weight lives around 75 kg, not 0–80), with
 * a little room above and below, rounded to whole units.
 */
function zoomRange(values: number[]): { min: number; max: number } {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = Math.max(0.5, (high - low) * 0.25);
  const min = Math.max(0, Math.floor(low - pad));
  const max = Math.ceil(high + pad);
  return { min, max: max > min ? max : min + 1 };
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceMax(max: number): number {
  if (!(max > 0)) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const fraction = max / magnitude;
  // Fine steps keep the tallest mark near the top (110 → 120, not 200).
  const nice =
    [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((step) => fraction <= step) ??
    10;
  return nice * magnitude;
}

/** Shared pointer/keyboard selection: hover follows the mouse, a tap pins. */
function useActiveIndex(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (event: KeyboardEvent) => {
    if (count === 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      setActive((current) => {
        if (current === null) return delta > 0 ? 0 : count - 1;
        return Math.min(count - 1, Math.max(0, current + delta));
      });
    }
    if (event.key === 'Escape') setActive(null);
  };
  return { active, setActive, onKeyDown };
}

function Tooltip({
  x,
  width,
  value,
  label,
}: {
  x: number;
  width: number;
  value: string;
  label: string;
}) {
  const tooltipWidth = 132;
  const left = Math.min(
    Math.max(x - tooltipWidth / 2, 0),
    Math.max(0, width - tooltipWidth),
  );
  return (
    <div
      className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-center shadow-pop"
      style={{ left, width: tooltipWidth }}
    >
      <p className="text-callout font-semibold tabular">{value}</p>
      <p className="text-caption text-ink-2">{label}</p>
    </div>
  );
}

function ScreenReaderTable({
  data,
  formatValue,
  caption,
}: {
  data: ChartDatum[];
  formatValue: (v: number) => string;
  caption: string;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Período</th>
          <th scope="col">Valor</th>
        </tr>
      </thead>
      <tbody>
        {data.map((datum) => (
          <tr key={datum.key}>
            <th scope="row">{datum.label}</th>
            <td>{formatValue(datum.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Axis({
  width,
  left,
  plotHeight,
  max,
  min = 0,
  formatTick,
  empty = false,
}: {
  width: number;
  left: number;
  plotHeight: number;
  max: number;
  min?: number;
  formatTick: (v: number) => string;
  /** No data: keep the grid but drop labels that would invent a scale. */
  empty?: boolean;
}) {
  // The midline is dropped when it would repeat a label (e.g. 0 / 1 / 1).
  const mid = (min + max) / 2;
  const middle = formatTick(mid);
  const ticks =
    middle === formatTick(min) || middle === formatTick(max)
      ? [min, max]
      : [min, mid, max];
  return (
    <g aria-hidden="true">
      {ticks.map((tick) => {
        const y =
          PAD.top + plotHeight - ((tick - min) / (max - min)) * plotHeight;
        return (
          <g key={tick}>
            <line
              x1={left}
              x2={width - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
            <text
              x={left - 8}
              y={y}
              dy="0.32em"
              textAnchor="end"
              fill="var(--color-ink-3)"
              fontSize={11}
              className="tabular"
            >
              {empty ? '' : formatTick(tick)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XLabels({
  data,
  positions,
  plotWidth,
  baseline,
}: {
  data: ChartDatum[];
  positions: number[];
  plotWidth: number;
  baseline: number;
}) {
  const fit = Math.max(1, Math.floor(plotWidth / 52));
  const step = Math.ceil(data.length / fit);
  return (
    <g aria-hidden="true">
      {data.map((datum, i) =>
        i % step === 0 ? (
          <text
            key={datum.key}
            x={positions[i]}
            y={baseline + 18}
            textAnchor="middle"
            fill="var(--color-ink-3)"
            fontSize={11}
          >
            {datum.label}
          </text>
        ) : null,
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Bar chart                                                           */
/* ------------------------------------------------------------------ */

export function BarChart({
  data,
  label,
  formatValue,
  formatTick = formatValue,
  height = 180,
  emptyMessage = 'Sem dados no período',
}: ChartProps) {
  const [ref, width] = useWidth();
  const { active, setActive, onKeyDown } = useActiveIndex(data.length);
  const titleId = useId();
  const isEmpty = data.every((datum) => datum.value <= 0);
  const max = niceMax(Math.max(...data.map((datum) => datum.value), 0));
  const left = gutterFor(max, formatTick);
  const plotWidth = Math.max(0, width - left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const band = data.length > 0 ? plotWidth / data.length : 0;
  const barWidth = Math.min(24, band * 0.62);
  const baseline = PAD.top + plotHeight;
  const centers = data.map((_, i) => left + band * i + band / 2);

  const pick = (event: ReactPointerEvent<SVGSVGElement>, pin: boolean) => {
    if (event.pointerType !== 'mouse' && !pin) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - left) / band);
    if (index < 0 || index >= data.length) return;
    setActive((current) =>
      pin && current === index && event.pointerType !== 'mouse' ? null : index,
    );
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      <p id={titleId} className="sr-only">
        {label}
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerMove={(event) => pick(event, false)}
          onPointerDown={(event) => pick(event, true)}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null);
          }}
          className="block touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          <Axis
            width={width}
            left={left}
            plotHeight={plotHeight}
            max={max}
            formatTick={formatTick}
            empty={isEmpty}
          />
          {data.map((datum, i) => {
            if (datum.value <= 0) return null;
            const barHeight = Math.max(2, (datum.value / max) * plotHeight);
            const x = centers[i] - barWidth / 2;
            const y = baseline - barHeight;
            const r = Math.min(4, barWidth / 2, barHeight);
            const path = `M${x},${baseline} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${baseline} Z`;
            return (
              <path
                key={datum.key}
                d={path}
                fill={
                  active === i ? 'var(--color-brand-ink)' : 'var(--color-chart)'
                }
                opacity={active !== null && active !== i ? 0.55 : 1}
                style={{ transition: 'opacity 150ms, fill 150ms' }}
              />
            );
          })}
          <XLabels
            data={data}
            positions={centers}
            plotWidth={plotWidth}
            baseline={baseline}
          />
        </svg>
      )}
      {isEmpty && width > 0 && (
        <p
          className="text-footnote pointer-events-none absolute inset-x-0 text-center text-ink-3"
          style={{ top: PAD.top + plotHeight / 2 - 10, paddingLeft: left }}
        >
          {emptyMessage}
        </p>
      )}
      {active !== null && data[active] && (
        <Tooltip
          x={centers[active]}
          width={width}
          value={formatValue(data[active].value)}
          label={data[active].label}
        />
      )}
      <ScreenReaderTable
        data={data}
        formatValue={formatValue}
        caption={label}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

export function LineChart({
  data,
  label,
  formatValue,
  formatTick = formatValue,
  height = 190,
  emptyMessage = 'Sem registros ainda',
  zoom = false,
}: ChartProps & {
  /** Fit the y-axis to the data instead of starting at 0. */
  zoom?: boolean;
}) {
  const [ref, width] = useWidth();
  const { active, setActive, onKeyDown } = useActiveIndex(data.length);
  const titleId = useId();
  const gradientId = useId();
  const range =
    zoom && data.length > 0
      ? zoomRange(data.map((datum) => datum.value))
      : {
          min: 0,
          max: niceMax(Math.max(...data.map((datum) => datum.value), 0)),
        };
  const { min, max } = range;
  const left = gutterFor(max, formatTick, min);
  const plotWidth = Math.max(0, width - left - PAD.right - 8);
  const plotHeight = height - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotHeight;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const xs = data.map((_, i) =>
    data.length === 1 ? left + plotWidth / 2 : left + 4 + step * i,
  );
  const ys = data.map(
    (datum) => baseline - ((datum.value - min) / (max - min)) * plotHeight,
  );
  const line = xs
    .map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`)
    .join(' ');
  const area =
    data.length > 1
      ? `${line} L${xs[xs.length - 1]},${baseline} L${xs[0]},${baseline} Z`
      : '';
  const shown = active ?? (data.length > 0 ? data.length - 1 : null);

  const pick = (event: ReactPointerEvent<SVGSVGElement>, pin: boolean) => {
    if (data.length === 0 || (event.pointerType !== 'mouse' && !pin)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    let nearest = 0;
    xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs(xs[nearest] - px)) nearest = i;
    });
    setActive(nearest);
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      <p id={titleId} className="sr-only">
        {label}
      </p>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerMove={(event) => pick(event, false)}
          onPointerDown={(event) => pick(event, true)}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null);
          }}
          className="block touch-pan-y rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-chart)"
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor="var(--color-chart)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <Axis
            width={width}
            left={left}
            plotHeight={plotHeight}
            max={max}
            min={min}
            formatTick={formatTick}
            empty={data.length === 0}
          />
          {area && <path d={area} fill={`url(#${gradientId})`} />}
          {data.length > 1 && (
            <path
              d={line}
              fill="none"
              stroke="var(--color-chart)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {active !== null && (
            <line
              x1={xs[active]}
              x2={xs[active]}
              y1={PAD.top}
              y2={baseline}
              stroke="var(--color-line-strong)"
              strokeWidth={1}
            />
          )}
          {shown !== null && (
            <circle
              cx={xs[shown]}
              cy={ys[shown]}
              r={5}
              fill="var(--color-brand-ink)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          )}
          <XLabels
            data={data}
            positions={xs}
            plotWidth={plotWidth}
            baseline={baseline}
          />
        </svg>
      )}
      {data.length === 0 && width > 0 && (
        <p
          className="text-footnote pointer-events-none absolute inset-x-0 text-center text-ink-3"
          style={{ top: PAD.top + plotHeight / 2 - 10, paddingLeft: left }}
        >
          {emptyMessage}
        </p>
      )}
      {active !== null && data[active] && (
        <Tooltip
          x={xs[active]}
          width={width}
          value={formatValue(data[active].value)}
          label={data[active].label}
        />
      )}
      <ScreenReaderTable
        data={data}
        formatValue={formatValue}
        caption={label}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars (ranked categories)                                 */
/* ------------------------------------------------------------------ */

export function RankedBars({
  data,
  formatValue,
  label,
}: {
  data: ChartDatum[];
  formatValue: (value: number) => string;
  label: string;
}) {
  const max = Math.max(...data.map((datum) => datum.value), 1);
  return (
    <ul aria-label={label} className="space-y-3" role="list">
      {data.map((datum) => (
        <li key={datum.key}>
          <div className="text-callout mb-1.5 flex items-baseline justify-between gap-3">
            <span>{datum.label}</span>
            <span className="font-semibold tabular text-ink-2">
              {formatValue(datum.value)}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-overlay"
            aria-hidden="true"
          >
            <div
              className={cx(
                'h-full rounded-full bg-chart transition-[width] duration-700 ease-decelerate',
              )}
              style={{ width: `${(datum.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
