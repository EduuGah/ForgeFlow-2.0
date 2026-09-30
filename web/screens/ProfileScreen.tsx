import { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Droplet,
  Dumbbell,
  Pencil,
  Settings,
  Target,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import { describeLoginError, isLoginDismissed } from '../firebase';
import { addDays, startOfWeek } from '../lib/dates';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
} from '../lib/format';
import {
  bucketHistory,
  metricValue,
  totalsBetween,
  type ChartMetric,
  type ChartPeriod,
} from '../lib/training';
import { useNavigation, type Route } from '../navigation/Navigator';
import { WorkoutCard } from '../features/WorkoutCard';
import { Button, IconButton } from '../ui/Button';
import { BarChart } from '../ui/Charts';
import { Avatar, Badge, EmptyState } from '../ui/Feedback';
import { SegmentedControl } from '../ui/Form';
import { Card, GroupLabel, TabHeader } from '../ui/Layout';
import { ActionSheet, useToast } from '../ui/Overlay';

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: '1m', label: 'Último mês' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '1y', label: 'Último ano' },
];

const METRICS: { value: ChartMetric; label: string }[] = [
  { value: 'duration', label: 'Duração' },
  { value: 'volume', label: 'Volume' },
  { value: 'reps', label: 'Repetições' },
];

const DASHBOARD: { label: string; icon: LucideIcon; route: Route }[] = [
  { label: 'Estatísticas', icon: BarChart3, route: { name: 'stats' } },
  { label: 'Exercícios', icon: Dumbbell, route: { name: 'library' } },
  { label: 'Metas', icon: Target, route: { name: 'goals' } },
  { label: 'Hidratação', icon: Droplet, route: { name: 'hydration' } },
  { label: 'Nutrição', icon: Utensils, route: { name: 'nutrition' } },
  { label: 'Comunidade', icon: Users, route: { name: 'social' } },
];

function formatMetric(metric: ChartMetric, value: number): string {
  if (metric === 'duration') return formatDurationMinutes(value);
  if (metric === 'volume') return `${formatCompact(value)} kg`;
  return `${formatNumber(value, 0)} reps`;
}

function formatMetricTick(metric: ChartMetric, value: number): string {
  if (metric === 'duration')
    return value >= 60
      ? `${formatNumber(value / 60)} h`
      : `${formatNumber(value, 0)} min`;
  if (metric === 'volume') return formatCompact(value);
  return formatNumber(value, 0);
}

export function ProfileScreen() {
  const { userProfile, currentUser, history, prs, streakWeeks } = useAppStore();
  const { push } = useNavigation();
  const toast = useToast();
  const [period, setPeriod] = useState<ChartPeriod>('3m');
  const [metric, setMetric] = useState<ChartMetric>('duration');
  const [periodMenu, setPeriodMenu] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const buckets = useMemo(
    () => bucketHistory(history, period, metric),
    [history, period, metric],
  );
  const thisWeek = useMemo(() => {
    const start = startOfWeek(new Date());
    return metricValue(
      totalsBetween(history, start, addDays(start, 7)),
      metric,
    );
  }, [history, metric]);

  const signIn = async () => {
    setSigningIn(true);
    try {
      await actions.login();
    } catch (error) {
      if (!isLoginDismissed(error))
        toast({ tone: 'error', title: describeLoginError(error) });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <>
      <TabHeader
        title={userProfile.username || 'Perfil'}
        actions={
          <>
            <IconButton
              icon={Pencil}
              label="Editar perfil"
              onClick={() => push({ name: 'editProfile' })}
            />
            <IconButton
              icon={Settings}
              label="Configurações"
              onClick={() => push({ name: 'settings' })}
            />
          </>
        }
      />

      <div className="app-column px-4 pt-2">
        <div className="flex items-center gap-5">
          <Avatar
            name={userProfile.name}
            photoUrl={currentUser?.photoURL}
            size={80}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-headline truncate font-semibold">
              {userProfile.name}
            </h2>
            <dl className="mt-2 grid grid-cols-3 gap-2">
              {[
                { label: 'Treinos', value: history.length },
                { label: 'Recordes', value: prs.length },
                { label: 'Sequência', value: streakWeeks, unit: 'sem' },
              ].map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="text-caption text-ink-2">{item.label}</dt>
                  <dd className="font-metric text-metric-sm">
                    {formatNumber(item.value, 0)}
                    {item.unit && (
                      <span className="text-caption ml-0.5 font-sans font-medium text-ink-2">
                        {item.unit}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        {userProfile.bio && (
          <p className="text-body mt-4 whitespace-pre-line">
            {userProfile.bio}
          </p>
        )}
        {!currentUser && (
          <Card className="mt-4 p-4">
            <div className="flex items-center gap-2">
              <Badge>Modo local</Badge>
            </div>
            <p className="text-callout mt-2 text-ink-2">
              Seus dados estão só neste aparelho. Entre com Google para
              sincronizar e não perder seu histórico.
            </p>
            <Button block className="mt-3" loading={signingIn} onClick={signIn}>
              Entrar com Google
            </Button>
          </Card>
        )}

        <section className="mt-6" aria-labelledby="profile-chart">
          <div className="flex items-end justify-between gap-3">
            <p id="profile-chart" className="min-w-0">
              <span className="font-metric text-metric">
                {formatMetric(metric, thisWeek)}
              </span>{' '}
              <span className="text-callout text-ink-2">esta semana</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              trailingIcon={ChevronDown}
              onClick={() => setPeriodMenu(true)}
              className="-mr-2"
            >
              {PERIODS.find((item) => item.value === period)?.label}
            </Button>
          </div>
          <div className="mt-4">
            <BarChart
              data={buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                value: bucket.value,
              }))}
              label={`${METRICS.find((item) => item.value === metric)?.label} por ${period === '1y' ? 'mês' : 'semana'}`}
              formatValue={(value) => formatMetric(metric, value)}
              formatTick={(value) => formatMetricTick(metric, value)}
              emptyMessage="Sem treinos no período"
            />
          </div>
          <SegmentedControl
            label="Métrica do gráfico"
            options={METRICS}
            value={metric}
            onChange={setMetric}
            className="mt-3"
          />
        </section>
      </div>

      <div className="app-column">
        <GroupLabel>Painel</GroupLabel>
        <div className="grid grid-cols-2 gap-3 px-4">
          {DASHBOARD.map(({ label, icon: Icon, route }) => (
            <button
              key={label}
              type="button"
              onClick={() => push(route)}
              className="pressable text-body flex h-14 items-center gap-3 rounded-lg bg-surface px-4 font-medium active:bg-raised"
            >
              <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <GroupLabel>Treinos</GroupLabel>
        {history.length === 0 ? (
          <Card className="mx-4">
            <EmptyState
              icon={Dumbbell}
              title="Nenhum treino concluído"
              message="Seus treinos concluídos aparecem aqui."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((workout, index) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                ordinal={history.length - index}
                athleteName={userProfile.name}
                photoUrl={currentUser?.photoURL}
                onOpen={() => push({ name: 'workout', workoutId: workout.id })}
              />
            ))}
            {history.length > 5 && (
              <div className="px-4 pt-2">
                <Button
                  variant="secondary"
                  block
                  onClick={() => push({ name: 'history' })}
                >
                  Ver todos os {history.length} treinos
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ActionSheet
        open={periodMenu}
        onClose={() => setPeriodMenu(false)}
        title="Período do gráfico"
        actions={PERIODS.map((item) => ({
          label: item.label,
          tone: item.value === period ? 'brand' : 'default',
          onSelect: () => setPeriod(item.value),
        }))}
      />
    </>
  );
}
