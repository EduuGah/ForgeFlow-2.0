import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Medal } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { RankingEntry } from '../../application/useCases/socialRankings';
import { useAppServices } from '../../composition/AppServicesProvider';
import type {
  RankingMetric,
  RankingPeriod,
} from '../../domain/social/rankings';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

const metrics = [
  { label: 'Volume', value: 'volume' },
  { label: 'Frequencia', value: 'frequency' },
  { label: 'Consistencia', value: 'consistency' },
] satisfies { label: string; value: RankingMetric }[];
const periods = [
  { label: '30 dias', value: '30_days' },
  { label: '90 dias', value: '90_days' },
  { label: '1 ano', value: '365_days' },
] satisfies { label: string; value: RankingPeriod }[];

type RankingState =
  | { status: 'error' }
  | { status: 'loading' }
  | { entries: RankingEntry[]; optedIn: boolean; status: 'ready' };

export function RankingsScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [metric, setMetric] = useState<RankingMetric>('volume');
  const [period, setPeriod] = useState<RankingPeriod>('30_days');
  const [state, setState] = useState<RankingState>({ status: 'loading' });
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const ranking = await services.rankings.get(metric, period);
      setState({
        entries: ranking.entries,
        optedIn: ranking.optedIn,
        status: 'ready',
      });
    } catch {
      setState({ status: 'error' });
    }
  }, [metric, period, services]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  async function toggleParticipation(value: boolean) {
    try {
      await services.rankings.setParticipation(value);
      setMessage(
        value ? 'Voce entrou nos rankings.' : 'Voce saiu dos rankings.',
      );
      await load();
    } catch {
      setMessage('Nao foi possivel atualizar sua participacao.');
    }
  }

  return (
    <AppScreen
      action={
        <Pressable
          accessibilityLabel="Voltar para amigos"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Friends')}
          style={styles.iconButton}
        >
          <ArrowLeft color={colors.text} size={22} />
        </Pressable>
      }
      eyebrow="Social"
      title="Rankings"
    >
      <View style={styles.optInRow}>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>Participar dos rankings</Text>
          <Text style={styles.rowBody}>
            Somente sua pontuacao agregada e seu perfil basico aparecem.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Participar dos rankings"
          onValueChange={toggleParticipation}
          trackColor={{ false: colors.border, true: colors.success }}
          value={state.status === 'ready' && state.optedIn}
        />
      </View>
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Section title="Classificacao">
        <SegmentedControl
          items={metrics}
          selected={metric}
          onSelect={(value) => setMetric(value as RankingMetric)}
        />
        <SegmentedControl
          items={periods}
          selected={period}
          onSelect={(value) => setPeriod(value as RankingPeriod)}
        />
        {state.status === 'loading' ? (
          <EmptyState
            body="Calculando pontuacoes."
            kind="loading"
            title="Ranking"
          />
        ) : state.status === 'error' ? (
          <EmptyState
            body="Tente novamente mais tarde."
            kind="error"
            title="Ranking indisponivel"
          />
        ) : state.entries.length ? (
          <View style={styles.list}>
            {state.entries.map((entry) => (
              <RankingRow
                entry={entry}
                key={entry.profile.userId}
                metric={metric}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            body="Nenhum atleta optou por este ranking."
            title="Sem participantes"
          />
        )}
      </Section>
    </AppScreen>
  );
}

function RankingRow({
  entry,
  metric,
}: {
  entry: RankingEntry;
  metric: RankingMetric;
}) {
  return (
    <View style={[styles.rankingRow, entry.isCurrentUser && styles.currentRow]}>
      <View style={styles.position}>
        {entry.position <= 3 ? (
          <Medal
            color={entry.position === 1 ? '#8A6A00' : colors.accent}
            size={22}
          />
        ) : (
          <Text style={styles.positionText}>{entry.position}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.rowTitle}>
          {entry.profile.displayName}
          {entry.isCurrentUser ? ' (voce)' : ''}
        </Text>
        <Text style={styles.username}>@{entry.profile.username}</Text>
      </View>
      <Text style={styles.value}>{formatValue(entry.value, metric)}</Text>
    </View>
  );
}

function SegmentedControl({
  items,
  onSelect,
  selected,
}: {
  items: { label: string; value: string }[];
  onSelect: (value: string) => void;
  selected: string;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segments}>
      {items.map((item) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: selected === item.value }}
          key={item.value}
          onPress={() => onSelect(item.value)}
          style={[
            styles.segment,
            selected === item.value && styles.segmentActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              selected === item.value && styles.segmentTextActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function formatValue(value: number, metric: RankingMetric) {
  if (metric === 'volume')
    return `${Math.round(value).toLocaleString('pt-BR')} kg`;
  if (metric === 'consistency') return `${value}%`;
  return `${value} treinos`;
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 2 },
  currentRow: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  list: { gap: spacing.sm },
  message: { ...typography.body, color: colors.textMuted },
  optInRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  position: { alignItems: 'center', justifyContent: 'center', width: 32 },
  positionText: { ...typography.subtitle, color: colors.textMuted },
  rankingRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    padding: spacing.md,
  },
  rowBody: { ...typography.caption, color: colors.textMuted },
  rowTitle: { ...typography.body, color: colors.text, fontWeight: '800' },
  segment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: { backgroundColor: colors.accent, borderRadius: radius.md },
  segmentText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  segmentTextActive: { color: colors.surface },
  segments: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 3,
  },
  username: { ...typography.caption, color: colors.accent },
  value: { ...typography.body, color: colors.text, fontWeight: '900' },
});
