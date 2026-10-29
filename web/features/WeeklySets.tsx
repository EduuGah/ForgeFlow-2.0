import { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  HeartPulse,
  SlidersHorizontal,
} from 'lucide-react';
import { actions, findExercise, useAppStore, useStoreValue } from '../store';
import { startOfDay } from '../lib/dates';
import { formatNumber } from '../lib/format';
import {
  WEEKLY_GROUPS,
  WEEKLY_PRESETS,
  toCatchUp,
  trainingDaysLeft,
  weeklySets,
  type WeeklyGroup,
  type WeeklySets,
} from '../lib/weeklySets';
import { muscleLabel } from '../lib/training';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/Feedback';
import { Stepper } from '../ui/Form';
import { Card } from '../ui/Layout';
import { Sheet } from '../ui/Overlay';
import { cx } from '../ui/core';
import { useTrainingPlan } from './trainingPlan';

/* Weekly sets per muscle: target, done, left, and how to make up for it. */

function setsText(value: number): string {
  return formatNumber(value, value % 1 ? 1 : 0);
}

export function useWeeklySets(): WeeklySets {
  const { history, activeWorkout, weeklySetTargets, weeklyCardioMinutes } =
    useAppStore();
  const plan = useTrainingPlan();
  return useMemo(() => {
    const now = new Date();
    const today = startOfDay(now).getTime();
    const trainedToday = history.some(
      (workout) => Date.parse(workout.completedAt) >= today,
    );
    return weeklySets({
      history,
      active: activeWorkout,
      musclesOf: (exerciseId) => {
        const exercise = exerciseId ? findExercise(exerciseId) : undefined;
        return exercise
          ? {
              primary: exercise.primaryMuscleGroup,
              secondary: exercise.secondaryMuscleGroups,
            }
          : null;
      },
      targets: weeklySetTargets,
      cardioTarget: weeklyCardioMinutes,
      trainingDays: trainingDaysLeft(plan.days, now, trainedToday),
      planned: plan.days.some(Boolean),
      now,
    });
  }, [history, activeWorkout, weeklySetTargets, weeklyCardioMinutes, plan]);
}

function StatusTag({ item }: { item: WeeklyGroup }) {
  if (item.status === 'done')
    return (
      <span className="text-caption inline-flex items-center gap-0.5 rounded-full bg-success-soft px-2 py-0.5 font-semibold text-success-ink">
        <Check size={12} strokeWidth={3} aria-hidden="true" />
        Feito
      </span>
    );
  if (item.status === 'behind')
    return (
      <span className="text-caption rounded-full bg-record-soft px-2 py-0.5 font-semibold text-record">
        Atrasado
      </span>
    );
  return null;
}

function GroupRow({ item }: { item: WeeklyGroup }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="text-callout truncate font-medium">{item.label}</span>
        <span className="flex shrink-0 items-center gap-2">
          <StatusTag item={item} />
          <span className="text-footnote text-ink-2 tabular">
            <span className="font-semibold text-ink">
              {setsText(item.done)}
            </span>
            /{item.target}
          </span>
        </span>
      </div>
      <ProgressBar
        value={(item.done / item.target) * 100}
        tone={item.status === 'done' ? 'success' : 'brand'}
        thickness="sm"
        label={`${item.label}: ${setsText(item.done)} de ${item.target} séries`}
        className="mt-1.5"
      />
      {item.remaining > 0 && (
        <p className="text-caption mt-1 text-ink-3 tabular">
          Faltam {setsText(item.remaining)}
          {item.status === 'behind' && item.perDay > 0
            ? ` · ~${item.perDay} por treino para compensar`
            : ''}
        </p>
      )}
    </li>
  );
}

function CardioRow({ week }: { week: WeeklySets }) {
  const { target, minutes } = week.cardio;
  if (target <= 0) return null;
  return (
    <li>
      <div className="flex items-center justify-between gap-3">
        <span className="text-callout inline-flex items-center gap-1.5 font-medium">
          <HeartPulse size={15} className="text-brand-ink" aria-hidden="true" />
          Cardio
        </span>
        <span className="text-footnote text-ink-2 tabular">
          <span className="font-semibold text-ink">{minutes}</span>/{target} min
        </span>
      </div>
      <ProgressBar
        value={(minutes / target) * 100}
        tone={minutes >= target ? 'success' : 'brand'}
        thickness="sm"
        label={`Cardio: ${minutes} de ${target} minutos`}
        className="mt-1.5"
      />
    </li>
  );
}

function daysText(week: WeeklySets): string {
  const unit = week.planned
    ? week.daysLeft === 1
      ? 'treino na agenda'
      : 'treinos na agenda'
    : week.daysLeft === 1
      ? 'dia'
      : 'dias';
  return `${week.daysLeft} ${unit}`;
}

function CatchUpTip({ week }: { week: WeeklySets }) {
  const behind = toCatchUp(week);
  if (behind.length === 0) return null;
  const days = week.daysLeft;
  return (
    <p className="text-footnote rounded-md bg-record-soft px-3 py-2 text-ink">
      <span className="font-semibold">Para compensar:</span>{' '}
      {behind
        .slice(0, 3)
        .map((item) => `${item.label} +${item.perDay}`)
        .join(', ')}{' '}
      {days > 1
        ? `séries por treino (restam ${daysText(week)}).`
        : days === 1
          ? 'séries no próximo treino.'
          : 'séries — sem dias de treino na semana, siga na próxima.'}
    </p>
  );
}

/** Full card: every group with its bar; `compact` shows the total only. */
export function WeeklySetsCard({ compact = false }: { compact?: boolean }) {
  const week = useWeeklySets();
  const trained = useStoreValue((state) => state.history.length > 0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  if (week.groups.length === 0 && week.cardio.target <= 0) return null;
  // Home stays calm before the first workout: nothing is "behind" yet.
  if (compact && !trained) return null;
  const behind = toCatchUp(week);

  if (compact)
    return (
      <>
        <Card className="p-0">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pressable flex w-full items-center gap-3 p-4 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="text-micro block font-semibold tracking-wider text-ink-3 uppercase">
                Séries da semana
              </span>
              <span className="text-headline mt-0.5 block font-semibold tabular">
                {setsText(week.done)}{' '}
                <span className="text-callout font-normal text-ink-2">
                  de {week.target} séries
                </span>
              </span>
              <ProgressBar
                value={week.target ? (week.done / week.target) * 100 : 0}
                thickness="sm"
                label={`${setsText(week.done)} de ${week.target} séries na semana`}
                className="mt-2"
              />
              <span
                className={cx(
                  'text-footnote mt-1.5 block truncate',
                  behind.length ? 'text-record' : 'text-ink-2',
                )}
              >
                {behind.length
                  ? `Atrasado: ${behind
                      .slice(0, 3)
                      .map(
                        (item) => `${item.label} −${setsText(item.remaining)}`,
                      )
                      .join(' · ')}`
                  : week.done >= week.target
                    ? 'Meta da semana batida 💪'
                    : 'Em dia com a meta'}
              </span>
            </span>
            <ChevronRight
              size={18}
              className="shrink-0 text-ink-3"
              aria-hidden="true"
            />
          </button>
        </Card>
        <Sheet
          open={open}
          onClose={() => setOpen(false)}
          title="Séries da semana"
          description="Cada série conta 1 para o músculo principal e ½ para os de sinergia."
        >
          <WeeklyDetails week={week} onEdit={() => setEditing(true)} />
        </Sheet>
        <WeeklyTargetsSheet open={editing} onClose={() => setEditing(false)} />
      </>
    );

  return (
    <Card className="p-4">
      <WeeklyDetails week={week} onEdit={() => setEditing(true)} />
      <WeeklyTargetsSheet open={editing} onClose={() => setEditing(false)} />
    </Card>
  );
}

function WeeklyDetails({
  week,
  onEdit,
}: {
  week: WeeklySets;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <p className="min-w-0">
          <span className="text-title block font-bold tabular">
            {setsText(week.done)}
            <span className="text-callout font-normal text-ink-2">
              {' '}
              de {week.target} séries
            </span>
          </span>
          <span className="text-footnote text-ink-2">
            Restam {daysText(week)} até domingo
          </span>
        </p>
        <Button
          size="sm"
          variant="secondary"
          icon={SlidersHorizontal}
          onClick={onEdit}
        >
          Metas
        </Button>
      </div>
      <CatchUpTip week={week} />
      <ul className="space-y-3.5">
        {week.groups.map((item) => (
          <GroupRow key={item.group} item={item} />
        ))}
        <CardioRow week={week} />
      </ul>
    </div>
  );
}

export function WeeklyTargetsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { weeklySetTargets, weeklyCardioMinutes } = useAppStore();
  const preset = WEEKLY_PRESETS.find((item) =>
    WEEKLY_GROUPS.every(
      (group) => (weeklySetTargets[group] ?? 0) === (item.targets[group] ?? 0),
    ),
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Metas semanais"
      description="Séries de trabalho por semana. Use 0 para não acompanhar um grupo."
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {WEEKLY_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset?.id === item.id}
              onClick={() => actions.setWeeklySetTargets(item.targets)}
              className={cx(
                'pressable rounded-lg border p-2.5 text-left',
                preset?.id === item.id
                  ? 'border-brand bg-brand-soft'
                  : 'border-line',
              )}
            >
              <span className="text-callout block font-semibold">
                {item.label}
              </span>
              <span className="text-caption block text-ink-2">
                {item.description}
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {WEEKLY_GROUPS.map((group) => (
            <Stepper
              key={group}
              label={muscleLabel(group)}
              value={weeklySetTargets[group] ?? 0}
              min={0}
              max={40}
              onChange={(sets) =>
                actions.setWeeklySetTargets({ [group]: sets })
              }
            />
          ))}
          <Stepper
            label="Cardio (min)"
            value={weeklyCardioMinutes}
            min={0}
            max={1200}
            step={15}
            onChange={(minutes) => actions.setWeeklyCardioMinutes(minutes)}
          />
        </div>
        <Button block onClick={onClose}>
          Pronto
        </Button>
      </div>
    </Sheet>
  );
}
