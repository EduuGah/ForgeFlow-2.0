import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ShieldCheck, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CompetitionView } from '../../application/useCases/competitions';
import { useAppServices } from '../../composition/AppServicesProvider';
import type { RankingMetric } from '../../domain/social/rankings';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

const metricItems = [
  { label: 'Volume', value: 'volume' },
  { label: 'Treinos', value: 'frequency' },
  { label: 'Consistencia', value: 'consistency' },
];
const registrationItems = [
  { label: '1 dia', value: '1' },
  { label: '3 dias', value: '3' },
  { label: '7 dias', value: '7' },
];
const durationItems = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
];

export function CompetitionsScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [views, setViews] = useState<CompetitionView[] | null>(null);
  const [title, setTitle] = useState('');
  const [metric, setMetric] = useState<RankingMetric>('consistency');
  const [registrationDays, setRegistrationDays] = useState('3');
  const [durationDays, setDurationDays] = useState('30');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setViews(await services.competitions.getOverview());
    } catch {
      setViews([]);
      setMessage('Nao foi possivel carregar as competicoes.');
    }
  }, [services]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  async function create() {
    setBusy('create');
    try {
      await services.competitions.create({
        durationDays: Number(durationDays),
        metric,
        registrationDays: Number(registrationDays),
        title,
      });
      setTitle('');
      setMessage('Competicao criada. As regras congelam quando ela iniciar.');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel criar.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function act(
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(id);
    try {
      await action();
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar.',
      );
    } finally {
      setBusy(null);
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
      title="Competicoes"
    >
      <Section title="Nova competicao">
        <TextInput
          accessibilityLabel="Titulo da competicao"
          maxLength={60}
          onChangeText={setTitle}
          placeholder="Ex.: Liga da consistencia"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={title}
        />
        <Field label="Metrica">
          <Segments
            items={metricItems}
            selected={metric}
            onSelect={(value) => setMetric(value as RankingMetric)}
          />
        </Field>
        <Field label="Inscricoes">
          <Segments
            items={registrationItems}
            selected={registrationDays}
            onSelect={setRegistrationDays}
          />
        </Field>
        <Field label="Duracao">
          <Segments
            items={durationItems}
            selected={durationDays}
            onSelect={setDurationDays}
          />
        </Field>
        <View style={styles.notice}>
          <ShieldCheck color={colors.accent} size={20} />
          <Text style={styles.caption}>
            Metrica e periodo ficam imutaveis apos o inicio. A pontuacao vem dos
            treinos e nao pode ser editada.
          </Text>
        </View>
        <PrimaryButton
          disabled={busy !== null}
          label={busy === 'create' ? 'Criando...' : 'Criar competicao'}
          onPress={() => void create()}
        />
      </Section>

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}

      <Section title="Competicoes">
        {views === null ? (
          <EmptyState
            body="Carregando participantes e resultados."
            kind="loading"
            title="Competicoes"
          />
        ) : views.length ? (
          <View style={styles.list}>
            {views.map((view) => (
              <View key={view.competition.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{view.competition.title}</Text>
                    <Text style={styles.caption}>
                      {metricLabel(view.competition.metric)} ·{' '}
                      {formatDate(view.competition.startsAt)} a{' '}
                      {formatDate(view.competition.endsAt)}
                    </Text>
                  </View>
                  <Text style={styles.status}>{statusLabel(view.status)}</Text>
                </View>
                <Text style={styles.caption}>
                  Regras v{view.competition.rulesVersion} · inscricoes ate{' '}
                  {formatDate(view.competition.registrationEndsAt)}
                </Text>
                <View style={styles.ranking}>
                  <Text style={styles.label}>
                    {view.resultIsFinal
                      ? 'Resultado oficial'
                      : 'Ranking provisorio'}
                  </Text>
                  {view.entries.map((entry) => (
                    <View
                      key={entry.profile.userId}
                      style={[
                        styles.rankRow,
                        entry.isCurrentUser && styles.current,
                      ]}
                    >
                      <Text style={styles.position}>{entry.position}</Text>
                      <View style={styles.copy}>
                        <Text style={styles.name}>
                          {entry.profile.displayName}
                          {entry.isCurrentUser ? ' (voce)' : ''}
                        </Text>
                        <Text style={styles.username}>
                          @{entry.profile.username}
                        </Text>
                      </View>
                      <Text style={styles.score}>
                        {formatScore(entry.score, view.competition.metric)}
                      </Text>
                    </View>
                  ))}
                </View>
                {view.canJoin ? (
                  <PrimaryButton
                    disabled={busy === view.competition.id}
                    label="Participar"
                    onPress={() =>
                      void act(
                        view.competition.id,
                        () => services.competitions.join(view.competition.id),
                        'Inscricao confirmada.',
                      )
                    }
                  />
                ) : null}
                {view.canLeave ? (
                  <SecondaryButton
                    disabled={busy === view.competition.id}
                    label="Cancelar inscricao"
                    onPress={() =>
                      void act(
                        view.competition.id,
                        () => services.competitions.leave(view.competition.id),
                        'Inscricao cancelada.',
                      )
                    }
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            body="Crie a primeira competicao estruturada."
            title="Nenhuma competicao"
          />
        )}
      </Section>
    </AppScreen>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Segments({
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
          accessibilityState={{ selected: item.value === selected }}
          key={item.value}
          onPress={() => onSelect(item.value)}
          style={[
            styles.segment,
            item.value === selected && styles.segmentActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              item.value === selected && styles.segmentTextActive,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primary, disabled && styles.disabled]}
    >
      <Trophy color={colors.surface} size={19} />
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondary, disabled && styles.disabled]}
    >
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function metricLabel(metric: RankingMetric) {
  return metric === 'volume'
    ? 'Volume'
    : metric === 'frequency'
      ? 'Frequencia'
      : 'Consistencia';
}
function statusLabel(status: CompetitionView['status']) {
  return status === 'registration'
    ? 'Inscricoes'
    : status === 'active'
      ? 'Em andamento'
      : status === 'finished'
        ? 'Finalizada'
        : 'Cancelada';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
function formatScore(value: number, metric: RankingMetric) {
  return metric === 'volume'
    ? `${Math.round(value).toLocaleString('pt-BR')} kg`
    : metric === 'frequency'
      ? `${value} treinos`
      : `${value}%`;
}

const styles = StyleSheet.create({
  caption: { ...typography.caption, color: colors.textMuted, flex: 1 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  copy: { flex: 1, gap: 2 },
  current: { backgroundColor: colors.successSoft },
  disabled: { opacity: 0.55 },
  field: { gap: spacing.xs },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
  name: { ...typography.body, color: colors.text, fontWeight: '800' },
  notice: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  position: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '900',
    width: 24,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  primaryText: { ...typography.body, color: colors.surface, fontWeight: '900' },
  ranking: { gap: spacing.xs },
  rankRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    padding: spacing.sm,
  },
  score: { ...typography.body, color: colors.text, fontWeight: '900' },
  secondary: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '800',
  },
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
    color: colors.successText,
    fontWeight: '900',
  },
  title: { ...typography.subtitle, color: colors.text },
  username: { ...typography.caption, color: colors.accent },
});
