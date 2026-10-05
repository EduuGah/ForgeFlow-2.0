import { useMemo } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  ListChecks,
  Play,
  Plus,
  Target,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import { addDays, startOfWeek } from '../lib/dates';
import {
  formatClock,
  formatNumber,
  formatRelativeDay,
  formatWeight,
  greeting,
  pluralize,
} from '../lib/format';
import {
  RECORD_LABELS,
  goalCurrentValue,
  goalPercent,
  hydrationDate,
  itemsOnDay,
  mealDate,
  muscleCode,
  recordDate,
  suggestNextTemplate,
  summarizeActiveWorkout,
  totalsBetween,
} from '../lib/training';
import type { WorkoutTemplateItem } from '../lib/types';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { useWorkoutLauncher } from '../features/useWorkoutLauncher';
import { WorkoutCard } from '../features/WorkoutCard';
import { OfflineNotice, SyncButton } from '../features/StatusBits';
import { Button } from '../ui/Button';
import {
  Avatar,
  EmptyState,
  Medal,
  ProgressBar,
  ProgressRing,
  Skeleton,
} from '../ui/Feedback';
import { Card, SectionHeader, Stat, TabHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { cx, useNow } from '../ui/core';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEKDAY_NAMES = [
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
  'domingo',
];

function estimateMinutes(template: WorkoutTemplateItem): number {
  const seconds = template.exercises.reduce(
    (total, exercise) =>
      total + exercise.targetSets * (40 + (exercise.restSeconds ?? 90)),
    0,
  );
  return Math.max(10, Math.round(seconds / 60 / 5) * 5);
}

function templateMuscles(template: WorkoutTemplateItem): string[] {
  const groups = template.exercises
    .map((exercise) => findExercise(exercise.exerciseId)?.primaryMuscleGroup)
    .filter((group): group is string => Boolean(group));
  return [...new Set(groups)];
}

export function HomeScreen() {
  const { userProfile, currentUser, history, isSyncingWithFirestore } =
    useAppStore();
  const { push, selectTab } = useNavigation();
  const firstName = userProfile.name.split(' ')[0] || 'atleta';
  const recent = history.slice(0, 4);

  return (
    <>
      <TabHeader
        title="Hoje"
        eyebrow={`${greeting()}, ${firstName}`}
        actions={
          <>
            <SyncButton />
            <button
              type="button"
              onClick={() => selectTab('profile')}
              aria-label="Abrir perfil"
              className="grid size-11 place-items-center rounded-full active:bg-raised"
            >
              <Avatar
                name={userProfile.name}
                photoUrl={currentUser?.photoURL}
                size={32}
              />
            </button>
          </>
        }
      />

      <div className="app-column space-y-6 px-4 pt-2">
        <OfflineNotice />
        <TodayCard />
        <WeekHeat />
        <HealthTiles />
        <GoalsPreview />
        <RecentRecords />

        <section aria-labelledby="recent-workouts">
          <SectionHeader
            title="Diário de treinos"
            action={
              history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => push({ name: 'history' })}
                >
                  Ver tudo
                </Button>
              )
            }
          />
          <h2 id="recent-workouts" className="sr-only">
            Diário de treinos
          </h2>
          {history.length === 0 && currentUser && isSyncingWithFirestore ? (
            <div
              className="space-y-2"
              aria-busy="true"
              aria-label="Carregando treinos"
            >
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : history.length === 0 ? (
            <Card>
              <EmptyState
                icon={Dumbbell}
                title="Seu diário começa hoje"
                message="Conclua um treino — ou importe seu histórico de outro app — para ver tudo aqui."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => selectTab('routines')}
                    >
                      Ver rotinas
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => push({ name: 'import' })}
                    >
                      Importar histórico
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {recent.map((workout, index) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  ordinal={history.length - index}
                  onOpen={() =>
                    push({ name: 'workout', workoutId: workout.id })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function TodayCard() {
  const { activeWorkout, templates, history } = useAppStore();
  const { selectTab, push } = useNavigation();
  const launcher = useWorkoutLauncher();
  const next = useMemo(
    () => suggestNextTemplate(templates, history),
    [templates, history],
  );

  if (activeWorkout) {
    const summary = summarizeActiveWorkout(activeWorkout);
    const percent =
      summary.totalSets > 0
        ? (summary.completedSets / summary.totalSets) * 100
        : 0;
    return (
      <Card className="ember-edge p-4">
        <p className="text-micro flex items-center gap-2 font-semibold tracking-wider text-brand-ink uppercase">
          <span
            className="size-2 animate-pulse-dot rounded-full bg-brand"
            aria-hidden="true"
          />
          Treino em andamento
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h2 className="text-title min-w-0 truncate font-bold">
            {activeWorkout.name}
          </h2>
          <LiveDuration startedAt={activeWorkout.startedAt} />
        </div>
        <ProgressBar
          value={percent}
          label="Séries concluídas"
          className="mt-3"
        />
        <p className="text-footnote mt-1.5 text-ink-2 tabular">
          {summary.completedSets} de {summary.totalSets} séries ·{' '}
          {formatWeight(summary.volumeKg)} kg
        </p>
        <Button
          size="lg"
          block
          className="mt-4"
          icon={ArrowRight}
          onClick={launcher.resume}
        >
          Voltar ao treino
        </Button>
      </Card>
    );
  }

  if (!next) {
    return (
      <Card className="p-4">
        <h2 className="text-title font-bold">Pronto para treinar?</h2>
        <p className="text-callout mt-1 text-ink-2">
          Comece um treino livre agora ou monte uma rotina para repetir nas
          próximas semanas.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="lg" onClick={launcher.startEmpty}>
            Treino livre
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => push({ name: 'routine' })}
          >
            Criar rotina
          </Button>
        </div>
      </Card>
    );
  }

  const lastDone = history.find(
    (workout) => workout.templateId === next.id || workout.name === next.name,
  );
  const sets = next.exercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );
  const muscles = templateMuscles(next);

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-micro font-semibold tracking-wider text-brand-ink uppercase">
            Próximo treino
          </p>
          <p className="text-caption text-ink-3">
            {lastDone
              ? `Última vez ${formatRelativeDay(lastDone.completedAt)}`
              : 'Nunca realizado'}
          </p>
        </div>
        <h2 className="text-title mt-1.5 font-bold">{next.name}</h2>
        <ul
          className="text-footnote mt-2 flex flex-wrap gap-x-4 gap-y-1 text-ink-2"
          role="list"
        >
          <li className="flex items-center gap-1.5">
            <Dumbbell size={14} aria-hidden="true" />{' '}
            {pluralize(next.exercises.length, 'exercício', 'exercícios')}
          </li>
          <li className="flex items-center gap-1.5">
            <ListChecks size={14} aria-hidden="true" />{' '}
            {pluralize(sets, 'série', 'séries')}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" /> ~{estimateMinutes(next)} min
          </li>
        </ul>
        {muscles.length > 0 && (
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            aria-label="Grupos musculares"
          >
            {muscles.map((group) => (
              <span
                key={group}
                className="text-caption rounded-sm bg-raised px-2 py-1 font-semibold text-ink-2"
              >
                {muscleCode(group)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-line bg-raised/50 p-3">
        <Button
          className="flex-1"
          icon={Play}
          onClick={() => launcher.startRoutine(next.id)}
        >
          Começar
        </Button>
        <Button variant="secondary" onClick={() => selectTab('routines')}>
          Outra rotina
        </Button>
      </div>
    </Card>
  );
}

function LiveDuration({ startedAt }: { startedAt: string }) {
  const now = useNow(1000);
  return (
    <span className="font-metric text-metric shrink-0 text-brand-ink tabular">
      {formatClock(
        Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)),
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */

/** The week as a heat strip: each day glows by how much volume it holds. */
function WeekHeat() {
  const { history, prs, streakWeeks } = useAppStore();
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const weekStart = startOfWeek(today);

  const { days, week, weekRecords } = useMemo(() => {
    const start = startOfWeek(new Date());
    const perDay = Array.from({ length: 7 }, (_, i) =>
      totalsBetween(history, addDays(start, i), addDays(start, i + 1)),
    );
    const since = start.getTime();
    return {
      days: perDay,
      week: totalsBetween(history, start, addDays(start, 7)),
      weekRecords: prs.filter(
        (record) => (recordDate(record)?.getTime() ?? 0) >= since,
      ).length,
    };
  }, [history, prs]);
  const maxVolume = Math.max(1, ...days.map((day) => day.volumeKg));

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline shrink-0 font-semibold">Sua semana</h2>
        {streakWeeks > 0 ? (
          <span className="text-footnote flex min-w-0 items-center gap-1 font-semibold text-brand-ink">
            <Flame size={16} className="shrink-0" aria-hidden="true" />
            <span className="truncate">
              {streakWeeks}{' '}
              {streakWeeks === 1 ? 'semana seguida' : 'semanas seguidas'}
            </span>
          </span>
        ) : (
          <span className="text-footnote truncate text-ink-3">
            Sem sequência ainda
          </span>
        )}
      </div>

      <ol
        className="mt-4 grid grid-cols-7 gap-2"
        aria-label="Volume treinado em cada dia da semana"
      >
        {days.map((day, index) => {
          const date = addDays(weekStart, index);
          const isToday = index === todayIndex;
          const trained = day.workouts > 0;
          const heat = trained ? Math.max(0.28, day.volumeKg / maxVolume) : 0;
          return (
            <li
              key={index}
              className="flex flex-col items-center gap-1.5"
              aria-label={`${WEEKDAY_NAMES[index]}, dia ${date.getDate()}: ${
                trained
                  ? `${formatWeight(day.volumeKg)} kg`
                  : index > todayIndex
                    ? 'ainda não chegou'
                    : 'sem treino'
              }`}
            >
              <span
                className="relative flex h-14 w-full items-end overflow-hidden rounded-md bg-raised"
                aria-hidden="true"
              >
                <span
                  className="w-full rounded-md bg-linear-to-t from-brand-press to-brand transition-[height] duration-700 ease-decelerate"
                  style={{ height: `${heat * 100}%` }}
                />
                {isToday && (
                  <span className="absolute inset-0 rounded-md ring-2 ring-brand-ink ring-inset" />
                )}
              </span>
              <span
                className={cx(
                  'text-caption tabular',
                  isToday ? 'font-bold text-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {WEEKDAYS[index]}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
        <Stat
          label="Treinos"
          value={formatNumber(week.workouts, 0)}
          size="sm"
        />
        <Stat
          label="Volume"
          value={formatWeight(week.volumeKg)}
          unit="kg"
          size="sm"
        />
        <Stat
          label="Recordes"
          value={formatNumber(weekRecords, 0)}
          size="sm"
          icon={
            weekRecords > 0 ? (
              <Medal size={18} className="self-center" />
            ) : undefined
          }
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function HealthTiles() {
  const { hydrationLogs, hydrationTargetMl, meals, nutritionTargetKcal } =
    useAppStore();
  const { push } = useNavigation();
  const toast = useToast();
  const water = useMemo(
    () =>
      itemsOnDay(hydrationLogs, hydrationDate, new Date()).reduce(
        (total, log) => total + log.amountMl,
        0,
      ),
    [hydrationLogs],
  );
  const kcal = useMemo(
    () =>
      itemsOnDay(meals, mealDate, new Date()).reduce(
        (total, meal) => total + meal.kcal,
        0,
      ),
    [meals],
  );
  const waterPercent = goalPercent(water, hydrationTargetMl);
  const kcalPercent = goalPercent(kcal, nutritionTargetKcal);

  const quickWater = () => {
    const log = actions.addHydration(250);
    haptic('tap');
    toast({
      tone: 'success',
      title: '+250 ml de água',
      action: {
        label: 'Desfazer',
        onPress: () => actions.removeHydration(log.id),
      },
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="relative overflow-hidden">
        <button
          type="button"
          onClick={() => push({ name: 'hydration' })}
          className="flex w-full flex-col items-start gap-3 p-3.5 text-left active:bg-raised"
        >
          <ProgressRing
            value={waterPercent}
            size={52}
            stroke={6}
            tone="water"
            label={`Água: ${waterPercent}% da meta`}
          >
            <span className="text-caption font-semibold tabular">
              {waterPercent}%
            </span>
          </ProgressRing>
          <span>
            <span className="text-footnote block text-ink-2">Água hoje</span>
            <span className="font-metric text-metric-sm block">
              {formatNumber(water / 1000)}{' '}
              <span className="text-footnote font-sans font-medium text-ink-2">
                / {formatNumber(hydrationTargetMl / 1000)} L
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={quickWater}
          aria-label="Registrar 250 ml de água"
          className="pressable text-caption absolute top-3 right-3 flex h-8 items-center gap-0.5 rounded-full bg-water-soft px-2 font-semibold text-water tabular"
        >
          <Plus size={14} aria-hidden="true" />
          250
        </button>
      </Card>

      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => push({ name: 'nutrition' })}
          className="flex w-full flex-col items-start gap-3 p-3.5 text-left active:bg-raised"
        >
          <ProgressRing
            value={kcalPercent}
            size={52}
            stroke={6}
            tone="protein"
            label={`Calorias: ${kcalPercent}% da meta`}
          >
            <span className="text-caption font-semibold tabular">
              {kcalPercent}%
            </span>
          </ProgressRing>
          <span>
            <span className="text-footnote block text-ink-2">
              Nutrição hoje
            </span>
            <span className="font-metric text-metric-sm block">
              {formatNumber(kcal, 0)}{' '}
              <span className="text-footnote font-sans font-medium text-ink-2">
                / {formatNumber(nutritionTargetKcal, 0)} kcal
              </span>
            </span>
          </span>
        </button>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GoalsPreview() {
  const { goals, history, prs } = useAppStore();
  const { push } = useNavigation();
  const active = goals.filter((goal) => goal.status === 'active').slice(0, 2);

  return (
    <section aria-labelledby="home-goals">
      <SectionHeader
        title="Metas"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push({ name: 'goals' })}
          >
            {goals.length > 0 ? 'Ver todas' : 'Criar meta'}
          </Button>
        }
      />
      <h2 id="home-goals" className="sr-only">
        Metas
      </h2>
      {active.length === 0 ? (
        <button
          type="button"
          onClick={() => push({ name: 'goals' })}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left active:bg-raised"
        >
          <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand-ink">
            <Target size={20} aria-hidden="true" />
          </span>
          <span className="text-callout flex-1 text-ink-2">
            {goals.length > 0
              ? 'Todas as metas foram concluídas. Defina a próxima.'
              : 'Defina uma meta de carga, frequência ou peso.'}
          </span>
          <ChevronRight size={18} className="text-ink-3" aria-hidden="true" />
        </button>
      ) : (
        <div className="grid gap-2">
          {active.map((goal) => {
            const current = goalCurrentValue(goal, history, prs);
            const percent = goalPercent(current, goal.targetValue);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => push({ name: 'goals' })}
                className="flex w-full items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left active:bg-raised"
              >
                <ProgressRing
                  value={percent}
                  size={44}
                  stroke={5}
                  label={`Progresso de ${goal.title}`}
                >
                  <span className="text-micro font-bold tabular">
                    {percent}%
                  </span>
                </ProgressRing>
                <span className="min-w-0 flex-1">
                  <span className="text-callout block truncate font-semibold">
                    {goal.title}
                  </span>
                  <span className="text-footnote text-ink-2 tabular">
                    {formatNumber(current)} de {formatNumber(goal.targetValue)}{' '}
                    {goal.unit}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function RecentRecords() {
  const { prs } = useAppStore();
  const { push, selectTab } = useNavigation();
  const latest = prs.slice(0, 5);
  if (latest.length === 0) return null;

  return (
    <section aria-labelledby="home-records">
      <SectionHeader
        title="Recordes recentes"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectTab('progress')}
          >
            Evolução
          </Button>
        }
      />
      <h2 id="home-records" className="sr-only">
        Recordes recentes
      </h2>
      <div className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
        {latest.map((record) => {
          const date = recordDate(record);
          return (
            <button
              key={record.id}
              type="button"
              onClick={() =>
                push({ name: 'exercise', exerciseId: record.exerciseId })
              }
              className="w-44 shrink-0 snap-start rounded-lg border border-line bg-surface p-3.5 text-left active:bg-raised"
            >
              <Medal size={22} />
              <p className="font-metric text-metric-sm mt-2">
                {formatWeight(record.value)}{' '}
                <span className="text-footnote font-sans text-ink-2">kg</span>
              </p>
              <p className="text-footnote mt-0.5 truncate font-semibold">
                {record.exerciseName}
              </p>
              <p className="text-caption truncate text-ink-3">
                {RECORD_LABELS[record.type]}
                {date ? ` · ${formatRelativeDay(date.toISOString())}` : ''}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
