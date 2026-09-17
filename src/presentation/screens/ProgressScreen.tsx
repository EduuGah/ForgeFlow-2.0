import { useEffect, useState } from 'react';
import {
  Activity,
  Clock3,
  Dumbbell,
  RefreshCw,
  Trophy,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useAppServices } from '../../composition/AppServicesProvider';
import type { TrainingAnalytics } from '../../domain/training/analytics';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

const periodOptions = [7, 30, 90] as const;

type AnalyticsState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: TrainingAnalytics };

export function ProgressScreen() {
  const services = useAppServices();
  const [days, setDays] = useState<(typeof periodOptions)[number]>(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    services.analytics
      .get(createPeriod(days))
      .then((value) => {
        if (isMounted) setState({ status: 'ready', value });
      })
      .catch(() => {
        if (isMounted) setState({ status: 'error' });
      });

    return () => {
      isMounted = false;
    };
  }, [days, refreshKey, services]);

  const analytics = state.status === 'ready' ? state.value : null;

  return (
    <AppScreen
      action={
        <Pressable
          accessibilityLabel="Atualizar analise"
          onPress={() => {
            setState({ status: 'loading' });
            setRefreshKey((value) => value + 1);
          }}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          <RefreshCw color={colors.accent} size={19} />
        </Pressable>
      }
      eyebrow="Progresso"
      title="Seu treino em numeros"
    >
      <View accessibilityRole="tablist" style={styles.periods}>
        {periodOptions.map((option) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: days === option }}
            key={option}
            onPress={() => {
              setState({ status: 'loading' });
              setDays(option);
            }}
            style={[
              styles.periodButton,
              days === option && styles.periodButtonActive,
            ]}
          >
            <Text
              style={[
                styles.periodText,
                days === option && styles.periodTextActive,
              ]}
            >
              {option} dias
            </Text>
          </Pressable>
        ))}
      </View>

      {state.status === 'loading' ? (
        <EmptyState body="Calculando seus treinos..." title="Atualizando" />
      ) : null}
      {state.status === 'error' ? (
        <EmptyState
          body="Tente atualizar novamente. Seus registros locais foram preservados."
          title="Nao foi possivel calcular"
        />
      ) : null}
      {analytics && analytics.summary.workoutCount === 0 ? (
        <EmptyState
          body={`Conclua um treino para liberar volume, frequencia e evolucao dos ultimos ${days} dias.`}
          title="Sem treinos no periodo"
        />
      ) : null}
      {analytics && analytics.summary.workoutCount > 0 ? (
        <AnalyticsContent analytics={analytics} />
      ) : null}
    </AppScreen>
  );
}

function AnalyticsContent({ analytics }: { analytics: TrainingAnalytics }) {
  return (
    <>
      <View style={styles.metrics}>
        <MetricCard
          comparison={analytics.comparisons.workoutCount.percentageChange}
          icon={<Activity color={colors.accent} size={18} />}
          label="Treinos"
          value={String(analytics.summary.workoutCount)}
        />
        <MetricCard
          comparison={analytics.comparisons.volume.percentageChange}
          icon={<Dumbbell color={colors.accent} size={18} />}
          label="Volume"
          value={`${formatNumber(analytics.summary.volume)} kg`}
        />
        <MetricCard
          comparison={analytics.comparisons.durationSeconds.percentageChange}
          icon={<Clock3 color={colors.accent} size={18} />}
          label="Duracao"
          value={formatDuration(analytics.summary.durationSeconds)}
        />
        <MetricCard
          icon={<Trophy color={colors.warning} size={18} />}
          label="Recordes"
          value={String(analytics.summary.personalRecordCount)}
        />
      </View>

      <Section title="Volume por treino">
        <VolumeChart points={analytics.timeline} />
        <Text style={styles.supportingText}>
          {formatNumber(analytics.summary.workingSetCount)} series de trabalho ·{' '}
          {formatNumber(analytics.summary.repetitions)} repeticoes ·{' '}
          {analytics.summary.frequencyPerWeek} treinos por semana
        </Text>
      </Section>

      <Section title="Exercicios no periodo">
        <View style={styles.exerciseList}>
          {analytics.exercises.map((exercise, index) => (
            <View key={exercise.exerciseId} style={styles.exerciseRow}>
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseMain}>
                <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.workingSetCount} series · Max.{' '}
                  {exercise.maxWeightKg} kg
                  {' · '}
                  {exercise.maxRepetitions} reps
                </Text>
              </View>
              <View style={styles.exerciseValue}>
                <Text style={styles.exerciseVolume}>
                  {formatNumber(exercise.volume)} kg
                </Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.personalRecordCount} PR
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Recordes pessoais">
        <View style={styles.recordGrid}>
          <RecordStat label="Peso" value={analytics.personalRecords.weight} />
          <RecordStat label="Volume" value={analytics.personalRecords.volume} />
          <RecordStat
            label="Repeticoes"
            value={analytics.personalRecords.repetitions}
          />
          <RecordStat
            label="1RM estimado"
            value={analytics.personalRecords.estimated_1rm}
          />
        </View>
      </Section>
    </>
  );
}

function MetricCard({
  comparison,
  icon,
  label,
  value,
}: {
  comparison?: number | null;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricLabelRow}>
        {icon}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      {comparison !== undefined ? (
        <Text
          style={[
            styles.comparison,
            comparison !== null && comparison < 0 && styles.comparisonDown,
          ]}
        >
          {formatComparison(comparison)} vs. periodo anterior
        </Text>
      ) : (
        <Text style={styles.comparison}>No periodo selecionado</Text>
      )}
    </View>
  );
}

function VolumeChart({ points }: { points: TrainingAnalytics['timeline'] }) {
  const width = 320;
  const height = 150;
  const inset = 18;
  const values = points.map((point) => point.volume);
  const max = Math.max(...values, 1);
  const coordinates = points.map((point, index) => ({
    x:
      points.length === 1
        ? width / 2
        : inset + (index / (points.length - 1)) * (width - inset * 2),
    y: height - inset - (point.volume / max) * (height - inset * 2),
  }));
  const path = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <View
      accessibilityLabel={`Grafico de volume com ${points.length} dias registrados`}
      style={styles.chart}
    >
      <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
        {[0, 1, 2].map((line) => {
          const y = inset + (line / 2) * (height - inset * 2);
          return (
            <Line
              key={line}
              stroke={colors.border}
              strokeWidth={1}
              x1={inset}
              x2={width - inset}
              y1={y}
              y2={y}
            />
          );
        })}
        <Path
          d={path}
          fill="none"
          stroke={colors.accent}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
        {coordinates.map((point, index) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={colors.surface}
            key={`${points[index].date}-${points[index].volume}`}
            r={4}
            stroke={colors.accent}
            strokeWidth={3}
          />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{formatDate(points[0].date)}</Text>
        <Text style={styles.chartTotal}>Pico {formatNumber(max)} kg</Text>
        <Text style={styles.chartLabel}>
          {formatDate(points[points.length - 1].date)}
        </Text>
      </View>
    </View>
  );
}

function RecordStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.recordStat}>
      <Text style={styles.recordValue}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function createPeriod(days: number) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatComparison(value: number | null) {
  if (value === null) return 'Novo';
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    value,
  );
}

const styles = StyleSheet.create({
  chart: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  chartLabel: { ...typography.caption, color: colors.textMuted },
  chartLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartTotal: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
  },
  comparison: { ...typography.caption, color: colors.successText },
  comparisonDown: { color: colors.danger },
  exerciseList: { gap: spacing.xs },
  exerciseMain: { flex: 1, gap: 2, minWidth: 0 },
  exerciseMeta: { ...typography.caption, color: colors.textMuted },
  exerciseName: { ...typography.body, color: colors.text, fontWeight: '800' },
  exerciseRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  exerciseValue: { alignItems: 'flex-end', gap: 2 },
  exerciseVolume: { ...typography.body, color: colors.text, fontWeight: '800' },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 122,
    padding: spacing.md,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  periodButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  periodButtonActive: { backgroundColor: colors.accent },
  periodText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '800',
  },
  periodTextActive: { color: colors.surface },
  periods: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  pressed: { opacity: 0.72 },
  rank: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rankText: {
    ...typography.caption,
    color: colors.successText,
    fontWeight: '900',
  },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recordLabel: { ...typography.caption, color: colors.textMuted },
  recordStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
  },
  recordValue: {
    color: colors.warning,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  supportingText: { ...typography.caption, color: colors.textMuted },
});
