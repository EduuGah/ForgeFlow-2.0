import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './core';

export type ButtonVariant =
  'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand active:bg-brand-press disabled:bg-overlay disabled:text-ink-3',
  secondary: 'bg-raised text-ink active:bg-overlay disabled:text-ink-3',
  tinted: 'bg-brand-soft text-brand-ink active:bg-overlay disabled:text-ink-3',
  ghost: 'bg-transparent text-brand-ink active:bg-raised disabled:text-ink-3',
  danger:
    'bg-danger text-white active:opacity-90 disabled:bg-overlay disabled:text-ink-3',
  'danger-ghost':
    'bg-transparent text-danger-ink active:bg-danger-soft disabled:text-ink-3',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 gap-1.5 text-callout rounded-md',
  md: 'h-11 px-4 gap-2 text-body rounded-md',
  lg: 'h-13 px-5 gap-2 text-headline rounded-lg',
};

const ICON_SIZES: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  trailingIcon: TrailingIcon,
  loading = false,
  block = false,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = ICON_SIZES[size];
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'pressable inline-flex shrink-0 select-none items-center justify-center font-semibold whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={iconSize} />
      ) : (
        Icon && <Icon size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      )}
      <span className="truncate">{children}</span>
      {TrailingIcon && !loading && (
        <TrailingIcon size={iconSize} strokeWidth={2.25} aria-hidden="true" />
      )}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'plain' | 'raised' | 'tinted' | 'danger';
  size?: 'sm' | 'md';
  iconSize?: number;
}

const ICON_VARIANTS = {
  plain: 'text-ink active:bg-raised',
  raised: 'bg-raised text-ink active:bg-overlay',
  tinted: 'bg-brand-soft text-brand-ink active:bg-overlay',
  danger: 'text-danger-ink active:bg-danger-soft',
};

/** Icon-only action with a 44px touch target and an accessible name. */
export function IconButton({
  icon: Icon,
  label,
  variant = 'plain',
  size = 'md',
  iconSize,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'pressable inline-flex shrink-0 items-center justify-center rounded-full disabled:opacity-40',
        size === 'md' ? 'size-11' : 'size-9',
        ICON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      <Icon
        size={iconSize ?? (size === 'md' ? 22 : 18)}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  );
}

export function Spinner({
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
      className={cx('animate-spin', className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
