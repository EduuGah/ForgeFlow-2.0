import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Dumbbell,
  Flame,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { actions, useAppStore, type FinishResult } from '../store';
import type {
  ActiveExerciseSession,
  CompletedSet,
  PersonalRecordItem,
  SetEntry,
} from '../lib/types';
import {
  formatClock,
  formatNumber,
  formatRestLabel,
  formatWeight,
} from '../lib/format';
import {
  alignPreviousSets,
  countPendingSets,
  estimateOneRepMax,
  previousSetsFor,
  setLabels,
  summarizeActiveWorkout,
} from '../lib/training';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ExerciseThumb, Medal } from '../ui/Feedback';
import { NumericInput, TextField } from '../ui/Form';
import { Stat } from '../ui/Layout';
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

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const SET_GRID =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_4.25rem_3.75rem_2.75rem] items-center gap-2';

interface Bests {
  weight: number;
  oneRepMax: number;
}

function bestsByExercise(records: PersonalRecordItem[]): Map<string, Bests> {
  const map = new Map<string, Bests>();
  for (const record of records) {
    const current = map.get(record.exerciseId) ?? { weight: 0, oneRepMax: 0 };
    if (record.type === 'weight')
      current.weight = Math.max(current.weight, record.value);
    if (record.type === 'estimated_1rm')
      current.oneRepMax = Math.max(current.oneRepMax, record.value);
    map.set(record.exerciseId, current);
  }
  return map;
}

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
  useBackLayer(open, closeWorkout);
  useScrollLock(mounted);

  // Keep rendering the last session while the sheet slides away after finishing.
  const [lastWorkout, setLastWorkout] = useState(activeWorkout);
  if (activeWorkout && activeWorkout !== lastWorkout)
    setLastWorkout(activeWorkout);
  const workout = activeWorkout ?? lastWorkout;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [infoExerciseId, setInfoExerciseId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bests = useMemo(() => bestsByExercise(prs), [prs]);

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
      title: 'Concluir treino?',
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
      confirmLabel: 'Concluir treino',
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
        'fixed inset-0 z-45 flex flex-col bg-canvas',
        closing ? 'animate-sheet-out' : 'animate-sheet-in',
      )}
    >
      {/* Top bar */}
      <header className="pt-safe shrink-0 border-b border-line bg-surface">
        <div className="app-column flex h-14 items-center gap-1 px-2">
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
            icon={Timer}
            label="Cronômetro de descanso"
            onClick={() => setRestPickerOpen(true)}
          />
          <Button size="sm" onClick={finish} className="ml-1">
            Concluir
          </Button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="app-column pb-40">
          {/* Live summary */}
          <div className="grid grid-cols-3 gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-caption text-ink-2">Duração</p>
              <ElapsedClock startedAt={workout.startedAt} />
            </div>
            <Stat
              label="Volume"
              value={formatWeight(summary.volumeKg)}
              unit="kg"
              size="sm"
            />
            <Stat
              label="Séries"
              value={`${summary.completedSets}`}
              unit={`/ ${summary.totalSets}`}
              size="sm"
            />
          </div>

          {workout.exercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Treino vazio"
              message="Adicione os exercícios que você vai fazer hoje. Carga e repetições do último treino aparecem como referência."
            />
          ) : (
            workout.exercises.map((exercise, index) => (
              <ExerciseBlock
                key={`${exercise.exerciseId}-${index}`}
                exercise={exercise}
                index={index}
                total={workout.exercises.length}
                previous={previousSetsFor(
                  history,
                  exercise.exerciseId,
                  exercise.exerciseName,
                )}
                bests={bests.get(exercise.exerciseId)}
                onShowInfo={() => setInfoExerciseId(exercise.exerciseId)}
              />
            ))
          )}

          <div className="space-y-2 px-4 pt-4">
            <Button
              size="lg"
              block
              icon={Plus}
              onClick={() => setPickerOpen(true)}
            >
              Adicionar exercício
            </Button>
            <Button
              size="lg"
              variant="danger-ghost"
              block
              icon={Trash2}
              onClick={discard}
            >
              Descartar treino
            </Button>
          </div>
        </div>
      </div>

      <RestTimerBar />

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
      className="text-headline mt-0.5 font-semibold text-brand-ink tabular"
      aria-live="off"
    >
      {formatClock(seconds)}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Exercise block                                                      */
/* ------------------------------------------------------------------ */

function ExerciseBlock({
  exercise,
  index,
  total,
  previous,
  bests,
  onShowInfo,
}: {
  exercise: ActiveExerciseSession;
  index: number;
  total: number;
  previous: CompletedSet[] | null;
  bests: Bests | undefined;
  onShowInfo: () => void;
}) {
  const confirm = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const labels = setLabels(exercise.sets);
  const previousBySet = alignPreviousSets(exercise.sets, previous);
  const rest = exercise.restSeconds ?? 90;
  const doneCount = exercise.sets.filter((set) => set.completed).length;
  const allDone =
    exercise.sets.length > 0 && doneCount === exercise.sets.length;

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
      onSelect: () => actions.addSetToActiveExercise(index, 'warmup'),
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
      className="border-b border-line px-4 pt-5 pb-4"
      aria-label={exercise.exerciseName}
    >
      <div className="flex items-center gap-3">
        <ExerciseThumb muscle={exercise.primaryMuscleGroup} size={44} />
        <button
          type="button"
          onClick={onShowInfo}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-headline truncate font-semibold text-brand-ink">
            {exercise.exerciseName}
          </h3>
          {allDone && (
            <p className="text-caption flex items-center gap-1 text-success-ink">
              <Check size={12} strokeWidth={3} aria-hidden="true" /> Exercício
              concluído
            </p>
          )}
        </button>
        <IconButton
          icon={MoreVertical}
          label={`Opções de ${exercise.exerciseName}`}
          onClick={() => setMenuOpen(true)}
        />
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Notas de {exercise.exerciseName}</span>
        <textarea
          value={exercise.notes ?? ''}
          onChange={(event) =>
            actions.setExerciseNotes(index, event.target.value)
          }
          placeholder="Adicionar notas aqui…"
          rows={1}
          maxLength={500}
          className="text-body w-full resize-none bg-transparent py-1 [field-sizing:content] outline-none placeholder:text-ink-3"
        />
      </label>

      <button
        type="button"
        onClick={() => setRestOpen(true)}
        className="text-callout -ml-1 flex items-center gap-1.5 rounded-sm px-1 py-1.5 font-medium text-brand-ink active:bg-raised"
      >
        <Timer size={16} aria-hidden="true" />
        Descanso: {formatRestLabel(rest)}
      </button>

      <div
        className={cx(
          SET_GRID,
          'text-micro mt-2 px-1 font-semibold text-ink-3 uppercase',
        )}
        aria-hidden="true"
      >
        <span className="text-center">Série</span>
        <span>Anterior</span>
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
            setIndex={setIndex}
            exerciseName={exercise.exerciseName}
            bests={bests}
            canRemove={exercise.sets.length > 1}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        block
        icon={Plus}
        className="mt-3"
        onClick={() => actions.addSetToActiveExercise(index)}
      >
        Adicionar série
      </Button>

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

/* ------------------------------------------------------------------ */
/* Set row                                                             */
/* ------------------------------------------------------------------ */

function SetRow({
  set,
  label,
  previous,
  exerciseIndex,
  setIndex,
  exerciseName,
  bests,
  canRemove,
}: {
  set: SetEntry;
  label: string;
  previous: CompletedSet | null;
  exerciseIndex: number;
  setIndex: number;
  exerciseName: string;
  bests: Bests | undefined;
  canRemove: boolean;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const repsRef = useRef<HTMLInputElement>(null);
  const warmup = set.setType === 'warmup';
  const update = (updates: Partial<SetEntry>) =>
    actions.updateSetActiveWorkout(exerciseIndex, setIndex, updates);

  const isRecord =
    set.completed &&
    !warmup &&
    bests !== undefined &&
    set.repetitions > 0 &&
    (set.weightKg > bests.weight ||
      estimateOneRepMax(set.weightKg, set.repetitions) > bests.oneRepMax);

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
    const completedNow = update({ completed: !set.completed });
    haptic(completedNow ? 'success' : 'tap');
  };

  const copyPrevious = () => {
    if (!previous || set.completed) return;
    update({ weightKg: previous.weightKg, repetitions: previous.repetitions });
    haptic('tap');
  };

  const inputClass = cx(
    'text-body h-10 w-full rounded-sm text-center font-semibold tabular outline-none transition-colors placeholder:font-normal placeholder:text-ink-3 focus:ring-2 focus:ring-brand-ink',
    set.completed ? 'bg-transparent' : 'bg-raised',
  );

  return (
    <div
      role="listitem"
      aria-label={`Série ${label === 'W' ? 'de aquecimento' : label}${set.completed ? ', concluída' : ''}`}
      className={cx(
        SET_GRID,
        'rounded-md px-1 py-1 transition-colors',
        set.completed && 'strike bg-success-soft',
      )}
    >
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label={`Opções da série ${label}`}
        className={cx(
          'text-body grid h-10 place-items-center rounded-sm font-bold',
          set.completed ? 'bg-transparent' : 'bg-raised',
          warmup ? 'text-warmup' : 'text-ink',
        )}
      >
        {label}
      </button>

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
            'pressable grid size-10 place-items-center rounded-sm',
            set.completed ? 'bg-success text-white' : 'bg-raised text-ink-3',
          )}
        >
          <Check
            size={20}
            strokeWidth={3}
            className={set.completed ? 'animate-pop' : undefined}
            aria-hidden="true"
          />
        </button>
        {isRecord && (
          <span
            className="absolute -top-2 -right-1 animate-medal"
            title="Novo recorde pessoal"
          >
            <Medal size={18} />
            <span className="sr-only">Novo recorde pessoal</span>
          </span>
        )}
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
                  onSelect: () =>
                    actions.removeSetFromActiveExercise(
                      exerciseIndex,
                      setIndex,
                    ),
                },
              ]
            : []),
        ]}
      />
    </div>
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
