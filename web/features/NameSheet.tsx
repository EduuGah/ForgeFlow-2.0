import { useState } from 'react';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';
import { Sheet } from '../ui/Overlay';

/** Small sheet asking for one name (folders, gyms). */
export function NameSheet({
  open,
  title,
  description,
  label,
  placeholder,
  initial = '',
  saveLabel,
  maxLength = 60,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  initial?: string;
  saveLabel: string;
  maxLength?: number;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setValue(initial);
  }
  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onClose();
    onSave(trimmed);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <Button size="lg" block disabled={!value.trim()} onClick={save}>
          {saveLabel}
        </Button>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label={label}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          autoFocus
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
    </Sheet>
  );
}
