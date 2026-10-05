import { useMemo, useState, type ReactNode } from 'react';
import { Check, Plus, Search, Star } from 'lucide-react';
import type { Exercise } from '../../src/domain/training/entities';
import { actions, useAppStore } from '../store';
import { searchKey } from '../lib/format';
import { MUSCLE_GROUPS, muscleLabel } from '../lib/training';
import { Button } from '../ui/Button';
import { EmptyState, ExerciseThumb } from '../ui/Feedback';
import {
  SegmentedControl,
  SelectField,
  TextAreaField,
  TextField,
} from '../ui/Form';
import { Sheet, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'favorites', label: 'Favoritos' },
  ...MUSCLE_GROUPS.map((group) => ({
    value: group,
    label: muscleLabel(group),
  })),
];

export function useExerciseFilter(exercises: Exercise[], favorites: string[]) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const key = searchKey(query);
    return exercises
      .filter((exercise) => {
        if (filter === 'favorites' && !favorites.includes(exercise.id))
          return false;
        if (
          filter !== 'all' &&
          filter !== 'favorites' &&
          exercise.primaryMuscleGroup !== filter &&
          !exercise.secondaryMuscleGroups.includes(filter)
        ) {
          return false;
        }
        if (!key) return true;
        return (
          searchKey(exercise.name).includes(key) ||
          searchKey(exercise.primaryMuscleGroup).includes(key) ||
          searchKey(exercise.equipment ?? '').includes(key)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [exercises, favorites, filter, query]);

  return { query, setQuery, filter, setFilter, filtered };
}

export function ExerciseSearchBar({
  query,
  onQuery,
  filter,
  onFilter,
}: {
  query: string;
  onQuery: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Buscar exercício</span>
        <Search
          size={18}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Buscar exercício"
          className="text-body h-11 w-full rounded-md bg-raised pr-3 pl-10 outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink"
        />
      </label>
      <SegmentedControl
        label="Filtrar por grupo muscular"
        options={FILTERS}
        value={filter}
        onChange={onFilter}
      />
    </div>
  );
}

export function ExerciseRow({
  exercise,
  selected,
  favorite,
  onPress,
  trailing,
}: {
  exercise: Exercise;
  selected?: boolean;
  favorite?: boolean;
  onPress: () => void;
  trailing?: ReactNode;
}) {
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onPress}
        aria-pressed={selected}
        className={cx(
          'flex min-h-16 flex-1 items-center gap-3.5 rounded-md px-2 py-2 text-left transition-colors active:bg-raised',
          selected && 'bg-brand-soft',
        )}
      >
        <span className="relative">
          <ExerciseThumb
            muscle={exercise.primaryMuscleGroup}
            exerciseId={exercise.id}
            size={44}
          />
          {selected && (
            <span className="absolute -right-1 -bottom-1 grid size-5 animate-pop place-items-center rounded-full bg-brand text-on-brand ring-2 ring-surface">
              <Check size={12} strokeWidth={3} aria-hidden="true" />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body flex items-center gap-1.5 font-medium">
            <span className="truncate">{exercise.name}</span>
            {favorite && (
              <Star
                size={13}
                className="shrink-0 fill-record text-record"
                aria-label="Favorito"
              />
            )}
          </span>
          <span className="text-footnote block truncate text-ink-2">
            {muscleLabel(exercise.primaryMuscleGroup)}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
            {!exercise.isSystem ? ' · Personalizado' : ''}
          </span>
        </span>
      </button>
      {trailing}
    </li>
  );
}

const NO_IDS: string[] = [];

/** Bottom sheet to pick one or several exercises from the catalog. */
export function ExercisePicker({
  open,
  onClose,
  onConfirm,
  mode = 'multi',
  title = 'Adicionar exercícios',
  excludeIds = NO_IDS,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (exercises: Exercise[]) => void;
  mode?: 'multi' | 'single';
  title?: string;
  excludeIds?: string[];
}) {
  const { allExercises, favorites } = useAppStore();
  const available = useMemo(
    () => allExercises.filter((exercise) => !excludeIds.includes(exercise.id)),
    [allExercises, excludeIds],
  );
  const { query, setQuery, filter, setFilter, filtered } = useExerciseFilter(
    available,
    favorites,
  );
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setSelected([]);
      setQuery('');
      setFilter('all');
    }
  }

  const toggle = (exercise: Exercise) => {
    if (mode === 'single') {
      onConfirm([exercise]);
      onClose();
      return;
    }
    setSelected((current) =>
      current.some((item) => item.id === exercise.id)
        ? current.filter((item) => item.id !== exercise.id)
        : [...current, exercise],
    );
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={title}
        size="tall"
        headerAction={
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() => setCreating(true)}
          >
            Criar
          </Button>
        }
        footer={
          mode === 'multi' ? (
            <Button
              size="lg"
              block
              disabled={selected.length === 0}
              onClick={() => {
                onConfirm(selected);
                onClose();
              }}
            >
              {selected.length === 0
                ? 'Selecione exercícios'
                : `Adicionar ${selected.length} ${selected.length === 1 ? 'exercício' : 'exercícios'}`}
            </Button>
          ) : undefined
        }
        bodyClassName="px-3"
      >
        <div className="sticky top-0 z-10 -mx-3 bg-surface px-5 pb-3">
          <ExerciseSearchBar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum exercício encontrado"
            message="Tente outro termo ou crie um exercício personalizado."
            action={
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => setCreating(true)}
              >
                Criar exercício
              </Button>
            }
          />
        ) : (
          <ul role="list" aria-label="Exercícios">
            {filtered.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                favorite={favorites.includes(exercise.id)}
                selected={selected.some((item) => item.id === exercise.id)}
                onPress={() => toggle(exercise)}
              />
            ))}
          </ul>
        )}
      </Sheet>
      <CustomExerciseSheet
        open={creating}
        initialName={query}
        onClose={() => setCreating(false)}
        onCreated={(exercise) => {
          if (mode === 'single') {
            onConfirm([exercise]);
            onClose();
          } else {
            setSelected((current) => [...current, exercise]);
            setQuery('');
          }
        }}
      />
    </>
  );
}

const EQUIPMENT = [
  'Barra',
  'Halteres',
  'Máquina',
  'Cabo',
  'Peso corporal',
  'Kettlebell',
  'Elástico',
  'Máquina Smith',
  'Outro',
];

export function CustomExerciseSheet({
  open,
  onClose,
  onCreated,
  initialName = '',
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
  initialName?: string;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState('Peito');
  const [equipment, setEquipment] = useState('Barra');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setDescription('');
      setSubmitted(false);
    }
  }

  const trimmed = name.trim();
  const error =
    submitted && trimmed.length < 2
      ? 'Dê um nome com pelo menos 2 letras.'
      : undefined;

  const save = () => {
    setSubmitted(true);
    if (trimmed.length < 2) return;
    const created = actions.createCustomExercise({
      name: trimmed,
      primaryMuscleGroup: muscle,
      equipment,
      description: description.trim() || undefined,
    });
    toast({
      tone: 'success',
      title: 'Exercício criado',
      description: created.name,
    });
    onCreated?.(created);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Novo exercício"
      description="Fica disponível na biblioteca e nas suas rotinas."
      footer={
        <Button size="lg" block onClick={save}>
          Criar exercício
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label="Nome"
          value={name}
          maxLength={80}
          placeholder="Ex.: Supino inclinado articulado"
          onChange={(event) => setName(event.target.value)}
          error={error}
        />
        <div>
          <p className="text-footnote mb-1.5 font-medium text-ink-2">
            Grupo muscular principal
          </p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                aria-pressed={muscle === group}
                onClick={() => setMuscle(group)}
                className={cx(
                  'pressable text-callout h-9 rounded-full px-4 font-medium',
                  muscle === group
                    ? 'bg-brand text-on-brand'
                    : 'bg-raised text-ink',
                )}
              >
                {muscleLabel(group)}
              </button>
            ))}
          </div>
        </div>
        <SelectField
          label="Equipamento"
          value={equipment}
          onChange={setEquipment}
          options={EQUIPMENT.map((item) => ({ value: item, label: item }))}
        />
        <TextAreaField
          label="Instruções (opcional)"
          value={description}
          maxLength={500}
          placeholder="Como executar, pontos de atenção…"
          onChange={(event) => setDescription(event.target.value)}
        />
      </form>
    </Sheet>
  );
}
