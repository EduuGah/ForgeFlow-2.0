import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  ChevronRight,
  Droplet,
  Home,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppServices } from '../../composition/AppServicesProvider';
import type {
  HydrationEntry,
  HydrationSummary,
} from '../../domain/hydration/entities';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

type HydrationState =
  | { status: 'error' }
  | { status: 'loading' }
  | { entries: HydrationEntry[]; status: 'ready'; summary: HydrationSummary };

const quickAmounts = [250, 350, 500];

export function HydrationScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [selectedDate, setSelectedDate] = useState(startOfLocalDay(new Date()));
  const [state, setState] = useState<HydrationState>({ status: 'loading' });
  const [amount, setAmount] = useState('');
  const [time, setTime] = useState(currentTime());
  const [goalValue, setGoalValue] = useState('');
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const range = localDayRange(selectedDate);
    services.hydration
      .list(range)
      .then((history) => setState({ ...history, status: 'ready' }))
      .catch(() => setState({ status: 'error' }));
  }, [selectedDate, services]);

  useEffect(() => load(), [load]);

  async function addWater(amountMl: number, selectedTime = currentTime()) {
    setMessage('');
    const recordedAt = parseLocalDateTime(selectedDate, selectedTime);
    if (!recordedAt) {
      setMessage('Informe um horario valido.');
      return;
    }
    setSaving(true);
    try {
      await services.hydration.record({ amountMl, recordedAt });
      setAmount('');
      setTime(currentTime());
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel registrar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomAmount() {
    await addWater(Number(amount.replace(',', '.')), time);
  }

  async function saveGoal() {
    setMessage('');
    setSaving(true);
    try {
      await services.hydration.setGoal(Number(goalValue.replace(',', '.')));
      setGoalEditorOpen(false);
      setGoalValue('');
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel salvar.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeGoal() {
    setSaving(true);
    try {
      await services.hydration.setGoal(null);
      setGoalEditorOpen(false);
      setGoalValue('');
      load();
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(entry: HydrationEntry) {
    Alert.alert('Excluir registro?', `${entry.amountMl} ml`, [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: () => {
          services.hydration
            .delete(entry.id)
            .then(load)
            .catch(() => setMessage('Nao foi possivel excluir o registro.'));
        },
        style: 'destructive',
        text: 'Excluir',
      },
    ]);
  }

  const summary =
    state.status === 'ready'
      ? state.summary
      : {
          entryCount: 0,
          goal: null,
          progress: null,
          remainingMl: null,
          totalMl: 0,
        };

  return (
    <AppScreen
      action={
        <IconButton
          icon={<Home color={colors.textMuted} size={20} />}
          label="Voltar para Home"
          onPress={() => navigation.navigate('Home')}
        />
      }
      eyebrow="Saude"
      title="Hidratacao"
    >
      <View style={styles.dateNavigator}>
        <IconButton
          icon={<ChevronLeft color={colors.text} size={22} />}
          label="Dia anterior"
          onPress={() => setSelectedDate(addDays(selectedDate, -1))}
        />
        <View style={styles.dateTextBlock}>
          <Text style={styles.dateTitle}>
            {formatSelectedDate(selectedDate)}
          </Text>
          <Text style={styles.dateCaption}>
            {formatEntryCount(summary.entryCount)}
          </Text>
        </View>
        <IconButton
          icon={<ChevronRight color={colors.text} size={22} />}
          label="Proximo dia"
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryLabel}>Total do dia</Text>
            <Text style={styles.summaryValue}>{summary.totalMl} ml</Text>
          </View>
          <Pressable
            accessibilityLabel={
              summary.goal ? 'Editar meta diaria' : 'Definir meta diaria'
            }
            accessibilityRole="button"
            onPress={() => {
              setGoalValue(summary.goal?.targetMl.toString() ?? '');
              setGoalEditorOpen((current) => !current);
            }}
            style={styles.goalAction}
          >
            {goalEditorOpen ? (
              <X color={colors.accent} size={18} />
            ) : (
              <Pencil color={colors.accent} size={17} />
            )}
            <Text style={styles.goalActionText}>
              {summary.goal ? `${summary.goal.targetMl} ml` : 'Definir meta'}
            </Text>
          </Pressable>
        </View>
        {summary.goal ? (
          <>
            <View
              accessibilityLabel={`${Math.round((summary.progress ?? 0) * 100)} por cento da meta`}
              style={styles.progressTrack}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round((summary.progress ?? 0) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {summary.remainingMl === 0
                ? 'Meta concluida'
                : `Faltam ${summary.remainingMl} ml`}
            </Text>
          </>
        ) : null}
        {goalEditorOpen ? (
          <View style={styles.goalEditor}>
            <TextInput
              accessibilityLabel="Meta diaria em mililitros"
              keyboardType="number-pad"
              onChangeText={setGoalValue}
              placeholder="Ex.: 2000"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.goalInput]}
              value={goalValue}
            />
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={saveGoal}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Salvar meta</Text>
            </Pressable>
            {summary.goal ? (
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={removeGoal}
                style={styles.removeGoalButton}
              >
                <Text style={styles.removeGoalText}>Remover</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Section title="Registrar agua">
        <View style={styles.quickGrid}>
          {quickAmounts.map((value) => (
            <Pressable
              accessibilityLabel={`Adicionar ${value} mililitros`}
              accessibilityRole="button"
              disabled={saving}
              key={value}
              onPress={() => addWater(value)}
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.pressed,
              ]}
            >
              <Droplet
                color={colors.accent}
                fill={colors.successSoft}
                size={20}
              />
              <Text style={styles.quickValue}>{value}</Text>
              <Text style={styles.quickUnit}>ml</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.customRow}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Quantidade (ml)</Text>
            <TextInput
              keyboardType="number-pad"
              onChangeText={setAmount}
              placeholder="Ex.: 300"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={amount}
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>Horario</Text>
            <TextInput
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={time}
            />
          </View>
          <Pressable
            accessibilityLabel="Adicionar quantidade personalizada"
            accessibilityRole="button"
            disabled={saving}
            onPress={saveCustomAmount}
            style={[styles.addButton, saving && styles.disabled]}
          >
            <Plus color={colors.surface} size={22} />
          </Pressable>
        </View>
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </Section>

      <Section title="Historico do dia">
        {state.status === 'loading' ? (
          <EmptyState
            body="Carregando registros locais..."
            title="Atualizando"
          />
        ) : null}
        {state.status === 'error' ? (
          <EmptyState
            body="Seus dados permanecem no aparelho. Tente abrir a tela novamente."
            title="Falha ao carregar"
          />
        ) : null}
        {state.status === 'ready' && state.entries.length === 0 ? (
          <EmptyState
            body="Adicione o primeiro copo deste dia."
            title="Sem registros"
          />
        ) : null}
        {state.status === 'ready'
          ? state.entries.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Droplet color={colors.accent} size={18} />
                </View>
                <View style={styles.historyText}>
                  <Text style={styles.historyAmount}>{entry.amountMl} ml</Text>
                  <Text style={styles.historyTime}>
                    {formatTime(entry.recordedAt)}
                  </Text>
                </View>
                <IconButton
                  icon={<Trash2 color={colors.danger} size={18} />}
                  label={`Excluir registro de ${entry.amountMl} mililitros`}
                  onPress={() => confirmDelete(entry)}
                />
              </View>
            ))
          : null}
      </Section>
    </AppScreen>
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
      style={styles.iconButton}
    >
      {icon}
    </Pressable>
  );
}

function parseLocalDateTime(date: Date, time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
  );
  return value.toISOString();
}

function localDayRange(date: Date) {
  const from = startOfLocalDay(date);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function currentTime() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatSelectedDate(date: Date) {
  if (isToday(date)) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatEntryCount(value: number) {
  return `${value} ${value === 1 ? 'registro' : 'registros'}`;
}

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  customRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dateCaption: { ...typography.caption, color: colors.textMuted },
  dateNavigator: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTextBlock: { alignItems: 'center', gap: 2 },
  dateTitle: { ...typography.subtitle, color: colors.text },
  disabled: { opacity: 0.55 },
  error: { ...typography.caption, color: colors.danger, fontWeight: '800' },
  field: { flex: 1, gap: spacing.xs, minWidth: 150 },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  goalAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  goalActionText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
  },
  goalEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  goalInput: { flex: 1, minWidth: 130 },
  historyAmount: { ...typography.body, color: colors.text, fontWeight: '800' },
  historyIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  historyRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  historyText: { flex: 1, gap: 2 },
  historyTime: { ...typography.caption, color: colors.textMuted },
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
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    height: 46,
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.72 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: '100%',
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  progressTrack: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    height: 10,
    overflow: 'hidden',
    width: '100%',
  },
  quickButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 96,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickUnit: { ...typography.caption, color: colors.textMuted },
  quickValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  removeGoalButton: { minHeight: 40, padding: spacing.sm },
  removeGoalText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  timeField: { gap: spacing.xs, width: 106 },
});
