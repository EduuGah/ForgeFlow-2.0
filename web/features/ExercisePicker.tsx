import { useMemo, useState, type ReactNode } from 'react';
import { Check, Clock, Plus, Search, Star, X } from 'lucide-react';
import type { Exercise } from '../../src/domain/training/entities';
import { actions, useAppStore } from '../store';
import { MUSCLE_GROUPS, muscleLabel } from '../lib/training';
import {
  EMPTY_FILTER,
  EQUIPMENT_KINDS,
  countBy,
  equipmentKinds,
  filterExercises,
  recentExerciseIds,
  type ExerciseFilterState,
  type ExerciseOnly,
} from '../lib/exerciseFilter';
import { exerciseAliases } from '../data/aliases';
import { Button } from '../ui/Button';
import { EmptyState, ExerciseThumb } from '../ui/Feedback';
import { SelectField, TextAreaField, TextField } from '../ui/Form';
import { OptionPicker } from '../ui/OptionPicker';
import { Sheet, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function useExerciseFilter(exercises: Exercise[], favorites: string[]) {
  const { history } = useAppStore();
  const recent = useMemo(() => recentExerciseIds(history), [history]);
  const [state, setState] = useState<ExerciseFilterState>(EMPTY_FILTER);
  const update = (patch: Partial<ExerciseFilterState>) =>
    setState((current) => ({ ...current, ...patch }));

  const { main, synergy } = useMemo(
    () =>
      filterExercises(exercises, state, {
        favorites,
        recent,
        aliases: exerciseAliases,
      }),
    [exercises, state, favorites, recent],
  );
  const counts = useMemo(
    () => ({
      muscle: countBy(exercises, (exercise) => [exercise.primaryMuscleGroup]),
      equipment: countBy(exercises, (exercise) =>
        equipmentKinds(exercise.equipment),
      ),
    }),
    [exercises],
  );

  return {
    state,
    update,
    reset: () => setState({ ...EMPTY_FILTER, query: state.query }),
    /** Something besides the search narrows the list. */
    narrowed:
      state.muscle !== 'all' ||
      state.equipment !== 'all' ||
      state.only !== 'all',
    hasRecent: recent.length > 0,
    counts,
    main,
    synergy,
  };
}

export type ExerciseFilter = ReturnType<typeof useExerciseFilter>;

function Toggle({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: typeof Star;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPress}
      className={cx(
        'pressable text-footnote inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-semibold',
        active ? 'bg-brand text-on-brand' : 'bg-raised text-ink-2',
      )}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

export function ExerciseSearchBar({ filter }: { filter: ExerciseFilter }) {
  const { state, update, counts } = filter;
  const only = (value: ExerciseOnly) =>
    update({ only: state.only === value ? 'all' : value });
  const detail = (count: number | undefined) =>
    plural(count ?? 0, 'exercício', 'exercícios');
  return (
    <div className="space-y-2.5">
      <label className="relative block">
        <span className="sr-only">Buscar exercício</span>
        <Search
          size={18}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
          aria-hidden="true"
        />
        <input
          type="search"
          value={state.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Buscar exercício"
          className="text-body h-11 w-full rounded-md bg-raised pr-3 pl-10 outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <OptionPicker
          label="Músculo"
          value={state.muscle}
          onChange={(muscle) => update({ muscle })}
          options={[
            { value: 'all', label: 'Todos' },
            ...MUSCLE_GROUPS.map((group) => ({
              value: group,
              label: muscleLabel(group),
              detail: detail(counts.muscle.get(group)),
            })),
          ]}
        />
        <OptionPicker
          label="Equipamento"
          value={state.equipment}
          onChange={(equipment) => update({ equipment })}
          options={[
            { value: 'all', label: 'Todos' },
            ...EQUIPMENT_KINDS.filter((kind) => counts.equipment.has(kind)).map(
              (kind) => ({
                value: kind,
                label: kind,
                detail: detail(counts.equipment.get(kind)),
              }),
            ),
          ]}
        />
      </div>
      <div className="flex items-center gap-2">
        <Toggle
          active={state.only === 'favorites'}
          icon={Star}
          label="Favoritos"
          onPress={() => only('favorites')}
        />
        {filter.hasRecent && (
          <Toggle
            active={state.only === 'recent'}
            icon={Clock}
            label="Recentes"
            onPress={() => only('recent')}
          />
        )}
        {filter.narrowed && (
          <button
            type="button"
            onClick={filter.reset}
            className="text-footnote ml-auto inline-flex h-8 items-center gap-1 px-1 font-semibold text-brand-ink"
          >
            <X size={14} aria-hidden="true" />
            Limpar
          </button>
        )}
      </div>
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
  const helpers = exercise.secondaryMuscleGroups.map(muscleLabel);
  return (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onPress}
        aria-pressed={selected}
        className={cx(
          'flex min-h-16 min-w-0 flex-1 items-center gap-3.5 rounded-md px-2 py-2 text-left transition-colors active:bg-raised',
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
          {helpers.length > 0 && (
            <span className="text-caption block truncate text-ink-3">
              Sinergia: {helpers.join(', ')}
            </span>
          )}
        </span>
      </button>
      {trailing}
    </li>
  );
}

/**
 * The filtered list: exercises focused on the chosen muscle, then the ones
 * where it only helps, under their own heading.
 */
export function ExerciseResults({
  filter,
  renderRow,
  empty,
  className,
}: {
  filter: ExerciseFilter;
  renderRow: (exercise: Exercise) => ReactNode;
  empty: ReactNode;
  className?: string;
}) {
  const { main, synergy, state } = filter;
  const total = main.length + synergy.length;
  return (
    <div className={className}>
      <p className="text-footnote px-2 pt-1 pb-1 text-ink-3" aria-live="polite">
        {plural(total, 'exercício', 'exercícios')}
      </p>
      {total === 0 ? (
        empty
      ) : (
        <>
          {main.length > 0 && (
            <ul role="list" aria-label="Exercícios">
              {main.map(renderRow)}
            </ul>
          )}
          {synergy.length > 0 && (
            <section aria-label="Exercícios de sinergia" className="mt-3">
              <p className="px-2 pt-2 pb-1">
                <span className="text-micro block font-semibold tracking-wider text-ink-3 uppercase">
                  Sinergia
                </span>
                <span className="text-footnote block text-ink-2">
                  {muscleLabel(state.muscle)} ajuda nestes exercícios (conta
                  meia série)
                </span>
              </p>
              <ul role="list">{synergy.map(renderRow)}</ul>
            </section>
          )}
        </>
      )}
    </div>
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
  const filter = useExerciseFilter(available, favorites);
  const { state, update } = filter;
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setSelected([]);
      update(EMPTY_FILTER);
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
        <div className="sticky top-0 z-10 -mx-3 bg-surface px-5 pb-2">
          <ExerciseSearchBar filter={filter} />
        </div>
        <ExerciseResults
          filter={filter}
          renderRow={(exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              favorite={favorites.includes(exercise.id)}
              selected={selected.some((item) => item.id === exercise.id)}
              onPress={() => toggle(exercise)}
            />
          )}
          empty={
            <EmptyState
              art="search"
              title="Nenhum exercício encontrado"
              message="Tente outro termo, limpe os filtros ou crie um exercício personalizado."
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
          }
        />
      </Sheet>
      <CustomExerciseSheet
        open={creating}
        initialName={state.query}
        onClose={() => setCreating(false)}
        onCreated={(exercise) => {
          if (mode === 'single') {
            onConfirm([exercise]);
            onClose();
          } else {
            setSelected((current) => [...current, exercise]);
            update({ query: '' });
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
