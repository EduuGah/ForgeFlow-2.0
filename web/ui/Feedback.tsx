import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, CloudOff, Info, type LucideIcon } from 'lucide-react';
import { cx } from './core';
import { initials } from '../lib/format';
import { muscleCode, muscleLabel } from '../lib/training';
import { exerciseMedia } from '../data/exerciseMedia';

/* ------------------------------------------------------------------ */
/* Empty / loading / error                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center px-6 py-10 text-center animate-rise',
        className,
      )}
    >
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-raised text-ink-2">
        <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="text-headline font-semibold">{title}</h3>
      {message && (
        <p className="text-callout mt-1.5 max-w-xs text-ink-2">{message}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx('skeleton rounded-md', className)} aria-hidden="true" />
  );
}

/** Placeholder shaped like a workout card while the first cloud sync runs. */
export function WorkoutCardSkeleton() {
  return (
    <div className="space-y-4 bg-surface p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-40" />
      <div className="flex gap-8">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-14" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

const NOTICE_TONES = {
  info: { icon: Info, className: 'bg-brand-soft text-brand-ink' },
  warning: { icon: AlertTriangle, className: 'bg-warmup-soft text-warmup' },
  error: { icon: AlertTriangle, className: 'bg-danger-soft text-danger-ink' },
  offline: { icon: CloudOff, className: 'bg-raised text-ink-2' },
};

export function InlineNotice({
  tone = 'info',
  children,
  action,
  className,
}: {
  tone?: keyof typeof NOTICE_TONES;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = NOTICE_TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex items-center gap-3 rounded-md px-3.5 py-3',
        toneClass,
        className,
      )}
    >
      <Icon size={18} className="shrink-0" aria-hidden="true" />
      <p className="text-footnote min-w-0 flex-1">{children}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */

const FILLS = {
  brand: 'bg-brand-ink',
  success: 'bg-success-ink',
  water: 'bg-water',
  record: 'bg-record',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
  warmup: 'bg-warmup',
};

export type ProgressTone = keyof typeof FILLS;

export function ProgressBar({
  value,
  tone = 'brand',
  label,
  className,
  thickness = 'md',
}: {
  value: number;
  tone?: ProgressTone;
  label: string;
  className?: string;
  thickness?: 'sm' | 'md';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cx(
        'w-full overflow-hidden rounded-full bg-overlay',
        thickness === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cx(
          'h-full rounded-full transition-[width] duration-700 ease-decelerate',
          FILLS[tone],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

const STROKES = {
  brand: 'var(--color-brand-ink)',
  success: 'var(--color-success-ink)',
  water: 'var(--color-water)',
  record: 'var(--color-record)',
  protein: 'var(--color-protein)',
  carbs: 'var(--color-carbs)',
  fat: 'var(--color-fat)',
  warmup: 'var(--color-warmup)',
};

export function ProgressRing({
  value,
  size = 72,
  stroke = 7,
  tone = 'brand',
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: ProgressTone;
  label: string;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-overlay)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKES[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{
            transition: 'stroke-dashoffset 700ms var(--ease-decelerate)',
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 grid place-items-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  photoUrl,
  size = 44,
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        width={size}
        height={size}
        className={cx(
          'shrink-0 rounded-[32%] bg-raised object-cover',
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center rounded-[32%] bg-brand-soft font-semibold text-brand-ink',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Exercise tag: a squircle with the muscle group code and an ember underline,
 * standing in for exercise photos the catalog does not have.
 */
export function ExerciseThumb({
  muscle,
  exerciseId,
  size = 44,
}: {
  muscle?: string | null;
  /** Catalog exercises show their start photo instead of the muscle tag. */
  exerciseId?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const photo = exerciseId ? exerciseMedia(exerciseId)?.start : undefined;

  if (photo && !failed) {
    return (
      <span
        role="img"
        aria-label={muscleLabel(muscle)}
        className="relative block shrink-0 overflow-hidden rounded-[30%] bg-white ring-1 ring-line-strong"
        style={{ width: size, height: size }}
      >
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={muscleLabel(muscle)}
      className="relative grid shrink-0 place-items-center rounded-[30%] bg-raised ring-1 ring-line-strong"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-x-[22%] bottom-[16%] h-[3px] rounded-full bg-brand/70"
        aria-hidden="true"
      />
      <span
        className="font-metric relative text-ink-2"
        style={{ fontSize: size * 0.3, letterSpacing: '0.04em' }}
      >
        {muscleCode(muscle)}
      </span>
    </span>
  );
}

/** App icon: ember "F" inside a progress ring (see assets/brand). */
export function BrandMark({
  size = 40,
  plain = false,
}: {
  size?: number;
  plain?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="30%" r="80%">
          <stop offset="0" stopColor="#2A3038" />
          <stop offset="1" stopColor="#0D0F12" />
        </radialGradient>
        <linearGradient id={`${id}-ember`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#FFC27A" />
          <stop offset="0.5" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#E0460B" />
        </linearGradient>
      </defs>
      {!plain && (
        <rect width="1024" height="1024" rx="232" fill={`url(#${id}-bg)`} />
      )}
      <circle
        cx="512"
        cy="512"
        r="330"
        fill="none"
        stroke={plain ? 'var(--color-line-strong)' : '#2B313A'}
        strokeWidth="44"
      />
      <path
        d="M512 182A330 330 0 1 1 226.2 347"
        fill="none"
        stroke={`url(#${id}-ember)`}
        strokeWidth="44"
        strokeLinecap="round"
      />
      <rect
        x="382"
        y="312"
        width="92"
        height="400"
        rx="46"
        fill={`url(#${id}-ember)`}
      />
      <rect
        x="382"
        y="312"
        width="266"
        height="92"
        rx="46"
        fill={`url(#${id}-ember)`}
      />
      <rect
        x="382"
        y="474"
        width="206"
        height="86"
        rx="43"
        fill={`url(#${id}-ember)`}
      />
      <circle cx="226.2" cy="347" r="26" fill="#FFE2BF" />
    </svg>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'success' | 'record' | 'warmup' | 'danger';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-raised text-ink-2',
    brand: 'bg-brand-soft text-brand-ink',
    success: 'bg-success-soft text-success-ink',
    record: 'bg-record-soft text-record',
    warmup: 'bg-warmup-soft text-warmup',
    danger: 'bg-danger-soft text-danger-ink',
  };
  return (
    <span
      className={cx(
        'text-caption inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-semibold whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Gold medal used for personal records everywhere. */
export function Medal({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 2h4l2 5-3.5 2L7 2Zm10 0h-4l-2 5 3.5 2L17 2Z"
        fill="var(--color-warmup)"
      />
      <circle cx="12" cy="15" r="7" fill="var(--color-record)" />
      <circle
        cx="12"
        cy="15"
        r="4.2"
        fill="none"
        stroke="#000"
        strokeOpacity="0.28"
        strokeWidth="1.4"
      />
    </svg>
  );
}

/** Inline "PR" chip for a set that set personal records (`labels` names them). */
export function RecordBadge({
  labels,
  large = false,
  className,
}: {
  labels: string[];
  large?: boolean;
  className?: string;
}) {
  if (labels.length === 0) return null;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-sm bg-record-soft font-semibold text-ink',
        large
          ? 'text-footnote py-1 pr-2 pl-1.5'
          : 'text-micro py-0.5 pr-1.5 pl-1',
        className,
      )}
      title={labels.join(', ')}
    >
      <Medal size={large ? 16 : 13} />
      <span aria-hidden="true">PR</span>
      <span className="sr-only">Recorde pessoal: {labels.join(', ')}</span>
    </span>
  );
}
