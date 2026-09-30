import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Flag, Medal } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ChallengeView } from '../../application/useCases/challenges';
import { useAppServices } from '../../composition/AppServicesProvider';
import type { RankingMetric } from '../../domain/social/rankings';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

const metrics = [
  { label: 'Volume', value: 'volume' },
  { label: 'Treinos', value: 'frequency' },
  { label: 'Consistencia', value: 'consistency' },
] satisfies { label: string; value: RankingMetric }[];

const durations = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
];

type ScreenState =
  | { status: 'error' }
  | { status: 'loading' }
  | { challenges: ChallengeView[]; status: 'ready' };

export function ChallengesScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<RankingMetric>('volume');
  const [duration, setDuration] = useState('30');
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const challenges = await services.challenges.getOverview();
      setState({ challenges, status: 'ready' });
    } catch {
      setState({ status: 'error' });
    }
  }, [services]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  async function create() {
    setBusyId('create');
    setMessage(null);
    try {
      await services.challenges.create({
        durationDays: Number(duration),
        metric,
        title,
      });
      setTitle('');
      setMessage('Desafio criado. Voce ja esta participando.');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function runAction(
    challengeId: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusyId(challengeId);
    setMessage(null);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar.',
      );
    } finally {
      setBusyId(null);
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
      title="Desafios"
    >
      <Section title="Criar desafio">
        <View style={styles.createPanel}>
          <TextInput
            accessibilityLabel="Titulo do desafio"
            maxLength={60}
            onChangeText={setTitle}
            placeholder="Ex.: 30 dias de volume"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
            value={title}
          />
          <View style={styles.field}>
            <Text style={styles.label}>Metrica</Text>
            <Segments
              items={metrics}
              onSelect={(value) => setMetric(value as RankingMetric)}
              selected={metric}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Duracao</Text>
            <Segments
              items={durations}
              onSelect={setDuration}
              selected={duration}
            />
          </View>
          <Text style={styles.rule}>
            Ganha quem somar a maior pontuacao entre o inicio e o fim. O
            progresso e atualizado pelos treinos concluidos.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busyId !== null}
            onPress={() => void create()}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || busyId !== null) && styles.buttonPressed,
            ]}
          >
            <Flag color={colors.surface} size={19} />
            <Text style={styles.primaryButtonText}>
              {busyId === 'create' ? 'Criando...' : 'Criar desafio'}
            </Text>
          </Pressable>
        </View>
      </Section>

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}

      <Section title="Desafios da comunidade">
        {state.status === 'loading' ? (
          <EmptyState
            body="Calculando o progresso dos participantes."
            kind="loading"
            title="Carregando desafios"
          />
        ) : state.status === 'error' ? (
          <EmptyState
            body="Tente novamente mais tarde."
            kind="error"
            title="Desafios indisponiveis"
          />
        ) : state.challenges.length ? (
          <View style={styles.list}>
            {state.challenges.map((view) => (
              <ChallengeCard
                busy={busyId === view.challenge.id}
                key={view.challenge.id}
                onFinish={() =>
                  runAction(
                    view.challenge.id,
                    () => services.challenges.finish(view.challenge.id),
                    'Desafio finalizado.',
                  )
                }
                onJoin={() =>
                  runAction(
                    view.challenge.id,
                    () => services.challenges.join(view.challenge.id),
                    'Voce entrou no desafio.',
                  )
                }
                onLeave={() =>
                  runAction(
                    view.challenge.id,
                    () => services.challenges.leave(view.challenge.id),
                    'Voce saiu do desafio.',
                  )
                }
                view={view}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            body="Crie o primeiro desafio para comecar."
            title="Nenhum desafio"
          />
        )}
      </Section>
    </AppScreen>
  );
}

function ChallengeCard({
  busy,
  onFinish,
  onJoin,
  onLeave,
  view,
}: {
  busy: boolean;
  onFinish: () => void;
  onJoin: () => void;
  onLeave: () => void;
  view: ChallengeView;
}) {
  const { challenge } = view;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardMeta}>
            {metricLabel(challenge.metric)} · {formatDate(challenge.startsAt)} a{' '}
            {formatDate(challenge.endsAt)}
          </Text>
        </View>
        <Text
          style={[
            styles.status,
            view.effectiveStatus === 'active' && styles.statusActive,
          ]}
        >
          {view.effectiveStatus === 'active' ? 'Em andamento' : 'Finalizado'}
        </Text>
      </View>

      <Text style={styles.rule}>
        Maior {metricLabel(challenge.metric).toLocaleLowerCase('pt-BR')} vence.
        Somente treinos dentro do periodo contam.
      </Text>

      <View style={styles.ranking}>
        <Text style={styles.label}>Classificacao</Text>
        {view.ranking.length ? (
          view.ranking.map((entry) => (
            <View
              key={entry.profile.userId}
              style={[styles.rankRow, entry.isCurrentUser && styles.currentRow]}
            >
              <View style={styles.position}>
                {entry.position <= 3 ? (
                  <Medal color={colors.accent} size={18} />
                ) : (
                  <Text style={styles.positionText}>{entry.position}</Text>
                )}
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.participantName}>
                  {entry.profile.displayName}
                  {entry.isCurrentUser ? ' (voce)' : ''}
                </Text>
                <Text style={styles.username}>@{entry.profile.username}</Text>
              </View>
              <Text style={styles.score}>
                {formatValue(entry.value, challenge.metric)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.rule}>Nenhum participante ativo.</Text>
        )}
      </View>

      {view.effectiveStatus === 'active' ? (
        <View style={styles.actions}>
          {view.canJoin ? (
            <ActionButton busy={busy} label="Participar" onPress={onJoin} />
          ) : null}
          {view.canLeave ? (
            <ActionButton
              busy={busy}
              label="Sair do desafio"
              onPress={onLeave}
              secondary
            />
          ) : null}
          {view.canFinish ? (
            <ActionButton
              busy={busy}
              label="Finalizar"
              onPress={onFinish}
              secondary
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  busy,
  label,
  onPress,
  secondary = false,
}: {
  busy: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        secondary && styles.secondaryButton,
        (pressed || busy) && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {busy ? 'Atualizando...' : label}
      </Text>
    </Pressable>
  );
}

function Segments({
  items,
  onSelect,
  selected,
}: {
  items: readonly { label: string; value: string }[];
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

function metricLabel(metric: RankingMetric) {
  if (metric === 'volume') return 'Volume';
  if (metric === 'frequency') return 'Frequencia';
  return 'Consistencia';
}

function formatValue(value: number, metric: RankingMetric) {
  if (metric === 'volume')
    return `${Math.round(value).toLocaleString('pt-BR')} kg`;
  if (metric === 'consistency') return `${value}%`;
  return `${value} treinos`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '900',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  buttonPressed: { opacity: 0.6 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardCopy: { flex: 1, gap: 2 },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  cardTitle: { ...typography.subtitle, color: colors.text },
  createPanel: { gap: spacing.md },
  currentRow: { backgroundColor: colors.successSoft },
  field: { gap: spacing.xs },
  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '800' },
  list: { gap: spacing.md },
  message: { ...typography.body, color: colors.successText },
  participantName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '800',
  },
  position: { alignItems: 'center', justifyContent: 'center', width: 24 },
  positionText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '900',
  },
  rankRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  ranking: { gap: spacing.xs },
  rule: { ...typography.caption, color: colors.textMuted },
  score: { ...typography.body, color: colors.text, fontWeight: '900' },
  secondaryButton: { backgroundColor: colors.surface },
  secondaryButtonText: { color: colors.accent },
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
  status: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  statusActive: { color: colors.successText },
  username: { ...typography.caption, color: colors.accent },
});
