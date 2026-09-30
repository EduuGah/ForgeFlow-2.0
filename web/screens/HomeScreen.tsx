import { useMemo } from 'react';
import {
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  ListChecks,
  Plus,
  Target,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
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
  recordDate,
  suggestNextTemplate,
  summarizeActiveWorkout,
  totalsBetween,
  weekTrainingDays,
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
  WorkoutCardSkeleton,
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

export function HomeScreen() {
  const { userProfile, currentUser, history, isSyncingWithFirestore } =
    useAppStore();
  const { push, selectTab } = useNavigation();
  const firstName = userProfile.name.split(' ')[0] || 'atleta';
  const recent = history.slice(0, 3);

  return (
    <>
      <TabHeader
        title="Início"
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
        <WeekCard />
        <HealthTiles />
        <GoalsPreview />
        <RecentRecords />
      </div>

      <section className="app-column mt-8" aria-labelledby="recent-workouts">
        <div className="px-4">
          <SectionHeader
            title="Treinos recentes"
            action={
              history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => push({ name: 'history' })}
                >
                  Ver todos
                </Button>
              )
            }
          />
        </div>
        <h2 id="recent-workouts" className="sr-only">
          Treinos recentes
        </h2>
        {history.length === 0 && currentUser && isSyncingWithFirestore ? (
          <div
            className="space-y-2"
            aria-busy="true"
            aria-label="Carregando treinos"
          >
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </div>
        ) : history.length === 0 ? (
          <Card className="mx-4">
            <EmptyState
              icon={Dumbbell}
              title="Seu histórico começa hoje"
              message="Conclua um treino para ver aqui duração, volume e recordes."
              action={
                <Button variant="secondary" onClick={() => selectTab('train')}>
                  Ver rotinas
                </Button>
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
                athleteName={userProfile.name}
                photoUrl={currentUser?.photoURL}
                onOpen={() => push({ name: 'workout', workoutId: workout.id })}
              />
            ))}
          </div>
        )}
      </section>
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
    return (
      <Card className="p-4 ring-1 ring-brand/50">
        <p className="text-micro flex items-center gap-2 font-semibold tracking-wider text-success-ink uppercase">
          <span
            className="size-2 animate-pulse-dot rounded-full bg-success-ink"
            aria-hidden="true"
          />
          Treino em andamento
        </p>
        <h2 className="text-title mt-1.5 font-bold">{activeWorkout.name}</h2>
        <p className="text-callout mt-1 text-ink-2 tabular">
          <LiveDuration startedAt={activeWorkout.startedAt} /> ·{' '}
          {summary.completedSets} de {summary.totalSets} séries
        </p>
        <Button size="lg" block className="mt-4" onClick={launcher.resume}>
          Retomar treino
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
            Treino vazio
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

  return (
    <Card className="p-4">
      <p className="text-micro font-semibold tracking-wider text-ink-2 uppercase">
        Sugestão para hoje
      </p>
      <h2 className="text-title mt-1.5 font-bold">{next.name}</h2>
      <p className="text-callout mt-1 line-clamp-2 text-ink-2">
        {next.exercises.map((exercise) => exercise.exerciseName).join(', ')}
      </p>
      <ul
        className="text-footnote mt-3 flex flex-wrap gap-x-4 gap-y-1 text-ink-2"
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
      <p className="text-footnote mt-1.5 text-ink-3">
        {lastDone
          ? `Última vez ${formatRelativeDay(lastDone.completedAt)}`
          : 'Você ainda não fez esta rotina'}
      </p>
      <Button
        size="lg"
        block
        className="mt-4"
        onClick={() => launcher.startRoutine(next.id)}
      >
        Começar rotina
      </Button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={launcher.startEmpty}>
          Treino vazio
        </Button>
        <Button variant="secondary" onClick={() => selectTab('train')}>
          Outras rotinas
        </Button>
      </div>
    </Card>
  );
}

function LiveDuration({ startedAt }: { startedAt: string }) {
  const now = useNow(1000);
  return (
    <>
      {formatClock(
        Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function WeekCard() {
  const { history, prs, streakWeeks } = useAppStore();
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const days = useMemo(() => weekTrainingDays(history), [history]);
  const week = useMemo(() => {
    const start = startOfWeek(new Date());
    return totalsBetween(history, start, addDays(start, 7));
  }, [history]);
  const weekRecords = useMemo(() => {
    const start = startOfWeek(new Date()).getTime();
    return prs.filter((record) => (recordDate(record)?.getTime() ?? 0) >= start)
      .length;
  }, [prs]);
  const weekStart = startOfWeek(today);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline shrink-0 font-semibold">Esta semana</h2>
        {streakWeeks > 0 ? (
          <span className="text-footnote flex min-w-0 items-center gap-1 font-medium text-warmup">
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
        className="mt-4 grid grid-cols-7 gap-1"
        aria-label="Dias treinados nesta semana"
      >
        {days.map((trained, index) => {
          const date = addDays(weekStart, index);
          const isToday = index === todayIndex;
          const future = index > todayIndex;
          return (
            <li key={index} className="flex flex-col items-center gap-1.5">
              <span
                className={cx(
                  'text-caption',
                  isToday ? 'font-semibold text-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {WEEKDAYS[index]}
              </span>
              <span
                className={cx(
                  'text-footnote grid size-9 place-items-center rounded-full font-semibold tabular',
                  trained && 'bg-brand text-white',
                  !trained && isToday && 'text-ink ring-2 ring-brand-ink',
                  !trained && !isToday && 'bg-raised text-ink-3',
                  future && !trained && 'opacity-50',
                )}
                aria-label={`${WEEKDAY_NAMES[index]}, dia ${date.getDate()}: ${trained ? 'treinou' : future ? 'ainda não chegou' : 'sem treino'}`}
              >
                {date.getDate()}
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
        onPress: () => {
          actions.removeHydration(log.id);
        },
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
          className="flex w-full items-center gap-3 rounded-lg bg-surface p-4 text-left active:bg-raised"
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
        <Card as="div" className="divide-y divide-line">
          {active.map((goal) => {
            const current = goalCurrentValue(goal, history, prs);
            const percent = goalPercent(current, goal.targetValue);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => push({ name: 'goals' })}
                className="block w-full p-4 text-left active:bg-raised"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-callout truncate font-medium">
                    {goal.title}
                  </span>
                  <span className="text-footnote shrink-0 text-ink-2 tabular">
                    {percent}%
                  </span>
                </div>
                <ProgressBar
                  value={percent}
                  label={`Progresso de ${goal.title}`}
                  className="mt-2"
                />
                <p className="text-caption mt-1.5 text-ink-3 tabular">
                  {formatNumber(current)} de {formatNumber(goal.targetValue)}{' '}
                  {goal.unit}
                </p>
              </button>
            );
          })}
        </Card>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function RecentRecords() {
  const { prs } = useAppStore();
  const { push } = useNavigation();
  const latest = prs.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section aria-labelledby="home-records">
      <SectionHeader
        title="Recordes recentes"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push({ name: 'stats' })}
          >
            Estatísticas
          </Button>
        }
      />
      <h2 id="home-records" className="sr-only">
        Recordes recentes
      </h2>
      <Card as="div" className="divide-y divide-line">
        {latest.map((record) => {
          const date = recordDate(record);
          return (
            <button
              key={record.id}
              type="button"
              onClick={() =>
                push({ name: 'exercise', exerciseId: record.exerciseId })
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-raised"
            >
              <Medal size={24} />
              <span className="min-w-0 flex-1">
                <span className="text-callout block truncate font-medium">
                  {record.exerciseName}
                </span>
                <span className="text-footnote block text-ink-2">
                  {RECORD_LABELS[record.type]}
                  {date ? ` · ${formatRelativeDay(date.toISOString())}` : ''}
                </span>
              </span>
              <span className="font-metric text-metric-sm shrink-0">
                {formatWeight(record.value)}{' '}
                <span className="text-footnote font-sans text-ink-2">kg</span>
              </span>
            </button>
          );
        })}
      </Card>
    </section>
  );
}
