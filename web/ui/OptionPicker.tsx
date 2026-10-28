import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ActionSheet } from './Overlay';
import { cx } from './core';

/**
 * One button with the current choice; a tap lists every option. For short
 * lists that would otherwise be a row of chips running off the screen.
 */
export function OptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; detail?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label}: ${current?.label ?? ''}. Trocar`}
        className={cx(
          'pressable flex h-11 w-full items-center gap-2 rounded-md border border-line bg-raised px-3 text-left',
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="text-micro block font-semibold tracking-wider text-ink-3 uppercase">
            {label}
          </span>
          <span className="text-callout block truncate leading-tight font-semibold">
            {current?.label}
          </span>
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-ink-3"
          aria-hidden="true"
        />
      </button>
      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        actions={options.map((option) => ({
          label: option.label,
          description: option.detail,
          icon: option.value === value ? Check : undefined,
          tone: option.value === value ? 'brand' : 'default',
          onSelect: () => onChange(option.value),
        }))}
      />
    </>
  );
}
