import { useState } from 'react';
import { Check, MapPin, MapPinOff, Plus } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { Button } from '../ui/Button';
import { cx } from '../ui/core';
import { ActionSheet, type SheetAction } from '../ui/Overlay';
import { NameSheet } from './NameSheet';

/** Sheet that names a new gym and hands back its id. */
export function NewGymSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (gymId: string) => void;
}) {
  return (
    <NameSheet
      open={open}
      onClose={onClose}
      title="Nova academia"
      description="Salve onde você treina para ver quanto treinou em cada lugar."
      label="Nome da academia"
      placeholder="Ex.: Smart Fit Centro"
      saveLabel="Salvar academia"
      onSave={(name) => onCreated(actions.createGym(name))}
    />
  );
}

/**
 * Inline gym choice (workout summary): one chip per gym plus "Nenhuma", and a
 * button to add a new gym.
 */
export function GymChips({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (gymId: string | null) => void;
}) {
  const { gyms } = useAppStore();
  const [creating, setCreating] = useState(false);
  const known = gyms.some((gym) => gym.id === value) ? value : null;
  return (
    <>
      {gyms.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <div
            role="radiogroup"
            aria-label="Academia do treino"
            className="contents"
          >
            {[
              ...gyms.map((gym) => ({ value: gym.id, label: gym.name })),
              { value: '', label: 'Nenhuma' },
            ].map((option) => {
              const selected = (known ?? '') === option.value;
              return (
                <button
                  key={option.value || 'none'}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(option.value || null)}
                  className={cx(
                    'pressable text-callout h-9 max-w-full truncate rounded-full px-4 font-medium transition-colors',
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
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="pressable text-callout inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 font-medium text-brand-ink active:bg-raised"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Nova
          </button>
        </div>
      ) : (
        <Button
          variant="secondary"
          block
          icon={MapPin}
          onClick={() => setCreating(true)}
        >
          Adicionar academia
        </Button>
      )}
      <NewGymSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={onChange}
      />
    </>
  );
}

/** Action sheet to pick, clear or create the gym of a finished workout. */
export function GymPickerSheet({
  open,
  value,
  onClose,
  onChange,
}: {
  open: boolean;
  value: string | null;
  onClose: () => void;
  onChange: (gymId: string | null) => void;
}) {
  const { gyms } = useAppStore();
  const [creating, setCreating] = useState(false);
  const known = gyms.some((gym) => gym.id === value) ? value : null;
  const choices: SheetAction[] = [
    ...gyms.map((gym): SheetAction => ({
      label: gym.name,
      icon: gym.id === known ? Check : MapPin,
      tone: gym.id === known ? 'brand' : 'default',
      onSelect: () => onChange(gym.id),
    })),
    {
      label: 'Sem academia',
      icon: known ? MapPinOff : Check,
      tone: known ? 'default' : 'brand',
      onSelect: () => onChange(null),
    },
    { label: 'Nova academia…', icon: Plus, onSelect: () => setCreating(true) },
  ];
  return (
    <>
      <ActionSheet
        open={open}
        onClose={onClose}
        title="Onde foi este treino?"
        actions={choices}
      />
      <NewGymSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={onChange}
      />
    </>
  );
}
