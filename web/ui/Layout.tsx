import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { IconButton } from './Button';
import { cx } from './core';

/* ------------------------------------------------------------------ */
/* Headers                                                             */
/* ------------------------------------------------------------------ */

/** Root header of a tab: large title with actions, like "Início" in Hevy. */
export function TabHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 bg-canvas/90 backdrop-blur-md">
      <div className="app-column flex min-h-16 items-center justify-between gap-3 px-4">
        <div className="min-w-0 py-2">
          {eyebrow && (
            <p className="text-footnote truncate text-ink-2 first-letter:uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="text-title-lg truncate font-bold">{title}</h1>
        </div>
        {actions && (
          <div className="-mr-2 flex shrink-0 items-center gap-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/** Header of a pushed screen: back arrow, centered title, optional action. */
export function StackHeader({
  title,
  onBack,
  right,
  backLabel = 'Voltar',
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  backLabel?: string;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="app-column grid h-14 grid-cols-[3rem_1fr_auto] items-center gap-2 px-2">
        <div>
          {onBack && (
            <IconButton icon={ArrowLeft} label={backLabel} onClick={onBack} />
          )}
        </div>
        <h1 className="text-headline truncate text-center font-semibold">
          {title}
        </h1>
        <div className="flex min-w-12 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export function SectionHeader({
  title,
  action,
  className,
  id,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  /** Lets the surrounding <section aria-labelledby> point at this title. */
  id?: string;
}) {
  return (
    <div
      className={cx(
        'flex min-h-11 items-center justify-between gap-3',
        className,
      )}
    >
      <h2 id={id} className="text-headline font-semibold">
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Muted group label used above list groups (Hevy settings style). */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-micro px-5 pt-6 pb-2 font-semibold tracking-wider text-ink-3 uppercase">
      {children}
    </h2>
  );
}

export function Card({
  children,
  className,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'li';
}) {
  return (
    <Tag className={cx('rounded-lg border border-line bg-surface', className)}>
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

export function ListGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cx(
        'mx-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
      role="list"
    >
      {children}
    </ul>
  );
}

interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  leading?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  tone?: 'default' | 'danger' | 'brand';
  chevron?: boolean;
  disabled?: boolean;
}

export function ListRow({
  title,
  subtitle,
  icon: Icon,
  leading,
  value,
  trailing,
  onClick,
  tone = 'default',
  chevron = Boolean(onClick),
  disabled,
}: ListRowProps) {
  const toneClass =
    tone === 'danger'
      ? 'text-danger-ink'
      : tone === 'brand'
        ? 'text-brand-ink'
        : 'text-ink';
  const content = (
    <>
      {leading}
      {Icon && (
        <Icon
          size={22}
          strokeWidth={1.9}
          className={cx('shrink-0', toneClass)}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 flex-1">
        <span className={cx('text-body block truncate', toneClass)}>
          {title}
        </span>
        {subtitle && (
          <span className="text-footnote mt-0.5 block text-ink-2">
            {subtitle}
          </span>
        )}
      </span>
      {value !== undefined && (
        <span className="text-body shrink-0 text-ink-2">{value}</span>
      )}
      {trailing}
      {chevron && (
        <ChevronRight
          size={20}
          className="shrink-0 text-ink-3"
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left transition-colors active:bg-raised disabled:opacity-50"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-h-14 items-center gap-4 px-4 py-3">
          {content}
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

/** Label over a big condensed number — the Hevy "Tempo / Volume / Recordes" row. */
export function Stat({
  label,
  value,
  unit,
  tone = 'default',
  size = 'md',
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: 'default' | 'brand' | 'record' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}) {
  const toneClass =
    tone === 'brand'
      ? 'text-brand-ink'
      : tone === 'record'
        ? 'text-record'
        : tone === 'success'
          ? 'text-success-ink'
          : 'text-ink';
  const sizeClass =
    size === 'lg'
      ? 'text-metric-lg'
      : size === 'sm'
        ? 'text-metric-sm'
        : 'text-metric';
  return (
    <div className="min-w-0">
      <p className="text-caption truncate text-ink-2">{label}</p>
      <p
        className={cx(
          'font-metric mt-0.5 flex items-baseline gap-1',
          sizeClass,
          toneClass,
        )}
      >
        {icon}
        <span className="truncate">{value}</span>
        {unit && (
          <span className="text-footnote font-sans font-medium text-ink-2">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

/** Signed change vs the previous period; direction and wording, never color alone. */
export function Delta({
  value,
  suffix = 'vs período anterior',
}: {
  value: number | undefined;
  suffix?: string;
}) {
  if (value === undefined)
    return <span className="text-caption text-ink-3">Sem base anterior</span>;
  const up = value > 0;
  const flat = value === 0;
  return (
    <span
      className={cx(
        'text-caption',
        flat ? 'text-ink-2' : up ? 'text-success-ink' : 'text-danger-ink',
      )}
    >
      {flat ? '=' : up ? '▲' : '▼'} {Math.abs(value)}%{' '}
      <span className="text-ink-3">{suffix}</span>
    </span>
  );
}
