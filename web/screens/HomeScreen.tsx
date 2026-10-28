import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  CalendarRange,
  ListChecks,
  Play,
  Share2,
  Plus,
} from 'lucide-react';
import { actions, findExercise, useAppStore, useProfilePhoto } from '../store';
import { addDays, startOfWeek } from '../lib/dates';
import {
  formatClock,
  formatCompact,
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
  goalProgress,
  hydrationDate,
  itemsOnDay,
  mealDate,
  muscleCode,
  percentChange,
  recordDate,
  suggestNextTemplate,
  summarizeActiveWorkout,
  totalsBetween,
} from '../lib/training';
import type { WorkoutTemplateItem } from '../lib/types';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { InstallBanner } from '../features/InstallApp';
import { FriendsTrainingNow } from '../features/TrainingNow';
import { QuickAccess } from '../features/QuickAccess';
import { MuscleMapCard, historyMuscleWork } from '../features/MuscleMap';
import { monthForecast } from '../lib/projections';
import {
  plannedRoutine,
  startDeload,
  suggestDeload,
} from '../lib/trainingPlan';
import { updatePlan, useTrainingPlan } from '../features/trainingPlan';
import { SummarySheet } from '../features/SummarySheet';
import { NotificationBell } from '../features/NotificationBell';
import { MessagesButton } from '../features/MessagesButton';
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
import { WeekScene } from '../ui/Scenes';
import { Card, Delta, SectionHeader, Stat, TabHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { Art } from '../ui/Art';
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
  const photo = useProfilePhoto();
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
            <MessagesButton />
            <NotificationBell />
            <SyncButton />
            <button
              type="button"
              onClick={() => selectTab('profile')}
              aria-label="Abrir perfil"
              className="grid size-11 place-items-center rounded-full active:bg-raised"
            >
              <Avatar name={userProfile.name} photoUrl={photo} size={32} />
            </button>
          </>
        }
      />

      <div className="app-column space-y-6 px-4 pt-2">
        <OfflineNotice />
        <InstallBanner />
        <TodayCard />
        <QuickAccess />
        <DeloadSuggestion />
        <FriendsTrainingNow />
        <WeekHeat />
        <MonthCard />
        <HealthTiles />
        <GoalsPreview />
        <RecentRecords />

        <section aria-labelledby="recent-workouts">
          <SectionHeader
            id="recent-workouts"
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
                scene={<WeekScene />}
                title="Seu diário começa hoje"
                message="Conclua seu primeiro treino para vê-lo aqui. Vindo de outro app? Importe seu histórico em Configurações."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => selectTab('routines')}
                  >
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
  const plan = useTrainingPlan();
  const planned = plannedRoutine(plan, templates);
  const restDay =
    !planned && plan.days.some((id) => templates.some((t) => t.id === id));
  const suggested = useMemo(
    () => suggestNextTemplate(templates, history),
    [templates, history],
  );
  const next = planned ?? suggested;

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
            {planned
              ? 'Hoje na agenda'
              : restDay
                ? 'Descanso na agenda · sugestão'
                : 'Próximo treino'}
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

/** The week day by day: a ✓ on each day trained (tap to open it). */
function WeekHeat() {
  const { history, prs, streakWeeks } = useAppStore();
  const { push } = useNavigation();
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const weekStart = startOfWeek(today);

  const { days, week, lastWeek, weekRecords, weekWork, dayWorkouts } =
    useMemo(() => {
      const start = startOfWeek(new Date());
      const perDay = Array.from({ length: 7 }, (_, i) =>
        totalsBetween(history, addDays(start, i), addDays(start, i + 1)),
      );
      const since = start.getTime();
      // Last week up to the same weekday, so Wednesday compares with Wednesday.
      const elapsed = ((new Date().getDay() + 6) % 7) + 1;
      return {
        days: perDay,
        week: totalsBetween(history, start, addDays(start, 7)),
        lastWeek: totalsBetween(
          history,
          addDays(start, -7),
          addDays(start, -7 + elapsed),
        ),
        weekRecords: prs.filter(
          (record) => (recordDate(record)?.getTime() ?? 0) >= since,
        ).length,
        weekWork: historyMuscleWork(history, start),
        // The day's first workout, opened by tapping the day.
        dayWorkouts: Array.from({ length: 7 }, (_, i) => {
          const from = addDays(start, i).getTime();
          const to = addDays(start, i + 1).getTime();
          return (
            history.find((workout) => {
              const time = Date.parse(workout.completedAt);
              return time >= from && time < to;
            })?.id ?? ''
          );
        }),
      };
    }, [history, prs]);
  const trainedDays = days.filter((day) => day.workouts > 0).length;

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
      <p className="text-footnote mt-0.5 text-ink-2">
        {trainedDays === 0
          ? 'Nenhum treino ainda nesta semana.'
          : `${trainedDays} de 7 dias com treino · toque num dia para ver`}
      </p>

      <ol className="mt-3 grid grid-cols-7 gap-1" aria-label="Dias da semana">
        {days.map((day, index) => {
          const date = addDays(weekStart, index);
          const isToday = index === todayIndex;
          const trained = day.workouts > 0;
          const future = index > todayIndex;
          const label = `${WEEKDAY_NAMES[index]}, dia ${date.getDate()}: ${
            trained
              ? `${day.workouts} ${day.workouts === 1 ? 'treino' : 'treinos'}, ${formatWeight(day.volumeKg)} kg`
              : future
                ? 'ainda não chegou'
                : isToday
                  ? 'hoje, sem treino ainda'
                  : 'descanso'
          }`;
          const content = (
            <>
              <span
                className={cx(
                  'text-caption font-semibold',
                  isToday ? 'text-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {WEEKDAYS[index]}
              </span>
              <span
                className={cx(
                  'grid size-10 place-items-center rounded-full transition-colors',
                  trained
                    ? 'bg-brand text-on-brand'
                    : future
                      ? 'border border-dashed border-line-strong text-ink-3'
                      : 'bg-raised text-ink-2',
                  isToday &&
                    'ring-2 ring-brand-ink ring-offset-2 ring-offset-surface',
                )}
                aria-hidden="true"
              >
                {trained ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <span className="text-footnote font-semibold tabular">
                    {date.getDate()}
                  </span>
                )}
              </span>
              <span
                className={cx(
                  'text-micro h-3.5 tabular',
                  trained ? 'text-brand-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {trained
                  ? day.volumeKg >= 1000
                    ? `${formatNumber(day.volumeKg / 1000)} t`
                    : `${formatNumber(day.volumeKg, 0)} kg`
                  : isToday
                    ? 'hoje'
                    : ''}
              </span>
            </>
          );
          return (
            <li key={index}>
              {trained ? (
                <button
                  type="button"
                  aria-label={label}
                  onClick={() =>
                    push({ name: 'workout', workoutId: dayWorkouts[index] })
                  }
                  className="pressable flex w-full flex-col items-center gap-1 rounded-md py-0.5"
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-label={label}
                  className="flex flex-col items-center gap-1 py-0.5"
                >
                  {content}
                </div>
              )}
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
      {lastWeek.volumeKg > 0 && (
        <p className="mt-2">
          <Delta
            value={percentChange(week.volumeKg, lastWeek.volumeKg)}
            suffix="de volume vs semana passada até hoje"
          />
        </p>
      )}
      {week.workouts > 0 && (
        <MuscleMapCard
          work={weekWork}
          full={12}
          height={120}
          className="mt-3 border-t border-line pt-3"
        />
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

const DELOAD_DISMISSED = 'forgeflow_deload_dismissed';

/** After 6 weeks in a row, an easier week helps: offered, never forced. */
function DeloadSuggestion() {
  const { history } = useAppStore();
  const plan = useTrainingPlan();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const at = Number(localStorage.getItem(DELOAD_DISMISSED));
      return Date.now() - at < 14 * 86_400_000;
    } catch {
      return false;
    }
  });
  if (dismissed || !suggestDeload(history, plan)) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DELOAD_DISMISSED, String(Date.now()));
    } catch {
      // Hidden for this visit.
    }
  };
  return (
    <Card className="flex items-start gap-3 p-4">
      <Art name="flame" size={44} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <h2 className="text-headline font-semibold">Hora de um deload?</h2>
        <p className="text-callout mt-0.5 text-ink-2">
          Você treina há 6 semanas ou mais sem parar. Uma semana mais leve, com
          metade das séries, ajuda a recuperar e voltar mais forte.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              updatePlan((current) => startDeload(current));
              toast({
                tone: 'success',
                title: 'Deload ativado',
                description: 'Até domingo, rotinas com metade das séries.',
              });
            }}
          >
            Fazer esta semana
          </Button>
          <Button size="sm" variant="secondary" onClick={dismiss}>
            Agora não
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

/** The month so far, where this pace ends it, and last month for scale. */
function MonthCard() {
  const { history } = useAppStore();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const forecast = useMemo(() => monthForecast(history), [history]);
  const { soFar, lastMonth } = forecast;
  if (soFar.workouts === 0 && lastMonth.workouts === 0) return null;
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  const rows = [
    {
      label: 'Treinos',
      now: soFar.workouts,
      projected: forecast.projectedWorkouts,
      last: lastMonth.workouts,
      format: (value: number) => formatNumber(value, 0),
    },
    {
      label: 'Volume',
      now: soFar.volumeKg,
      projected: forecast.projectedVolumeKg,
      last: lastMonth.volumeKg,
      format: (value: number) => `${formatCompact(value)} kg`,
    },
  ];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline font-semibold first-letter:uppercase">
          {month}
        </h2>
        <span className="text-footnote flex items-center gap-1.5 text-ink-3">
          <CalendarRange size={14} aria-hidden="true" />
          dia {forecast.dayOfMonth} de {forecast.daysInMonth}
        </span>
      </div>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const scale = Math.max(row.projected, row.last, 1);
          return (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-callout font-medium">{row.label}</span>
                <span className="text-footnote text-ink-2 tabular">
                  <span className="font-semibold text-ink">
                    {row.format(row.now)}
                  </span>{' '}
                  · no ritmo: {row.format(row.projected)}
                </span>
              </div>
              <div
                className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-raised"
                aria-hidden="true"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-soft"
                  style={{ width: `${(row.projected / scale) * 100}%` }}
                />
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand"
                  style={{ width: `${(row.now / scale) * 100}%` }}
                />
                {row.last > 0 && (
                  <span
                    className="absolute inset-y-0 w-0.5 bg-ink-2"
                    style={{ left: `calc(${(row.last / scale) * 100}% - 1px)` }}
                  />
                )}
              </div>
              <p className="text-caption mt-1 text-ink-3 tabular">
                Mês passado: {row.format(row.last)}
              </p>
            </li>
          );
        })}
      </ul>
      <Button
        variant="ghost"
        size="sm"
        icon={Share2}
        className="mt-2 -ml-2"
        onClick={() => setSummaryOpen(true)}
      >
        Ver e compartilhar resumo
      </Button>
      <SummarySheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        initial="month"
      />
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
        id="home-goals"
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
      {active.length === 0 ? (
        <button
          type="button"
          onClick={() => push({ name: 'goals' })}
          className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left active:bg-raised"
        >
          <Art name="target" size={44} className="shrink-0" />
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
            const percent = goalProgress(goal, current);
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
        id="home-records"
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
