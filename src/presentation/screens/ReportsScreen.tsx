import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  Activity,
  Beef,
  Droplets,
  Dumbbell,
  FileText,
  Flame,
  Home,
  RefreshCw,
  Target,
  Trophy,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppServices } from '../../composition/AppServicesProvider';
import type { ConsolidatedReport } from '../../domain/reports/entities';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

const periodOptions = [7, 30, 90, 365] as const;

type ReportState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: ConsolidatedReport };

export function ReportsScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [days, setDays] = useState<(typeof periodOptions)[number]>(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<ReportState>({ status: 'loading' });

  useEffect(() => {
    let isMounted = true;
    services.reports
      .generate(createPeriod(days))
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

  return (
    <AppScreen
      action={
        <View style={styles.headerActions}>
          <IconButton
            icon={<Home color={colors.textMuted} size={19} />}
            label="Voltar para Home"
            onPress={() => navigation.navigate('Home')}
          />
          <IconButton
            icon={<RefreshCw color={colors.accent} size={19} />}
            label="Atualizar relatorio"
            onPress={() => {
              setState({ status: 'loading' });
              setRefreshKey((value) => value + 1);
            }}
          />
        </View>
      }
      eyebrow="Analise"
      title="Relatorios"
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
              {option === 365 ? '1 ano' : `${option} dias`}
            </Text>
          </Pressable>
        ))}
      </View>

      {state.status === 'loading' ? (
        <EmptyState
          body="Consolidando seus dados locais..."
          title="Gerando relatorio"
        />
      ) : null}
      {state.status === 'error' ? (
        <EmptyState
          body="Seus registros foram preservados. Tente atualizar novamente."
          title="Nao foi possivel gerar"
        />
      ) : null}
      {state.status === 'ready' ? <ReportContent report={state.value} /> : null}
    </AppScreen>
  );
}

function ReportContent({ report }: { report: ConsolidatedReport }) {
  return (
    <>
      <View style={styles.reportMeta}>
        <FileText color={colors.accent} size={20} />
        <View style={styles.reportMetaText}>
          <Text style={styles.reportPeriod}>{formatPeriod(report.period)}</Text>
          <Text style={styles.reportGenerated}>
            Atualizado {formatDateTime(report.generatedAt)}
          </Text>
        </View>
        <Text style={styles.readyStatus}>
          Estrutura v{report.schemaVersion}
        </Text>
      </View>

      <View style={styles.metrics}>
        <MetricCard
          detail={formatComparison(
            report.training.comparisons.workoutCount.percentageChange,
          )}
          icon={<Activity color={colors.accent} size={18} />}
          label="Treinos"
          value={String(report.training.summary.workoutCount)}
        />
        <MetricCard
          detail={formatComparison(
            report.training.comparisons.volume.percentageChange,
          )}
          icon={<Dumbbell color={colors.accent} size={18} />}
          label="Volume"
          value={`${formatNumber(report.training.summary.volume)} kg`}
        />
        <MetricCard
          detail={`${report.nutrition.totals.mealCount} refeicoes`}
          icon={<Flame color={colors.warning} size={18} />}
          label="Energia"
          value={`${formatNumber(report.nutrition.totals.kcal)} kcal`}
        />
        <MetricCard
          detail={`${formatNumber(report.hydration.averageDailyMl)} ml/dia`}
          icon={<Droplets color={colors.accent} size={18} />}
          label="Agua"
          value={`${formatNumber(report.hydration.totalMl)} ml`}
        />
      </View>

      <Section title="Treinamento">
        <View style={styles.detailGrid}>
          <DetailStat
            label="Frequencia"
            value={`${formatNumber(report.training.summary.frequencyPerWeek)} / semana`}
          />
          <DetailStat
            label="Duracao"
            value={formatDuration(report.training.summary.durationSeconds)}
          />
          <DetailStat
            label="Series"
            value={String(report.training.summary.workingSetCount)}
          />
          <DetailStat
            label="Repeticoes"
            value={String(report.training.summary.repetitions)}
          />
          <DetailStat
            label="Recordes"
            value={String(report.training.summary.personalRecordCount)}
          />
          <DetailStat
            label="Exercicios"
            value={String(report.training.exercises.length)}
          />
        </View>
        {report.training.exercises.length > 0 ? (
          <View style={styles.list}>
            {report.training.exercises.slice(0, 5).map((exercise, index) => (
              <View key={exercise.exerciseId} style={styles.listRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.listMain}>
                  <Text style={styles.listTitle}>{exercise.exerciseName}</Text>
                  <Text style={styles.listCaption}>
                    {exercise.workingSetCount} series ·{' '}
                    {exercise.personalRecordCount} PR
                  </Text>
                </View>
                <Text style={styles.listValue}>
                  {formatNumber(exercise.volume)} kg
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyLine}>
            Sem exercicios concluidos no periodo.
          </Text>
        )}
      </Section>

      <Section title="Nutricao e hidratacao">
        <View style={styles.detailGrid}>
          <DetailStat
            icon={<Beef color={colors.accent} size={16} />}
            label="Proteina"
            value={`${formatNumber(report.nutrition.totals.proteinG)} g`}
          />
          <DetailStat
            label="Carboidratos"
            value={`${formatNumber(report.nutrition.totals.carbsG)} g`}
          />
          <DetailStat
            label="Gorduras"
            value={`${formatNumber(report.nutrition.totals.fatG)} g`}
          />
          <DetailStat
            label="Media calorica"
            value={`${formatNumber(report.nutrition.averageDailyKcal)} kcal/dia`}
          />
          <DetailStat
            label="Meta de agua"
            value={
              report.hydration.targetMl
                ? `${formatNumber(report.hydration.targetMl)} ml`
                : 'Nao definida'
            }
          />
          <DetailStat
            label="Dias na meta"
            value={
              report.hydration.goalDaysReached === null
                ? '--'
                : String(report.hydration.goalDaysReached)
            }
          />
        </View>
      </Section>

      <Section title="Objetivos">
        <View style={styles.goalSummary}>
          <GoalStat
            icon={<Target color={colors.accent} size={18} />}
            label="Ativos"
            value={report.goals.activeCount}
          />
          <GoalStat
            icon={<Activity color={colors.warning} size={18} />}
            label="Atrasados"
            value={report.goals.behindCount}
          />
          <GoalStat
            icon={<Trophy color={colors.successText} size={18} />}
            label="Concluidos"
            value={report.goals.completedCount}
          />
        </View>
        {report.goals.items.length > 0 ? (
          <View style={styles.list}>
            {report.goals.items.slice(0, 5).map((goal) => (
              <View key={goal.id} style={styles.listRow}>
                <View style={styles.listMain}>
                  <Text style={styles.listTitle}>{goal.title}</Text>
                  <Text style={styles.listCaption}>
                    {formatGoalStatus(goal.status)}
                  </Text>
                </View>
                <Text style={styles.listValue}>
                  {formatNumber(goal.progressPercent)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyLine}>Sem objetivos registrados.</Text>
        )}
      </Section>

      <Section title="Cobertura dos dados">
        <View style={styles.coverageRow}>
          <Text style={styles.coverageLabel}>Peso corporal</Text>
          <Text style={styles.coverageUnavailable}>Sem registros</Text>
        </View>
      </Section>
    </>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
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
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function DetailStat({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailStat}>
      <View style={styles.detailLabelRow}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function GoalStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.goalStat}>
      {icon}
      <Text style={styles.goalValue}>{value}</Text>
      <Text style={styles.goalLabel}>{label}</Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      {icon}
    </Pressable>
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

function formatPeriod(period: ConsolidatedReport['period']) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${formatter.format(new Date(period.from))} a ${formatter.format(new Date(period.to))}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatComparison(value: number | null) {
  if (value === null) return 'Sem periodo anterior';
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}% vs. anterior`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatGoalStatus(
  status: ConsolidatedReport['goals']['items'][number]['status'],
) {
  const labels: Record<typeof status, string> = {
    active: 'Ativa',
    behind: 'Atrasada',
    cancelled: 'Cancelada',
    completed: 'Concluida',
    expired: 'Expirada',
    on_track: 'No ritmo',
    paused: 'Pausada',
  };
  return labels[status];
}

const styles = StyleSheet.create({
  coverageLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  coverageRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  coverageUnavailable: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailLabel: { ...typography.caption, color: colors.textMuted },
  detailLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  detailStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 145,
    padding: spacing.md,
  },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '900' },
  emptyLine: { ...typography.body, color: colors.textMuted },
  goalLabel: { ...typography.caption, color: colors.textMuted },
  goalStat: { alignItems: 'center', flex: 1, gap: 3, minWidth: 80 },
  goalSummary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  goalValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
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
  list: { gap: spacing.xs },
  listCaption: { ...typography.caption, color: colors.textMuted },
  listMain: { flex: 1, gap: 2, minWidth: 0 },
  listRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 54,
    paddingVertical: spacing.xs,
  },
  listTitle: { ...typography.body, color: colors.text, fontWeight: '800' },
  listValue: { ...typography.caption, color: colors.accent, fontWeight: '900' },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 110,
    minWidth: 150,
    padding: spacing.md,
  },
  metricDetail: { ...typography.caption, color: colors.textMuted },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  metricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  periodButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 70,
    paddingHorizontal: spacing.sm,
  },
  periodButtonActive: { backgroundColor: colors.accent },
  periods: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  periodText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  periodTextActive: { color: colors.surface },
  pressed: { opacity: 0.72 },
  rank: {
    color: colors.textSubtle,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    width: 24,
  },
  readyStatus: {
    ...typography.caption,
    color: colors.successText,
    fontWeight: '800',
  },
  reportGenerated: { ...typography.caption, color: colors.textMuted },
  reportMeta: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  reportMetaText: { flex: 1, gap: 2 },
  reportPeriod: { ...typography.body, color: colors.text, fontWeight: '800' },
});
