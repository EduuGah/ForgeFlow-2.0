import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flag,
  Flame,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  StickyNote,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { actions, useAppStore, type FinishResult } from '../store';
import type {
  ActiveExerciseSession,
  CompletedSet,
  PersonalRecordType,
  SetEntry,
} from '../lib/types';
import {
  formatClock,
  formatNumber,
  formatRestLabel,
  formatWeight,
} from '../lib/format';
import {
  RECORD_LABELS,
  alignPreviousSets,
  beatsRecord,
  bestRecordValues,
  countPendingSets,
  previousSetsFor,
  recordsBySet,
  setLabels,
  setRecordValue,
  summarizeActiveWorkout,
  type RecordBests,
} from '../lib/training';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ExerciseThumb, Medal, RecordBadge } from '../ui/Feedback';
import { NumericInput, TextField } from '../ui/Form';
import {
  ActionSheet,
  Sheet,
  useConfirm,
  useToast,
  type SheetAction,
} from '../ui/Overlay';
import {
  cx,
  useBackLayer,
  useNow,
  usePresence,
  useScrollLock,
} from '../ui/core';
import { ExercisePicker } from './ExercisePicker';
import { RestTimerBar } from './RestTimer';
import { ExerciseDetailView } from '../screens/ExerciseDetailScreen';
import { SwipeToDelete, usePullDown } from '../ui/Swipe';
import { DragHandle, SortableList, type DragHandleProps } from '../ui/Sortable';

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const SET_GRID =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] items-center gap-2 lg:grid-cols-[3rem_minmax(0,1fr)_6rem_5rem_3rem] lg:gap-3';

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function ActiveWorkoutScreen({
  onFinished,
}: {
  onFinished: (result: FinishResult) => void;
}) {
  const { activeWorkout, prs, history } = useAppStore();
  const { workoutOpen, closeWorkout } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const open = workoutOpen && Boolean(activeWorkout);
  const { mounted, closing, onExited } = usePresence(open, 460);
  // Pull the header down to minimize, like closing a sheet.
  const pull = usePullDown(closeWorkout);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) pull.reset();
  }
  useBackLayer(open, closeWorkout);
  useScrollLock(mounted);

  // Keep rendering the last session while the sheet slides away after finishing.
  const [lastWorkout, setLastWorkout] = useState(activeWorkout);
  if (activeWorkout && activeWorkout !== lastWorkout)
    setLastWorkout(activeWorkout);
  const workout = activeWorkout ?? lastWorkout;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [infoExerciseId, setInfoExerciseId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bests = useMemo(() => bestRecordValues(prs), [prs]);
  const exerciseKeys = (workout?.exercises ?? []).map(
    (exercise, index) => exercise.key ?? `${exercise.exerciseId}-${index}`,
  );

  // Scroll to exercises added to the session already on screen — not when a
  // new session opens (it must start at the top).
  const sessionId = workout?.id ?? null;
  const exerciseCount = workout?.exercises.length ?? 0;
  const previous = useRef({ sessionId, exerciseCount });
  useEffect(() => {
    const before = previous.current;
    if (
      before.sessionId === sessionId &&
      exerciseCount > before.exerciseCount
    ) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    previous.current = { sessionId, exerciseCount };
  }, [sessionId, exerciseCount]);

  if (!mounted || !workout) return null;

  const summary = summarizeActiveWorkout(workout);
  const currentIndex = workout.exercises.findIndex((exercise) =>
    exercise.sets.some((set) => !set.completed),
  );

  const finish = async () => {
    const completed = workout.exercises.reduce(
      (total, exercise) =>
        total +
        exercise.sets.filter((set) => set.completed && set.repetitions > 0)
          .length,
      0,
    );
    if (completed === 0) {
      const discard = await confirm({
        title: 'Nenhuma série concluída',
        message:
          'Marque ao menos uma série com ✓ para salvar este treino, ou descarte-o.',
        confirmLabel: 'Descartar treino',
        cancelLabel: 'Continuar treinando',
        tone: 'danger',
        icon: Dumbbell,
      });
      if (discard) {
        actions.discardActiveWorkout();
        closeWorkout();
        toast({ title: 'Treino descartado' });
      }
      return;
    }

    const pending = countPendingSets(workout);
    const ok = await confirm({
      title: 'Finalizar treino?',
      icon: Trophy,
      message: (
        <>
          {formatNumber(summary.completedSets, 0)} séries ·{' '}
          {formatWeight(summary.volumeKg)} kg de volume.
          {pending > 0 && (
            <span className="mt-2 block text-warmup">
              {pending}{' '}
              {pending === 1
                ? 'série não marcada será descartada'
                : 'séries não marcadas serão descartadas'}
              .
            </span>
          )}
        </>
      ),
      confirmLabel: 'Finalizar treino',
      cancelLabel: 'Voltar ao treino',
    });
    if (!ok) return;
    const result = actions.finishActiveWorkout();
    if (!result) return;
    haptic(result.records.length > 0 ? 'celebrate' : 'success');
    closeWorkout();
    onFinished(result);
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'Descartar treino?',
      message: 'As séries registradas neste treino serão perdidas.',
      confirmLabel: 'Descartar treino',
      cancelLabel: 'Continuar treinando',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.discardActiveWorkout();
    closeWorkout();
    toast({ title: 'Treino descartado' });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Treino em andamento: ${workout.name}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && closing) onExited();
      }}
      className={cx(
        'fixed inset-y-0 right-0 left-[var(--sidebar-width)] z-45 flex flex-col bg-canvas',
        closing ? 'animate-sheet-out' : 'animate-sheet-in',
      )}
      style={{
        translate: `0 ${pull.offset}px`,
        transition: pull.pulling ? 'none' : 'translate 240ms var(--ease-sheet)',
      }}
    >
      {/* Top bar + session strip (pull down to minimize) */}
      <header
        {...pull.handlers}
        className="pt-safe shrink-0 touch-none border-b border-line bg-surface select-none"
      >
        <div
          className="mx-auto mt-1.5 h-1 w-9 rounded-full bg-line-strong lg:invisible"
          aria-hidden="true"
        />
        <div className="app-column flex h-13 items-center gap-1 px-2">
          <IconButton
            icon={ChevronDown}
            label="Minimizar treino"
            onClick={closeWorkout}
          />
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-2 text-left active:bg-raised"
            aria-label={`Renomear treino ${workout.name}`}
          >
            <span className="text-headline truncate font-semibold">
              {workout.name}
            </span>
            <Pencil
              size={14}
              className="shrink-0 text-ink-3"
              aria-hidden="true"
            />
          </button>
          <IconButton
            icon={MoreHorizontal}
            label="Opções do treino"
            onClick={() => setMenuOpen(true)}
          />
          <Button size="sm" icon={Flag} onClick={finish} className="ml-1">
            Finalizar
          </Button>
        </div>
        <div className="app-column px-4 pt-1 pb-3">
          <div className="flex items-end gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-caption text-ink-2">Tempo de treino</p>
              <ElapsedClock startedAt={workout.startedAt} />
            </div>
            <div className="text-right">
              <p className="text-caption text-ink-2">Volume</p>
              <p className="font-metric text-metric-sm tabular">
                {formatWeight(summary.volumeKg)}
                <span className="text-caption ml-0.5 font-sans text-ink-2">
                  kg
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-caption text-ink-2">Séries</p>
              <p className="font-metric text-metric-sm tabular">
                {summary.completedSets}
                <span className="text-caption font-sans text-ink-2">
                  /{summary.totalSets}
                </span>
              </p>
            </div>
          </div>
          <SessionProgress exercises={workout.exercises} />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="app-column space-y-3 px-3 pt-3 pb-40">
          {workout.exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Treino vazio"
              message="Adicione os exercícios que você vai fazer hoje. Carga e repetições do último treino aparecem como referência."
            />
          ) : (
            <SortableList
              label="Exercícios do treino"
              ids={exerciseKeys}
              nameOf={(key) =>
                workout.exercises[exerciseKeys.indexOf(key)]?.exerciseName ?? ''
              }
              onMove={actions.reorderActiveExercise}
              className="space-y-3"
              renderOverlay={(key) => {
                const exercise = workout.exercises[exerciseKeys.indexOf(key)];
                return exercise ? (
                  <ExercisePreview exercise={exercise} />
                ) : null;
              }}
            >
              {(key, index, { handle, sorting }) => {
                const exercise = workout.exercises[index];
                return (
                  <ExerciseBlock
                    exercise={exercise}
                    index={index}
                    total={workout.exercises.length}
                    current={index === currentIndex}
                    previous={previousSetsFor(
                      history,
                      exercise.exerciseId,
                      exercise.exerciseName,
                    )}
                    bests={bests.get(exercise.exerciseId)}
                    handle={handle}
                    compact={sorting}
                    onShowInfo={() => setInfoExerciseId(exercise.exerciseId)}
                  />
                );
              }}
            </SortableList>
          )}

          <div className="pt-2">
            <Button
              size="lg"
              variant="tinted"
              block
              icon={Plus}
              onClick={() => setPickerOpen(true)}
            >
              Adicionar exercício
            </Button>
          </div>
        </div>
      </div>

      <RestTimerBar />

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={workout.name}
        actions={[
          {
            label: 'Renomear treino',
            icon: Pencil,
            onSelect: () => setRenaming(true),
          },
          {
            label: 'Iniciar descanso',
            icon: Timer,
            onSelect: () => setRestPickerOpen(true),
          },
          {
            label: 'Descartar treino',
            icon: Trash2,
            tone: 'danger',
            onSelect: discard,
          },
        ]}
      />
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(exercises) => {
          actions.addExercisesToActiveWorkout(exercises);
          haptic('tap');
        }}
      />
      <RenameSheet
        open={renaming}
        name={workout.name}
        onClose={() => setRenaming(false)}
      />
      <RestStartSheet
        open={restPickerOpen}
        onClose={() => setRestPickerOpen(false)}
      />
      <Sheet
        open={infoExerciseId !== null}
        onClose={() => setInfoExerciseId(null)}
        size="tall"
        bodyClassName="px-0 pb-0"
      >
        {infoExerciseId && (
          <ExerciseDetailView exerciseId={infoExerciseId} embedded />
        )}
      </Sheet>
    </div>,
    document.body,
  );
}

/** Only this node re-renders every second. */
function ElapsedClock({ startedAt }: { startedAt: string }) {
  const now = useNow(1000);
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  return (
    <p
      className="font-metric text-metric-lg text-brand-ink tabular"
      aria-live="off"
    >
      {formatClock(seconds)}
    </p>
  );
}

/** One segment per exercise, sized by its sets and filled as they are done. */
function SessionProgress({
  exercises,
}: {
  exercises: ActiveExerciseSession[];
}) {
  if (exercises.length === 0) return null;
  return (
    <div className="mt-3 flex h-1.5 gap-1" aria-hidden="true">
      {exercises.map((exercise, index) => {
        const done = exercise.sets.filter((set) => set.completed).length;
        const total = Math.max(1, exercise.sets.length);
        return (
          <span
            key={`${exercise.exerciseId}-${index}`}
            className="h-full overflow-hidden rounded-full bg-raised"
            style={{ flexGrow: total, flexBasis: 0 }}
          >
            <span
              className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-standard"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise block                                                      */
/* ------------------------------------------------------------------ */

function ExerciseBlock({
  exercise,
  index,
  total,
  current,
  previous,
  bests,
  handle,
  compact,
  onShowInfo,
}: {
  exercise: ActiveExerciseSession;
  index: number;
  total: number;
  current: boolean;
  previous: CompletedSet[] | null;
  bests: RecordBests | undefined;
  handle: DragHandleProps;
  /** Folded to its header while the exercises are being reordered. */
  compact: boolean;
  onShowInfo: () => void;
}) {
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [collapsedChoice, setCollapsedChoice] = useState<boolean | null>(null);
  const labels = setLabels(exercise.sets);
  const previousBySet = alignPreviousSets(exercise.sets, previous);
  const rest = exercise.restSeconds ?? 90;
  const doneCount = exercise.sets.filter((set) => set.completed).length;
  const allDone =
    exercise.sets.length > 0 && doneCount === exercise.sets.length;
  const collapsed = compact || (allDone && collapsedChoice === true);
  const volume = exercise.sets
    .filter((set) => set.completed && set.setType === 'working')
    .reduce((sum, set) => sum + set.weightKg * set.repetitions, 0);

  // Records this session would set, against the bests before the workout.
  const recordInputs = exercise.sets.map((set) => ({
    counts: set.completed && set.setType === 'working',
    weightKg: set.weightKg,
    repetitions: set.repetitions,
  }));
  const beats = (type: PersonalRecordType, value: number) =>
    beatsRecord(bests, type, value);
  const setRecords = recordsBySet(recordInputs, beats);
  const recordsIfCompleted = (setIndex: number) =>
    recordsBySet(
      recordInputs.map((input, i) =>
        i === setIndex
          ? { ...input, counts: exercise.sets[i].setType === 'working' }
          : input,
      ),
      beats,
    )[setIndex];

  // A finished exercise folds away shortly after its last set, unless the
  // person already chose to keep it open.
  useEffect(() => {
    if (!allDone) return;
    const id = setTimeout(
      () => setCollapsedChoice((choice) => choice ?? true),
      1400,
    );
    return () => clearTimeout(id);
  }, [allDone]);

  const remove = async () => {
    if (doneCount > 0) {
      const ok = await confirm({
        title: `Remover ${exercise.exerciseName}?`,
        message: `${doneCount} ${doneCount === 1 ? 'série concluída será perdida' : 'séries concluídas serão perdidas'}.`,
        confirmLabel: 'Remover exercício',
        tone: 'danger',
        icon: Trash2,
      });
      if (!ok) return;
    }
    actions.removeExerciseFromActiveWorkout(index);
  };

  const menu: SheetAction[] = [
    {
      label: 'Adicionar série de aquecimento',
      icon: Flame,
      onSelect: () => {
        setCollapsedChoice(false);
        actions.addSetToActiveExercise(index, 'warmup');
      },
    },
    { label: 'Ver detalhes do exercício', icon: Info, onSelect: onShowInfo },
    ...(index > 0
      ? [
          {
            label: 'Mover para cima',
            icon: ArrowUp,
            onSelect: () => actions.moveExerciseInActiveWorkout(index, -1),
          },
        ]
      : []),
    ...(index < total - 1
      ? [
          {
            label: 'Mover para baixo',
            icon: ArrowDown,
            onSelect: () => actions.moveExerciseInActiveWorkout(index, 1),
          },
        ]
      : []),
    {
      label: 'Remover exercício',
      icon: Trash2,
      tone: 'danger',
      onSelect: remove,
    },
  ];

  return (
    <section
      className={cx(
        'rounded-lg border bg-surface transition-shadow',
        current ? 'ember-edge border-transparent' : 'border-line',
      )}
      aria-label={exercise.exerciseName}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <DragHandle
          handle={handle}
          label={`Arrastar ${exercise.exerciseName} para reordenar`}
          className="-ml-1.5 w-7"
        />
        <ExerciseThumb
          muscle={exercise.primaryMuscleGroup}
          exerciseId={exercise.exerciseId}
          size={40}
        />
        <button
          type="button"
          onClick={onShowInfo}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-headline truncate font-semibold">
            {exercise.exerciseName}
          </h3>
          <p className="text-caption flex items-center gap-1.5 text-ink-2 tabular">
            {allDone ? (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-ink">
                <Check size={12} strokeWidth={3} aria-hidden="true" />
                Concluído · {formatWeight(volume)} kg
              </span>
            ) : (
              <>
                {doneCount}/{exercise.sets.length} séries
                {(bests?.weight ?? 0) > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Medal size={12} /> {formatWeight(bests?.weight ?? 0)} kg
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </button>
        {allDone && !compact && (
          <IconButton
            icon={collapsed ? ChevronDown : ChevronUp}
            label={collapsed ? 'Mostrar séries' : 'Recolher séries'}
            size="sm"
            onClick={() => setCollapsedChoice(!collapsed)}
          />
        )}
        <IconButton
          icon={MoreHorizontal}
          label={`Opções de ${exercise.exerciseName}`}
          size="sm"
          onClick={() => setMenuOpen(true)}
        />
      </div>

      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRestOpen(true)}
              className="text-footnote inline-flex h-8 items-center gap-1.5 rounded-full bg-raised px-3 font-semibold active:bg-overlay"
              aria-label={`Descanso: ${formatRestLabel(rest)}`}
            >
              <Timer size={14} className="text-brand-ink" aria-hidden="true" />
              {rest > 0 ? formatClock(rest) : 'Sem descanso'}
            </button>
            {!exercise.notes && !noteOpen && (
              <button
                type="button"
                onClick={() => setNoteOpen(true)}
                className="text-footnote inline-flex h-8 items-center gap-1.5 rounded-full bg-raised px-3 font-semibold text-ink-2 active:bg-overlay"
              >
                <StickyNote size={14} aria-hidden="true" />
                Nota
              </button>
            )}
          </div>

          {(exercise.notes || noteOpen) && (
            <label className="mt-2 block">
              <span className="sr-only">Notas de {exercise.exerciseName}</span>
              <textarea
                value={exercise.notes ?? ''}
                onChange={(event) =>
                  actions.setExerciseNotes(index, event.target.value)
                }
                autoFocus={noteOpen && !exercise.notes}
                placeholder="Como foi? Ajuste de banco, pegada…"
                rows={1}
                maxLength={500}
                className="text-callout w-full resize-none rounded-md bg-raised px-3 py-2 [field-sizing:content] outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink"
              />
            </label>
          )}

          <div
            className={cx(
              SET_GRID,
              'text-micro mt-3 px-1 font-semibold tracking-wider text-ink-3 uppercase',
            )}
            aria-hidden="true"
          >
            <span className="text-center">Série</span>
            <span>Última vez</span>
            <span className="text-center">kg</span>
            <span className="text-center">Reps</span>
            <span className="grid place-items-center">
              <Check size={14} strokeWidth={3} />
            </span>
          </div>

          <div
            className="mt-1 space-y-1"
            role="list"
            aria-label={`Séries de ${exercise.exerciseName}`}
          >
            {exercise.sets.map((set, setIndex) => (
              <SetRow
                key={set.id}
                set={set}
                label={labels[setIndex]}
                previous={previousBySet[setIndex]}
                exerciseIndex={index}
                exerciseKey={exercise.key}
                setIndex={setIndex}
                exerciseName={exercise.exerciseName}
                records={setRecords[setIndex]}
                recordsIfCompleted={() => recordsIfCompleted(setIndex)}
                bests={bests}
                canRemove={exercise.sets.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setCollapsedChoice(false);
              actions.addSetToActiveExercise(index);
            }}
            className="text-callout mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong font-semibold text-ink-2 active:bg-raised"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Adicionar série
          </button>
        </div>
      )}
      {collapsed && <div className="h-3" aria-hidden="true" />}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={exercise.exerciseName}
        actions={menu}
      />
      <ActionSheet
        open={restOpen}
        onClose={() => setRestOpen(false)}
        title="Tempo de descanso"
        actions={REST_OPTIONS.map((seconds) => ({
          label: formatRestLabel(seconds),
          icon: seconds === rest ? Check : undefined,
          tone: seconds === rest ? 'brand' : 'default',
          onSelect: () => actions.setExerciseRest(index, seconds),
        }))}
      />
    </section>
  );
}

/** Compact copy of an exercise that follows the finger while dragged. */
function ExercisePreview({ exercise }: { exercise: ActiveExerciseSession }) {
  const done = exercise.sets.filter((set) => set.completed).length;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface p-3">
      <ExerciseThumb
        muscle={exercise.primaryMuscleGroup}
        exerciseId={exercise.exerciseId}
        size={40}
      />
      <p className="text-headline min-w-0 flex-1 truncate font-semibold">
        {exercise.exerciseName}
      </p>
      <span className="text-footnote text-ink-2 tabular">
        {done}/{exercise.sets.length} séries
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Set row                                                             */
/* ------------------------------------------------------------------ */

function SetRow({
  set,
  label,
  previous,
  exerciseIndex,
  exerciseKey,
  setIndex,
  exerciseName,
  records,
  recordsIfCompleted,
  bests,
  canRemove,
}: {
  set: SetEntry;
  label: string;
  previous: CompletedSet | null;
  exerciseIndex: number;
  exerciseKey: string | undefined;
  setIndex: number;
  exerciseName: string;
  /** Record types this set currently holds in the session. */
  records: PersonalRecordType[];
  recordsIfCompleted: () => PersonalRecordType[];
  bests: RecordBests | undefined;
  canRemove: boolean;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const repsRef = useRef<HTMLInputElement>(null);
  const warmup = set.setType === 'warmup';
  const update = (updates: Partial<SetEntry>) =>
    actions.updateSetActiveWorkout(exerciseIndex, setIndex, updates);

  const isRecord = set.completed && records.length > 0;

  const toggle = () => {
    if (!set.completed && set.repetitions <= 0) {
      toast({
        tone: 'error',
        title: 'Informe as repetições',
        description: 'Digite quantas repetições você fez nesta série.',
      });
      repsRef.current?.focus();
      return;
    }
    // Celebrate beating an existing best; a first-ever value still gets the
    // medal but no toast, or every new exercise would interrupt the session.
    const beaten = set.completed
      ? []
      : recordsIfCompleted().filter((type) => bests?.[type] !== undefined);
    const completedNow = update({ completed: !set.completed });
    haptic(completedNow ? 'success' : 'tap');
    if (completedNow && beaten.length > 0) {
      toast({
        tone: 'record',
        title: 'Novo recorde pessoal!',
        description: beaten
          .map(
            (type) =>
              `${RECORD_LABELS[type]}: ${formatWeight(setRecordValue(type, set))} kg`,
          )
          .join(' · '),
      });
    }
  };

  const copyPrevious = () => {
    if (!previous || set.completed) return;
    update({ weightKg: previous.weightKg, repetitions: previous.repetitions });
    haptic('tap');
  };

  const inputClass = cx(
    'text-body h-10 w-full rounded-md text-center font-semibold tabular outline-none transition-colors placeholder:font-normal placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink',
    set.completed ? 'bg-transparent' : 'bg-raised',
  );

  const removeSet = () => {
    if (!canRemove) return;
    const removed = set;
    actions.removeSetFromActiveExercise(exerciseIndex, setIndex);
    toast({
      title: `Série ${label === 'A' ? 'de aquecimento' : label} apagada`,
      description: exerciseName,
      action: exerciseKey
        ? {
            label: 'Desfazer',
            onPress: () =>
              actions.restoreSetToActiveExercise(
                exerciseKey,
                setIndex,
                removed,
              ),
          }
        : undefined,
    });
  };

  return (
    <SwipeToDelete
      role="listitem"
      aria-label={`Série ${label === 'A' ? 'de aquecimento' : label}${set.completed ? ', concluída' : ''}`}
      disabled={!canRemove}
      onDelete={removeSet}
      className="rounded-md"
    >
      <div
        className={cx(
          SET_GRID,
          'rounded-md px-1 py-1 transition-colors',
          set.completed && 'strike bg-brand-soft',
        )}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={`Opções da série ${label}`}
          className={cx(
            'text-body grid h-10 place-items-center rounded-md font-bold',
            set.completed
              ? 'bg-transparent'
              : warmup
                ? 'bg-warmup-soft'
                : 'bg-raised',
            warmup ? 'text-warmup' : 'text-ink',
          )}
        >
          {label}
        </button>

        {isRecord ? (
          // A record set swaps the reference it just beat for the medal.
          <span className="min-w-0">
            <RecordBadge
              large
              labels={records.map((type) => RECORD_LABELS[type])}
              className="animate-medal"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={copyPrevious}
            disabled={!previous || set.completed}
            className="text-footnote truncate text-left text-ink-3 tabular disabled:cursor-default"
            aria-label={
              previous
                ? `Copiar anterior: ${formatWeight(previous.weightKg)} kg por ${previous.repetitions}`
                : 'Sem registro anterior'
            }
          >
            {previous
              ? `${formatWeight(previous.weightKg)}kg × ${previous.repetitions}`
              : '—'}
          </button>
        )}

        <NumericInput
          aria-label={`Carga da série ${label} em kg`}
          value={set.weightKg}
          decimal
          max={2000}
          zeroAsEmpty
          placeholder={previous ? formatWeight(previous.weightKg) : '0'}
          onValueChange={(weightKg) => update({ weightKg })}
          className={inputClass}
        />
        <NumericInput
          ref={repsRef}
          aria-label={`Repetições da série ${label}`}
          value={set.repetitions}
          max={999}
          zeroAsEmpty
          placeholder={previous ? String(previous.repetitions) : '0'}
          onValueChange={(repetitions) => update({ repetitions })}
          className={inputClass}
        />

        <span className="relative grid place-items-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={set.completed}
            aria-label={
              set.completed
                ? `Desmarcar série ${label}`
                : `Concluir série ${label}`
            }
            onClick={toggle}
            className={cx(
              'pressable grid size-10 place-items-center rounded-md',
              set.completed ? 'bg-brand text-on-brand' : 'bg-raised text-ink-3',
            )}
          >
            <Check
              size={20}
              strokeWidth={3}
              className={set.completed ? 'animate-pop' : undefined}
              aria-hidden="true"
            />
          </button>
        </span>

        <ActionSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={`${exerciseName} · série ${label}`}
          actions={[
            warmup
              ? {
                  label: 'Marcar como série de trabalho',
                  icon: Dumbbell,
                  onSelect: () => update({ setType: 'working' }),
                }
              : {
                  label: 'Marcar como aquecimento',
                  icon: Flame,
                  onSelect: () => update({ setType: 'warmup' }),
                },
            ...(canRemove
              ? [
                  {
                    label: 'Remover série',
                    icon: Trash2,
                    tone: 'danger' as const,
                    onSelect: removeSet,
                  },
                ]
              : []),
          ]}
        />
      </div>
    </SwipeToDelete>
  );
}

/* ------------------------------------------------------------------ */
/* Small sheets                                                        */
/* ------------------------------------------------------------------ */

function RenameSheet({
  open,
  name,
  onClose,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(name);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setValue(name);
  }
  const save = () => {
    const trimmed = value.trim();
    if (trimmed) actions.renameActiveWorkout(trimmed);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nome do treino"
      footer={
        <Button size="lg" block disabled={!value.trim()} onClick={save}>
          Salvar nome
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
          label="Nome"
          value={value}
          maxLength={120}
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
    </Sheet>
  );
}

const REST_PRESETS = [30, 60, 90, 120, 180, 300];

function RestStartSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Iniciar descanso"
      description="Um alerta vibra ao terminar."
    >
      <div className="grid grid-cols-3 gap-2">
        {REST_PRESETS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            onClick={() => {
              actions.startRestTimer(seconds);
              haptic('tap');
              onClose();
            }}
            className="pressable font-metric text-metric-sm h-16 rounded-lg bg-raised active:bg-overlay"
          >
            {formatClock(seconds)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
