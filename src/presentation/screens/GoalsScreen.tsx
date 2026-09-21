import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CirclePause,
  CirclePlay,
  PenLine,
  Plus,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppServices } from '../../composition/AppServicesProvider';
import type { Goal, GoalType } from '../../domain/goals/entities';
import { goalTypeDefinitions } from '../../domain/goals/rules';
import type { GoalProgressView } from '../../application/useCases/goalProgress';
import type { Exercise } from '../../domain/training/entities';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

const goalTypes = Object.keys(goalTypeDefinitions) as GoalType[];

type GoalsState =
  | { status: 'error' }
  | { status: 'loading' }
  | { goals: GoalProgressView[]; status: 'ready' };

type GoalForm = {
  baseline: string;
  deadline: string;
  exerciseId: string | null;
  exerciseQuery: string;
  target: string;
  title: string;
  type: GoalType;
};

const emptyForm: GoalForm = {
  baseline: '',
  deadline: '',
  exerciseId: null,
  exerciseQuery: '',
  target: '',
  title: '',
  type: 'exercise_weight',
};

export function GoalsScreen() {
  const services = useAppServices();
  const [state, setState] = useState<GoalsState>({ status: 'loading' });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressValue, setProgressValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([services.goals.list(), services.exerciseLibrary.list()])
      .then(([goals, library]) => {
        setState({ goals, status: 'ready' });
        setExercises(library);
      })
      .catch(() => setState({ status: 'error' }));
  }, [services]);

  useEffect(() => load(), [load]);

  const definition = goalTypeDefinitions[form.type];
  const selectedExercise = exercises.find(
    (exercise) => exercise.id === form.exerciseId,
  );
  const exerciseResults = useMemo(() => {
    const query = form.exerciseQuery.trim().toLocaleLowerCase();
    if (!query) return exercises.slice(0, 6);
    return exercises
      .filter((exercise) => exercise.name.toLocaleLowerCase().includes(query))
      .slice(0, 6);
  }, [exercises, form.exerciseQuery]);

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingGoal(null);
    setForm(emptyForm);
    setMessage(null);
  };

  const closeProgressEditor = () => {
    setProgressGoal(null);
    setProgressValue('');
    setMessage(null);
  };

  const submit = async () => {
    setMessage(null);
    const targetValue = Number(form.target.replace(',', '.'));
    const baselineValue = form.baseline
      ? Number(form.baseline.replace(',', '.'))
      : undefined;
    const deadline = parseDeadline(form.deadline);
    if (form.deadline && !deadline) {
      setMessage('Use uma data valida no formato AAAA-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      if (editingGoal) {
        await services.goals.update({
          deadline,
          goalId: editingGoal.id,
          targetValue,
          title: form.title,
        });
      } else {
        await services.goals.create({
          baselineValue,
          deadline,
          exerciseId: form.exerciseId,
          targetValue,
          title: form.title,
          type: form.type,
        });
      }
      closeEditor();
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel salvar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const mutateStatus = async (
    action: 'cancel' | 'pause' | 'resume',
    goalId: string,
  ) => {
    setMessage(null);
    try {
      await services.goals[action](goalId);
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar.',
      );
    }
  };

  const submitProgress = async () => {
    if (!progressGoal) return;
    const measuredValue = Number(progressValue.replace(',', '.'));
    setMessage(null);
    setSaving(true);
    try {
      await services.goals.recordProgress(progressGoal.id, measuredValue);
      closeProgressEditor();
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel atualizar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (goal: Goal) => {
    setProgressGoal(null);
    setProgressValue('');
    setEditingGoal(goal);
    setForm({
      baseline: goal.baselineValue?.toString() ?? '',
      deadline: goal.deadline?.slice(0, 10) ?? '',
      exerciseId: goal.exerciseId,
      exerciseQuery: '',
      target: goal.targetValue.toString(),
      title: goal.title,
      type: goal.type,
    });
    setMessage(null);
    setEditorOpen(true);
  };

  const goals = state.status === 'ready' ? state.goals : [];
  const activeGoals = goals.filter(({ goal }) =>
    ['active', 'behind', 'on_track'].includes(goal.status),
  );
  const inactiveGoals = goals.filter(({ goal }) =>
    ['paused', 'cancelled', 'completed', 'expired'].includes(goal.status),
  );

  return (
    <AppScreen
      action={
        <Pressable
          accessibilityLabel={editorOpen ? 'Fechar editor' : 'Criar meta'}
          onPress={() => {
            if (editorOpen) {
              closeEditor();
              return;
            }
            closeProgressEditor();
            setEditorOpen(true);
          }}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          {editorOpen ? (
            <XCircle color={colors.accent} size={21} />
          ) : (
            <Plus color={colors.accent} size={22} />
          )}
        </Pressable>
      }
      eyebrow="Metas"
      title="Foco mensuravel"
    >
      {editorOpen ? (
        <Section title={editingGoal ? 'Editar meta' : 'Nova meta'}>
          <View style={styles.editor}>
            {!editingGoal ? (
              <View style={styles.typeGrid}>
                {goalTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        baseline: '',
                        exerciseId: null,
                        type,
                      }))
                    }
                    style={[
                      styles.typeButton,
                      form.type === type && styles.typeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        form.type === type && styles.typeTextActive,
                      ]}
                    >
                      {goalTypeDefinitions[type].label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.lockedType}>{definition.label}</Text>
            )}

            <TextInput
              onChangeText={(title) =>
                setForm((current) => ({ ...current, title }))
              }
              placeholder="Titulo da meta"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={form.title}
            />

            {definition.exerciseRequired && !editingGoal ? (
              <View style={styles.exercisePicker}>
                <TextInput
                  onChangeText={(exerciseQuery) =>
                    setForm((current) => ({ ...current, exerciseQuery }))
                  }
                  placeholder="Buscar exercicio"
                  placeholderTextColor={colors.textSubtle}
                  style={styles.input}
                  value={form.exerciseQuery}
                />
                {selectedExercise ? (
                  <Text style={styles.selectedExercise}>
                    Selecionado: {selectedExercise.name}
                  </Text>
                ) : null}
                <View style={styles.exerciseResults}>
                  {exerciseResults.map((exercise) => (
                    <Pressable
                      key={exercise.id}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          exerciseId: exercise.id,
                          exerciseQuery: exercise.name,
                        }))
                      }
                      style={[
                        styles.exerciseOption,
                        form.exerciseId === exercise.id &&
                          styles.exerciseOptionActive,
                      ]}
                    >
                      <Text style={styles.exerciseOptionText}>
                        {exercise.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.numberRow}>
              {definition.manualBaseline && !editingGoal ? (
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(baseline) =>
                    setForm((current) => ({ ...current, baseline }))
                  }
                  placeholder={`Valor atual${definition.unit ? ` (${definition.unit})` : ''}`}
                  placeholderTextColor={colors.textSubtle}
                  style={[styles.input, styles.numberInput]}
                  value={form.baseline}
                />
              ) : null}
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(target) =>
                  setForm((current) => ({ ...current, target }))
                }
                placeholder={`Alvo${definition.unit ? ` (${definition.unit})` : ''}`}
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, styles.numberInput]}
                value={form.target}
              />
            </View>
            <TextInput
              autoCapitalize="none"
              onChangeText={(deadline) =>
                setForm((current) => ({ ...current, deadline }))
              }
              placeholder="Prazo opcional (AAAA-MM-DD)"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={form.deadline}
            />
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <Pressable
              disabled={saving}
              onPress={submit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving
                  ? 'Salvando...'
                  : editingGoal
                    ? 'Salvar alteracoes'
                    : 'Criar meta'}
              </Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      {progressGoal ? (
        <Section title="Atualizar progresso">
          <View style={styles.editor}>
            <View style={styles.progressEditorHeader}>
              <View style={styles.goalTitleBlock}>
                <Text style={styles.goalTitle}>{progressGoal.title}</Text>
                <Text style={styles.goalType}>
                  {goalTypeDefinitions[progressGoal.type].label}
                </Text>
              </View>
              <IconAction
                icon={<XCircle color={colors.textMuted} size={18} />}
                label="Fechar progresso"
                onPress={closeProgressEditor}
              />
            </View>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setProgressValue}
              placeholder={`Valor atual${goalTypeDefinitions[progressGoal.type].unit ? ` (${goalTypeDefinitions[progressGoal.type].unit})` : ''}`}
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={progressValue}
            />
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <Pressable
              disabled={saving}
              onPress={submitProgress}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Atualizando...' : 'Registrar progresso'}
              </Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      {message && !editorOpen && !progressGoal ? (
        <Text style={styles.error}>{message}</Text>
      ) : null}
      {state.status === 'loading' ? (
        <EmptyState body="Carregando objetivos locais..." title="Atualizando" />
      ) : null}
      {state.status === 'error' ? (
        <EmptyState
          body="Seus dados foram preservados. Abra a tela novamente."
          title="Falha ao carregar"
        />
      ) : null}

      {state.status === 'ready' ? (
        <Section title={`Ativas (${activeGoals.length})`}>
          {activeGoals.length === 0 ? (
            <EmptyState
              body="Crie uma meta com alvo claro e acompanhe a partir do seu baseline."
              title="Nenhuma meta ativa"
            />
          ) : (
            activeGoals.map((progress) => (
              <GoalCard
                key={progress.goal.id}
                onCancel={() => mutateStatus('cancel', progress.goal.id)}
                onEdit={() => startEdit(progress.goal)}
                onPause={() => mutateStatus('pause', progress.goal.id)}
                onProgress={
                  goalTypeDefinitions[progress.goal.type].manualBaseline
                    ? () => {
                        closeEditor();
                        setProgressGoal(progress.goal);
                        setProgressValue(
                          progress.measuredValue?.toString() ?? '',
                        );
                      }
                    : undefined
                }
                progress={progress}
              />
            ))
          )}
        </Section>
      ) : null}

      {inactiveGoals.length > 0 ? (
        <Section title="Pausadas e finalizadas">
          {inactiveGoals.map((progress) => (
            <GoalCard
              key={progress.goal.id}
              onCancel={
                progress.goal.status === 'paused'
                  ? () => mutateStatus('cancel', progress.goal.id)
                  : undefined
              }
              onEdit={
                progress.goal.status === 'paused'
                  ? () => startEdit(progress.goal)
                  : undefined
              }
              onResume={
                progress.goal.status === 'paused'
                  ? () => mutateStatus('resume', progress.goal.id)
                  : undefined
              }
              progress={progress}
            />
          ))}
        </Section>
      ) : null}
    </AppScreen>
  );
}

function GoalCard({
  onCancel,
  onEdit,
  onPause,
  onProgress,
  onResume,
  progress,
}: {
  onCancel?: () => void;
  onEdit?: () => void;
  onPause?: () => void;
  onProgress?: () => void;
  onResume?: () => void;
  progress: GoalProgressView;
}) {
  const { goal } = progress;
  const definition = goalTypeDefinitions[goal.type];
  const progressWidth = `${Math.round(progress.progressPercent)}%` as const;
  return (
    <View style={styles.goalCard}>
      <View style={styles.goalHeader}>
        <View style={styles.goalIcon}>
          <Target color={colors.accent} size={20} />
        </View>
        <View style={styles.goalTitleBlock}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalType}>
            {definition.label} · {formatStatus(goal.status)}
          </Text>
        </View>
        <View style={styles.actions}>
          {onEdit ? (
            <IconAction
              label="Editar meta"
              onPress={onEdit}
              icon={<PenLine color={colors.textMuted} size={18} />}
            />
          ) : null}
          {onPause ? (
            <IconAction
              label="Pausar meta"
              onPress={onPause}
              icon={<CirclePause color={colors.textMuted} size={18} />}
            />
          ) : null}
          {onProgress ? (
            <IconAction
              label="Atualizar progresso"
              onPress={onProgress}
              icon={<TrendingUp color={colors.accent} size={18} />}
            />
          ) : null}
          {onResume ? (
            <IconAction
              label="Retomar meta"
              onPress={onResume}
              icon={<CirclePlay color={colors.successText} size={18} />}
            />
          ) : null}
          {onCancel ? (
            <IconAction
              label="Cancelar meta"
              onPress={onCancel}
              icon={<XCircle color={colors.danger} size={18} />}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.goalValues}>
        <View>
          <Text style={styles.valueLabel}>Baseline</Text>
          <Text style={styles.valueText}>
            {formatValue(goal.baselineValue, definition.unit)}
          </Text>
        </View>
        <View style={styles.currentValue}>
          <Text style={styles.valueLabel}>Atual</Text>
          <Text style={styles.valueText}>
            {formatValue(progress.measuredValue, definition.unit)}
          </Text>
        </View>
        <View style={styles.targetValue}>
          <Text style={styles.valueLabel}>Alvo</Text>
          <Text style={styles.targetText}>
            {formatValue(goal.targetValue, definition.unit)}
          </Text>
        </View>
      </View>
      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressLabel}>
          {formatProgress(progress.progressPercent)}
        </Text>
      </View>
      <Text style={styles.deadline}>
        {goal.deadline
          ? `Prazo: ${formatDeadline(goal.deadline)}`
          : 'Sem prazo'}
      </Text>
    </View>
  );
}

function IconAction({
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
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      {icon}
    </Pressable>
  );
}

function parseDeadline(value: string) {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return date.toISOString();
}

function formatDeadline(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(value),
  );
}

function formatStatus(status: Goal['status']) {
  if (status === 'behind') return 'Atrasada';
  if (status === 'completed') return 'Concluida';
  if (status === 'expired') return 'Expirada';
  if (status === 'on_track') return 'No ritmo';
  if (status === 'paused') return 'Pausada';
  if (status === 'cancelled') return 'Cancelada';
  return 'Ativa';
}

function formatProgress(value: number) {
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatValue(value: number | null, unit: string) {
  if (value === null) return 'Nao disponivel';
  const formatted = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actions: { flexDirection: 'row' },
  currentValue: { alignItems: 'center' },
  deadline: { ...typography.caption, color: colors.textMuted },
  disabled: { opacity: 0.55 },
  editor: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  error: { ...typography.caption, color: colors.danger, fontWeight: '800' },
  exerciseOption: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  exerciseOptionActive: {
    borderBottomColor: colors.accent,
    borderBottomWidth: 2,
  },
  exerciseOptionText: { ...typography.body, color: colors.text },
  exercisePicker: { gap: spacing.xs },
  exerciseResults: { maxHeight: 260 },
  goalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  goalHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  goalIcon: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  goalTitle: { ...typography.subtitle, color: colors.text },
  goalTitleBlock: { flex: 1, gap: 2 },
  goalType: { ...typography.caption, color: colors.textMuted },
  goalValues: { flexDirection: 'row', justifyContent: 'space-between' },
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
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lockedType: { ...typography.body, color: colors.accent, fontWeight: '800' },
  numberInput: { flex: 1, minWidth: 130 },
  numberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  progressBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressEditorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: '100%',
  },
  progressLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
    minWidth: 44,
    textAlign: 'right',
  },
  progressTrack: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  selectedExercise: {
    ...typography.caption,
    color: colors.successText,
    fontWeight: '800',
  },
  targetText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  targetValue: { alignItems: 'flex-end' },
  typeButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  typeTextActive: { color: colors.surface },
  valueLabel: { ...typography.caption, color: colors.textMuted },
  valueText: { ...typography.body, color: colors.text, fontWeight: '800' },
});
