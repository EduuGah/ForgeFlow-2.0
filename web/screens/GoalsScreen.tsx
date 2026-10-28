import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Gauge,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { Exercise } from '../../src/domain/training/entities';
import { actions, findExercise, useAppStore } from '../store';
import {
  daysBetween,
  parseLocalDateInput,
  toLocalDateInput,
} from '../lib/dates';
import { formatDeadline, formatNumber } from '../lib/format';
import {
  goalCurrentValue,
  goalIsAutomatic,
  goalProgress,
  goalReached,
} from '../lib/training';
import { measurementSeries } from '../lib/measurements';
import {
  goalInsight,
  goalSuggestions,
  type GoalSuggestion,
} from '../lib/projections';
import type { GoalItem, GoalType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { ExercisePicker } from '../features/ExercisePicker';
import { Button, IconButton } from '../ui/Button';
import { Badge, EmptyState, ExerciseThumb, ProgressBar } from '../ui/Feedback';
import { NumberField, SegmentedControl, TextField } from '../ui/Form';
import { Card, SectionHeader, StackHeader } from '../ui/Layout';
import { ActionSheet, Sheet, useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { celebrate } from '../lib/celebrate';

const TYPE_LABELS: Record<GoalType, string> = {
  exercise_weight: 'Carga no exercício',
  frequency: 'Frequência semanal',
  weight: 'Peso corporal',
  custom: 'Personalizada',
};

const DEFAULT_UNITS: Record<GoalType, string> = {
  exercise_weight: 'kg',
  frequency: 'treinos/sem',
  weight: 'kg',
  custom: '',
};

export function GoalsScreen() {
  const { goals, history, prs } = useAppStore();
  const { pop } = useNavigation();
  const [formGoal, setFormGoal] = useState<GoalItem | 'new' | null>(null);
  const [progressGoal, setProgressGoal] = useState<GoalItem | null>(null);
  const active = goals.filter((goal) => goal.status === 'active');
  const completed = goals.filter((goal) => goal.status === 'completed');
  const suggestions = useMemo(
    () => goalSuggestions(history, prs, goals),
    [history, prs, goals],
  );

  return (
    <>
      <StackHeader
        title="Metas"
        onBack={pop}
        right={
          <IconButton
            icon={Plus}
            label="Nova meta"
            onClick={() => setFormGoal('new')}
          />
        }
      />
      <div className="app-column space-y-6 px-4 pt-4">
        {goals.length === 0 ? (
          <>
            <EmptyState
              art="target"
              title="Nenhuma meta definida"
              message="Metas de carga e frequência são atualizadas automaticamente pelos seus treinos."
              action={
                <Button icon={Plus} onClick={() => setFormGoal('new')}>
                  Criar meta
                </Button>
              }
              className="pt-16"
            />
            {suggestions.length > 0 && (
              <Suggestions suggestions={suggestions} />
            )}
          </>
        ) : (
          <>
            <section aria-labelledby="goals-active">
              <SectionHeader
                id="goals-active"
                title={`Em andamento (${active.length})`}
              />
              {active.length === 0 ? (
                <p className="text-callout rounded-lg bg-surface p-4 text-ink-2">
                  Todas as metas foram concluídas. Que tal a próxima?
                </p>
              ) : (
                <ul className="space-y-3" role="list">
                  {active.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => setFormGoal(goal)}
                      onProgress={() => setProgressGoal(goal)}
                    />
                  ))}
                </ul>
              )}
            </section>
            {suggestions.length > 0 && (
              <Suggestions suggestions={suggestions} />
            )}
            {completed.length > 0 && (
              <section aria-labelledby="goals-done">
                <SectionHeader
                  id="goals-done"
                  title={`Concluídas (${completed.length})`}
                />
                <ul className="space-y-3" role="list">
                  {completed.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => setFormGoal(goal)}
                      onProgress={() => setProgressGoal(goal)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
      <GoalFormSheet goal={formGoal} onClose={() => setFormGoal(null)} />
      <ProgressSheet
        goal={progressGoal}
        onClose={() => setProgressGoal(null)}
      />
    </>
  );
}

function GoalCard({
  goal,
  onEdit,
  onProgress,
}: {
  goal: GoalItem;
  onEdit: () => void;
  onProgress: () => void;
}) {
  const { history, prs, measurements } = useAppStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = goalCurrentValue(goal, history, prs);
  const percent = goalProgress(goal, current);
  const done = goal.status === 'completed' || goalReached(goal, current);
  const insight = goalInsight(goal, current, {
    history,
    bodyWeights:
      goal.type === 'weight' ? measurementSeries(measurements, 'weightKg') : [],
  });
  const automatic = goalIsAutomatic(goal);
  const deadline = goal.deadline ? parseLocalDateInput(goal.deadline) : null;
  const daysLeft = deadline ? daysBetween(new Date(), deadline) : null;

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir meta?',
      message: `"${goal.title}" e seu progresso serão removidos.`,
      confirmLabel: 'Excluir meta',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteGoal(goal.id);
    toast({ tone: 'success', title: 'Meta excluída' });
  };

  return (
    <li className="animate-rise">
      <Card as="div" className={cx('p-4', done && 'ring-1 ring-success/50')}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={done ? 'success' : 'neutral'}>
                {done ? 'Concluída' : TYPE_LABELS[goal.type]}
              </Badge>
              {automatic && !done && <Badge tone="brand">Automática</Badge>}
            </div>
            <h3 className="text-headline mt-2 font-semibold">{goal.title}</h3>
          </div>
          <IconButton
            icon={MoreHorizontal}
            label={`Opções da meta ${goal.title}`}
            onClick={() => setMenuOpen(true)}
            className="-mt-1 -mr-2"
          />
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="font-metric text-metric">
            {formatNumber(current)}{' '}
            <span className="text-callout font-sans font-medium text-ink-2">
              / {formatNumber(goal.targetValue)} {goal.unit}
            </span>
          </p>
          <span
            className={cx(
              'text-callout font-semibold tabular',
              done ? 'text-success-ink' : 'text-ink-2',
            )}
          >
            {percent}%
          </span>
        </div>
        <ProgressBar
          value={percent}
          tone={done ? 'success' : 'brand'}
          label={`Progresso de ${goal.title}`}
          className="mt-2"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p
            className={cx(
              'text-footnote flex items-center gap-1.5',
              daysLeft !== null && daysLeft < 0 && !done
                ? 'text-danger-ink'
                : 'text-ink-2',
            )}
          >
            <CalendarClock size={14} aria-hidden="true" />
            {!goal.deadline
              ? 'Sem prazo'
              : daysLeft === null
                ? `Prazo: ${goal.deadline}`
                : daysLeft < 0 && !done
                  ? `Prazo encerrado em ${formatDeadline(goal.deadline)}`
                  : `${formatDeadline(goal.deadline)}${daysLeft >= 0 && !done ? ` · ${daysLeft === 0 ? 'hoje' : `faltam ${daysLeft} dias`}` : ''}`}
          </p>
          {!automatic && !done && (
            <Button
              variant="secondary"
              size="sm"
              icon={TrendingUp}
              onClick={onProgress}
            >
              Atualizar
            </Button>
          )}
        </div>
        {insight && (
          <p
            className={cx(
              'text-footnote mt-3 flex items-start gap-2 rounded-md px-3 py-2',
              insight.tone === 'good'
                ? 'bg-success-soft text-success-ink'
                : insight.tone === 'warn'
                  ? 'bg-danger-soft text-danger-ink'
                  : 'bg-raised text-ink-2',
            )}
          >
            {insight.tone === 'warn' ? (
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Gauge size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            {insight.text}
          </p>
        )}
        {automatic && !done && (
          <p className="text-caption mt-2 text-ink-3">
            {goal.type === 'frequency'
              ? 'Conta os treinos concluídos nesta semana.'
              : 'Usa seu maior peso registrado no exercício.'}
          </p>
        )}
      </Card>
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={goal.title}
        actions={[
          { label: 'Editar meta', icon: Pencil, onSelect: onEdit },
          ...(!automatic
            ? [
                {
                  label: 'Atualizar progresso',
                  icon: TrendingUp,
                  onSelect: onProgress,
                },
              ]
            : []),
          {
            label: 'Excluir meta',
            icon: Trash2,
            tone: 'danger' as const,
            onSelect: remove,
          },
        ]}
      />
    </li>
  );
}

/** Goals built from the person's own numbers, one tap to create. */
function Suggestions({ suggestions }: { suggestions: GoalSuggestion[] }) {
  const toast = useToast();
  return (
    <section aria-labelledby="goals-suggested">
      <SectionHeader id="goals-suggested" title="Sugestões para você" />
      <ul className="space-y-2" role="list">
        {suggestions.map((suggestion) => (
          <li key={suggestion.key}>
            <Card as="div" className="flex items-center gap-3 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-soft text-brand-ink">
                <Lightbulb size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-callout block font-medium">
                  {suggestion.title}
                </span>
                <span className="text-footnote block text-ink-2">
                  {suggestion.why}
                </span>
              </span>
              <Button
                size="sm"
                variant="tinted"
                icon={Plus}
                onClick={() => {
                  actions.addGoal({
                    title: suggestion.title,
                    type: suggestion.type,
                    currentValue: 0,
                    targetValue: suggestion.targetValue,
                    unit: suggestion.unit,
                    deadline: suggestion.deadline,
                    exerciseId: suggestion.exerciseId,
                  });
                  toast({
                    tone: 'success',
                    title: 'Meta criada',
                    description: suggestion.title,
                  });
                }}
              >
                Criar
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function suggestTitle(
  type: GoalType,
  target: number,
  exercise?: Exercise | null,
): string {
  if (type === 'exercise_weight')
    return exercise ? `${exercise.name} com ${formatNumber(target)} kg` : '';
  if (type === 'frequency')
    return `Treinar ${formatNumber(target, 0)} vezes por semana`;
  if (type === 'weight') return `Chegar a ${formatNumber(target)} kg`;
  return '';
}

function GoalFormSheet({
  goal,
  onClose,
}: {
  goal: GoalItem | 'new' | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const editing = goal !== null && goal !== 'new' ? goal : null;
  const open = goal !== null;

  const [type, setType] = useState<GoalType>('exercise_weight');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(100);
  const [baseline, setBaseline] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [deadline, setDeadline] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [previousGoal, setPreviousGoal] = useState(goal);
  if (previousGoal !== goal) {
    setPreviousGoal(goal);
    if (goal !== null) {
      setSubmitted(false);
      setType(editing?.type ?? 'exercise_weight');
      setExercise(
        editing?.exerciseId ? (findExercise(editing.exerciseId) ?? null) : null,
      );
      setTitle(editing?.title ?? '');
      setTarget(editing?.targetValue ?? 100);
      setBaseline(editing?.currentValue ?? 0);
      setUnit(editing?.unit ?? 'kg');
      setDeadline(
        editing?.deadline && parseLocalDateInput(editing.deadline)
          ? editing.deadline
          : '',
      );
    }
  }

  const suggestion = suggestTitle(type, target, exercise);
  const finalTitle = title.trim() || suggestion;
  const errors = {
    exercise:
      submitted && type === 'exercise_weight' && !exercise && !editing
        ? 'Escolha o exercício da meta.'
        : undefined,
    title: submitted && !finalTitle ? 'Dê um nome à meta.' : undefined,
    target:
      submitted && !(target > 0)
        ? 'Informe um valor maior que zero.'
        : undefined,
    unit:
      submitted && type === 'custom' && !unit.trim()
        ? 'Informe a unidade.'
        : undefined,
  };

  const save = () => {
    setSubmitted(true);
    if (!finalTitle || !(target > 0)) return;
    if (!editing && type === 'exercise_weight' && !exercise) return;
    if (type === 'custom' && !unit.trim()) return;
    if (editing) {
      actions.updateGoal(editing.id, {
        title: finalTitle,
        targetValue: target,
        deadline: deadline || undefined,
      });
      toast({ tone: 'success', title: 'Meta atualizada' });
    } else {
      actions.addGoal({
        title: finalTitle,
        type,
        currentValue: type === 'weight' || type === 'custom' ? baseline : 0,
        targetValue: target,
        unit: type === 'custom' ? unit.trim() : DEFAULT_UNITS[type],
        deadline: deadline || undefined,
        exerciseId: exercise?.id,
      });
      toast({ tone: 'success', title: 'Meta criada', description: finalTitle });
    }
    onClose();
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={editing ? 'Editar meta' : 'Nova meta'}
        footer={
          <Button size="lg" block onClick={save}>
            {editing ? 'Salvar meta' : 'Criar meta'}
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
          {!editing && (
            <div>
              <p className="text-footnote mb-1.5 font-medium text-ink-2">
                Tipo
              </p>
              <SegmentedControl
                label="Tipo de meta"
                value={type}
                onChange={(value) => {
                  setType(value);
                  setTarget(
                    value === 'frequency' ? 4 : value === 'weight' ? 75 : 100,
                  );
                }}
                options={(Object.keys(TYPE_LABELS) as GoalType[]).map(
                  (value) => ({ value, label: TYPE_LABELS[value] }),
                )}
              />
            </div>
          )}

          {type === 'exercise_weight' && !editing && (
            <div>
              <p className="text-footnote mb-1.5 font-medium text-ink-2">
                Exercício
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={cx(
                  'flex h-14 w-full items-center gap-3 rounded-md border bg-raised px-3 text-left',
                  errors.exercise ? 'border-danger-ink' : 'border-transparent',
                )}
              >
                {exercise ? (
                  <ExerciseThumb
                    muscle={exercise.primaryMuscleGroup}
                    exerciseId={exercise.id}
                    size={36}
                  />
                ) : null}
                <span
                  className={cx(
                    'text-body min-w-0 flex-1 truncate',
                    !exercise && 'text-ink-3',
                  )}
                >
                  {exercise?.name ?? 'Escolher exercício'}
                </span>
                <ChevronRight
                  size={18}
                  className="text-ink-3"
                  aria-hidden="true"
                />
              </button>
              {errors.exercise && (
                <p
                  role="alert"
                  className="text-footnote mt-1.5 text-danger-ink"
                >
                  {errors.exercise}
                </p>
              )}
            </div>
          )}

          <TextField
            label="Nome da meta"
            value={title}
            maxLength={100}
            placeholder={suggestion || 'Ex.: Correr 5 km'}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
            hint={
              !title && suggestion
                ? 'Deixe em branco para usar a sugestão.'
                : undefined
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Alvo"
              suffix={
                type === 'custom' ? unit || undefined : DEFAULT_UNITS[type]
              }
              decimal={type !== 'frequency'}
              value={target}
              max={100000}
              onValueChange={setTarget}
              hint={errors.target}
            />
            {!editing && (type === 'weight' || type === 'custom') && (
              <NumberField
                label="Valor atual"
                decimal
                value={baseline}
                max={100000}
                onValueChange={setBaseline}
              />
            )}
            {!editing && type === 'custom' && (
              <TextField
                label="Unidade"
                value={unit}
                maxLength={20}
                placeholder="Ex.: km"
                onChange={(event) => setUnit(event.target.value)}
                error={errors.unit}
              />
            )}
          </div>

          <TextField
            label="Prazo (opcional)"
            type="date"
            value={deadline}
            min={toLocalDateInput(new Date())}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </form>
      </Sheet>
      <ExercisePicker
        open={pickerOpen}
        mode="single"
        title="Exercício da meta"
        onClose={() => setPickerOpen(false)}
        onConfirm={([picked]) => setExercise(picked ?? null)}
      />
    </>
  );
}

function ProgressSheet({
  goal,
  onClose,
}: {
  goal: GoalItem | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [value, setValue] = useState(goal?.currentValue ?? 0);
  const [previousGoal, setPreviousGoal] = useState(goal);
  if (previousGoal !== goal) {
    setPreviousGoal(goal);
    if (goal) setValue(goal.currentValue);
  }

  return (
    <Sheet
      open={goal !== null}
      onClose={onClose}
      title="Atualizar progresso"
      description={goal?.title}
      footer={
        <Button
          size="lg"
          block
          onClick={() => {
            if (!goal) return;
            actions.updateGoalProgress(goal.id, value);
            const reached = goalReached(goal, value);
            if (reached) celebrate('strong');
            toast(
              reached
                ? {
                    tone: 'record',
                    title: 'Meta atingida!',
                    description: goal.title,
                  }
                : { tone: 'success', title: 'Progresso salvo' },
            );
            onClose();
          }}
        >
          Salvar progresso
        </Button>
      }
    >
      {goal && (
        <NumberField
          label="Valor atual"
          suffix={goal.unit}
          decimal
          value={value}
          max={100000}
          onValueChange={setValue}
          hint={`Alvo: ${formatNumber(goal.targetValue)} ${goal.unit}`}
        />
      )}
    </Sheet>
  );
}
