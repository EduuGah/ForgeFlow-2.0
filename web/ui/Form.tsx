import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Minus, Plus } from 'lucide-react';
import { cx } from './core';

const CONTROL =
  'w-full rounded-md border border-transparent bg-raised px-3.5 text-body text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand-ink disabled:opacity-50';

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-footnote mb-1.5 block font-medium text-ink-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-footnote mt-1.5 text-danger-ink"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-footnote mt-1.5 text-ink-3">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string;
  hint?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export function TextField({
  label,
  hint,
  error,
  containerClassName,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      className={containerClassName}
    >
      <input
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          error ? `${id}-error` : hint ? `${id}-hint` : undefined
        }
        className={cx(CONTROL, 'h-12', error && 'border-danger-ink', className)}
        {...rest}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id'
> {
  label: string;
  hint?: ReactNode;
  containerClassName?: string;
}

export function TextAreaField({
  label,
  hint,
  containerClassName,
  className,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      className={containerClassName}
    >
      <textarea
        id={id}
        rows={rows}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cx(CONTROL, 'resize-none py-3', className)}
        {...rest}
      />
    </FieldShell>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: ReactNode;
  containerClassName?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  containerClassName,
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cx(CONTROL, 'h-12 appearance-none pr-10')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Numeric input                                                       */
/* ------------------------------------------------------------------ */

function formatNumeric(value: number, zeroAsEmpty: boolean): string {
  if (zeroAsEmpty && value === 0) return '';
  return String(value).replace('.', ',');
}

function parseNumeric(text: string, decimal: boolean): number | null {
  const normalized = text.replace(',', '.').trim();
  if (normalized === '' || normalized === '.') return null;
  const value = decimal ? Number(normalized) : Number.parseInt(normalized, 10);
  return Number.isFinite(value) ? value : null;
}

interface NumericInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'inputMode'
> {
  value: number;
  onValueChange: (value: number) => void;
  decimal?: boolean;
  min?: number;
  max?: number;
  zeroAsEmpty?: boolean;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Keeps a text draft while focused, so the field can be cleared and retyped
 * (the old `parseFloat(value) || 0` pattern snapped an empty field back to 0).
 * Accepts both "62,5" and "62.5"; selects its content on focus for fast edits.
 */
export function NumericInput({
  value,
  onValueChange,
  decimal = false,
  min = 0,
  max = 99_999,
  zeroAsEmpty = false,
  onFocus,
  onBlur,
  className,
  ...rest
}: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      autoComplete="off"
      enterKeyHint="done"
      value={draft ?? formatNumeric(value, zeroAsEmpty)}
      onFocus={(event) => {
        setDraft(formatNumeric(value, zeroAsEmpty));
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onChange={(event) => {
        const text = event.target.value;
        const allowed = decimal ? /^\d*[.,]?\d{0,2}$/ : /^\d*$/;
        if (!allowed.test(text)) return;
        setDraft(text);
        const parsed = parseNumeric(text, decimal);
        if (parsed !== null) onValueChange(clamp(parsed));
      }}
      onBlur={(event) => {
        if (draft !== null && parseNumeric(draft, decimal) === null)
          onValueChange(clamp(0));
        setDraft(null);
        onBlur?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      className={className}
      {...rest}
    />
  );
}

interface NumberFieldProps extends Omit<NumericInputProps, 'id' | 'className'> {
  label: string;
  suffix?: string;
  hint?: ReactNode;
  containerClassName?: string;
}

export function NumberField({
  label,
  suffix,
  hint,
  containerClassName,
  ...rest
}: NumberFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      className={containerClassName}
    >
      <div className="relative">
        <NumericInput
          id={id}
          className={cx(CONTROL, 'h-12 tabular', suffix && 'pr-14')}
          {...rest}
        />
        {suffix && (
          <span className="text-callout pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/* ------------------------------------------------------------------ */
/* Choices                                                             */
/* ------------------------------------------------------------------ */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-8 w-13 shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-overlay',
      )}
    >
      <span
        className={cx(
          'absolute left-0.5 size-7 rounded-full bg-white shadow transition-transform duration-200 ease-standard',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Pill chips (Hevy "Duração / Volume / Repetições"). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('scrollbar-none flex gap-2 overflow-x-auto', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'pressable text-callout h-9 shrink-0 rounded-full px-4 font-medium transition-colors',
              selected
                ? 'bg-brand text-on-brand'
                : 'bg-raised text-ink active:bg-overlay',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Underlined tabs (exercise detail: Resumo / Histórico / Instruções). */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid rounded-lg bg-raised p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-md bg-surface shadow-sm ring-1 ring-line transition-transform duration-300 ease-standard"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={`tab-${option.value}`}
            aria-selected={selected}
            aria-controls={`panel-${option.value}`}
            onClick={() => onChange(option.value)}
            className={cx(
              'text-callout relative h-9 rounded-md font-semibold transition-colors',
              selected ? 'text-ink' : 'text-ink-2',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** − value + control for small integers (sets, reps). */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div>
      <label
        htmlFor={id}
        className="text-footnote mb-1.5 block font-medium text-ink-2"
      >
        {label}
      </label>
      <div className="flex h-12 items-center rounded-md bg-raised">
        <button
          type="button"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="grid h-full w-11 shrink-0 place-items-center rounded-l-md text-ink-2 active:bg-overlay disabled:opacity-30"
        >
          <Minus size={18} aria-hidden="true" />
        </button>
        <NumericInput
          id={id}
          value={value}
          min={min}
          max={max}
          onValueChange={onChange}
          className="text-body h-full min-w-0 flex-1 bg-transparent text-center font-semibold tabular outline-none"
        />
        <button
          type="button"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="grid h-full w-11 shrink-0 place-items-center rounded-r-md text-ink-2 active:bg-overlay disabled:opacity-30"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
