import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Home,
  ImagePlus,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  Meal,
  MealType,
  NutritionTotals,
} from '../../domain/nutrition/entities';
import type { Media } from '../../domain/media/entities';
import type { MealPhotoSource } from '../../application/ports/media';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import type { RootTabParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme/tokens';

type NutritionState =
  | { status: 'error' }
  | { status: 'loading' }
  | { meals: Meal[]; media: Media[]; status: 'ready'; totals: NutritionTotals };

type MealForm = {
  carbsG: string;
  date: string;
  fatG: string;
  kcal: string;
  mealType: MealType;
  notes: string;
  proteinG: string;
  time: string;
};

const mealTypes: { label: string; value: MealType }[] = [
  { label: 'Cafe da manha', value: 'breakfast' },
  { label: 'Almoco', value: 'lunch' },
  { label: 'Jantar', value: 'dinner' },
  { label: 'Lanche', value: 'snack' },
  { label: 'Ceia', value: 'supper' },
  { label: 'Outro', value: 'other' },
];

export function NutritionScreen() {
  const services = useAppServices();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const [selectedDate, setSelectedDate] = useState(startOfLocalDay(new Date()));
  const [state, setState] = useState<NutritionState>({ status: 'loading' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(new Date()));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachingMealId, setAttachingMealId] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState('');

  const load = useCallback(() => {
    const { from, to } = localDayRange(selectedDate);
    services.nutrition
      .list({ from, to })
      .then(async (journal) => {
        const mediaIds = journal.meals.flatMap((meal) =>
          meal.photoId ? [meal.photoId] : [],
        );
        const media = await services.mealPhotos.list(mediaIds);
        setState({ ...journal, media, status: 'ready' });
      })
      .catch(() => setState({ status: 'error' }));
  }, [selectedDate, services]);

  useEffect(() => load(), [load]);

  function openEditor() {
    const now = new Date();
    const formDate = isToday(selectedDate) ? now : selectedDate;
    setForm(emptyForm(formDate));
    setMessage('');
    setEditorOpen(true);
  }

  async function submit() {
    setMessage('');
    const consumedAt = parseLocalDateTime(form.date, form.time);
    if (!consumedAt) {
      setMessage('Informe data e horario validos.');
      return;
    }
    setSaving(true);
    try {
      await services.nutrition.create({
        carbsG: optionalNumber(form.carbsG),
        consumedAt,
        fatG: optionalNumber(form.fatG),
        kcal: requiredNumber(form.kcal),
        mealType: form.mealType,
        notes: form.notes,
        proteinG: optionalNumber(form.proteinG),
      });
      setSelectedDate(startOfLocalDay(new Date(consumedAt)));
      setEditorOpen(false);
      setForm(emptyForm(new Date()));
      load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Nao foi possivel salvar.',
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(meal: Meal) {
    Alert.alert('Excluir refeicao?', mealTypeLabel(meal.mealType), [
      { style: 'cancel', text: 'Cancelar' },
      {
        onPress: () => {
          services.nutrition
            .delete(meal.id)
            .then(load)
            .catch(() => setMessage('Nao foi possivel excluir a refeicao.'));
        },
        style: 'destructive',
        text: 'Excluir',
      },
    ]);
  }

  async function attachPhoto(meal: Meal, source: MealPhotoSource) {
    setAttachingMealId(meal.id);
    setPhotoMessage('');
    try {
      const result = await services.mealPhotos.attach(meal.id, source);
      if (result.status === 'cancelled') return;
      setPhotoMessage(
        result.status === 'already_attached'
          ? 'Esta refeicao ja possui uma foto.'
          : 'Foto salva no aparelho.',
      );
      load();
    } catch (error) {
      setPhotoMessage(
        error instanceof Error && error.message.includes('permission')
          ? 'Permissao de camera negada.'
          : 'Nao foi possivel adicionar a foto.',
      );
    } finally {
      setAttachingMealId(null);
    }
  }

  async function retryPhoto(mediaId: string) {
    setAttachingMealId(mediaId);
    setPhotoMessage('');
    try {
      await services.mealPhotos.retry(mediaId);
      setPhotoMessage('Upload da foto concluido.');
      load();
    } catch {
      setPhotoMessage('Upload pendente. A foto continua salva no aparelho.');
    } finally {
      setAttachingMealId(null);
    }
  }

  const totals =
    state.status === 'ready'
      ? state.totals
      : { carbsG: 0, fatG: 0, kcal: 0, mealCount: 0, proteinG: 0 };

  return (
    <AppScreen
      action={
        <View style={styles.headerActions}>
          <IconButton
            icon={<Home color={colors.textMuted} size={20} />}
            label="Voltar para Home"
            onPress={() => navigation.navigate('Home')}
          />
          <IconButton
            icon={<Droplets color={colors.accent} size={20} />}
            label="Abrir hidratacao"
            onPress={() => navigation.navigate('Hydration')}
          />
          <IconButton
            icon={
              editorOpen ? (
                <X color={colors.textMuted} size={20} />
              ) : (
                <Plus color={colors.surface} size={22} />
              )
            }
            label={editorOpen ? 'Fechar formulario' : 'Adicionar refeicao'}
            onPress={() => (editorOpen ? setEditorOpen(false) : openEditor())}
            primary={!editorOpen}
          />
        </View>
      }
      eyebrow="Nutricao"
      title="Diario alimentar"
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
            {formatMealCount(totals.mealCount)}
          </Text>
        </View>
        <IconButton
          icon={<ChevronRight color={colors.text} size={22} />}
          label="Proximo dia"
          onPress={() => setSelectedDate(addDays(selectedDate, 1))}
        />
      </View>

      <View style={styles.summary}>
        <SummaryMetric label="Energia" unit="kcal" value={totals.kcal} />
        <SummaryMetric label="Proteina" unit="g" value={totals.proteinG} />
        <SummaryMetric label="Carbo" unit="g" value={totals.carbsG} />
        <SummaryMetric label="Gordura" unit="g" value={totals.fatG} />
      </View>

      {editorOpen ? (
        <Section title="Nova refeicao">
          <View style={styles.editor}>
            <View accessibilityRole="radiogroup" style={styles.typeGrid}>
              {mealTypes.map((type) => {
                const selected = form.mealType === type.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    key={type.value}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        mealType: type.value,
                      }))
                    }
                    style={[
                      styles.typeButton,
                      selected && styles.typeButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        selected && styles.typeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.inputRow}>
              <Field
                label="Data"
                onChangeText={(date) =>
                  setForm((current) => ({ ...current, date }))
                }
                placeholder="AAAA-MM-DD"
                value={form.date}
              />
              <Field
                label="Horario"
                onChangeText={(time) =>
                  setForm((current) => ({ ...current, time }))
                }
                placeholder="HH:mm"
                value={form.time}
              />
            </View>
            <View style={styles.inputRow}>
              <Field
                keyboardType="decimal-pad"
                label="Kcal"
                onChangeText={(kcal) =>
                  setForm((current) => ({ ...current, kcal }))
                }
                placeholder="0"
                value={form.kcal}
              />
              <Field
                keyboardType="decimal-pad"
                label="Proteina (g)"
                onChangeText={(proteinG) =>
                  setForm((current) => ({ ...current, proteinG }))
                }
                placeholder="Opcional"
                value={form.proteinG}
              />
            </View>
            <View style={styles.inputRow}>
              <Field
                keyboardType="decimal-pad"
                label="Carboidratos (g)"
                onChangeText={(carbsG) =>
                  setForm((current) => ({ ...current, carbsG }))
                }
                placeholder="Opcional"
                value={form.carbsG}
              />
              <Field
                keyboardType="decimal-pad"
                label="Gordura (g)"
                onChangeText={(fatG) =>
                  setForm((current) => ({ ...current, fatG }))
                }
                placeholder="Opcional"
                value={form.fatG}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Observacao</Text>
              <TextInput
                accessibilityLabel="Observacao da refeicao"
                multiline
                onChangeText={(notes) =>
                  setForm((current) => ({ ...current, notes }))
                }
                placeholder="Opcional"
                placeholderTextColor={colors.textSubtle}
                style={[styles.input, styles.notesInput]}
                value={form.notes}
              />
            </View>
            {message ? (
              <Text
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                style={styles.error}
              >
                {message}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: saving, disabled: saving }}
              disabled={saving}
              onPress={submit}
              style={[styles.saveButton, saving && styles.disabled]}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Salvando...' : 'Salvar refeicao'}
              </Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      <Section title="Refeicoes">
        {photoMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.photoMessage}>
            {photoMessage}
          </Text>
        ) : null}
        {state.status === 'loading' ? (
          <EmptyState
            body="Carregando registros locais..."
            kind="loading"
            title="Atualizando"
          />
        ) : null}
        {state.status === 'error' ? (
          <EmptyState
            body="Seus dados permanecem no aparelho. Tente abrir a tela novamente."
            kind="error"
            title="Falha ao carregar"
          />
        ) : null}
        {state.status === 'ready' && state.meals.length === 0 ? (
          <EmptyState
            body="Registre a primeira refeicao deste dia."
            title="Nenhuma refeicao"
          />
        ) : null}
        {state.status === 'ready'
          ? state.meals.map((meal) => {
              const media = state.media.find(
                (item) => item.id === meal.photoId,
              );
              return (
                <MealCard
                  attaching={
                    attachingMealId === meal.id || attachingMealId === media?.id
                  }
                  key={meal.id}
                  meal={meal}
                  media={media ?? null}
                  onAttach={(source) => attachPhoto(meal, source)}
                  onDelete={confirmDelete}
                  onRetry={media ? () => retryPhoto(media.id) : undefined}
                />
              );
            })
          : null}
      </Section>
    </AppScreen>
  );
}

function SummaryMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: number;
}) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{formatNumber(value)}</Text>
      <Text style={styles.summaryUnit}>{unit}</Text>
    </View>
  );
}

function Field({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'decimal-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function MealCard({
  attaching,
  meal,
  media,
  onAttach,
  onDelete,
  onRetry,
}: {
  attaching: boolean;
  meal: Meal;
  media: Media | null;
  onAttach: (source: MealPhotoSource) => void;
  onDelete: (meal: Meal) => void;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.mealCard}>
      {media?.localUri ? (
        <Image
          accessibilityLabel={`Foto de ${mealTypeLabel(meal.mealType)}`}
          source={{ uri: media.localUri }}
          style={styles.mealPhoto}
        />
      ) : null}
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleBlock}>
          <Text style={styles.mealTitle}>{mealTypeLabel(meal.mealType)}</Text>
          <Text style={styles.mealTime}>{formatTime(meal.consumedAt)}</Text>
        </View>
        <Text style={styles.mealKcal}>{formatNumber(meal.kcal)} kcal</Text>
        <IconButton
          icon={<Trash2 color={colors.danger} size={18} />}
          label="Excluir refeicao"
          onPress={() => onDelete(meal)}
        />
      </View>
      <View style={styles.macroRow}>
        <Text style={styles.macroText}>
          P {formatOptionalMacro(meal.proteinG)}
        </Text>
        <Text style={styles.macroText}>
          C {formatOptionalMacro(meal.carbsG)}
        </Text>
        <Text style={styles.macroText}>G {formatOptionalMacro(meal.fatG)}</Text>
      </View>
      {meal.notes ? <Text style={styles.mealNotes}>{meal.notes}</Text> : null}
      <View style={styles.photoActions}>
        {media ? (
          <View style={styles.uploadStatusRow}>
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.uploadStatus,
                media.uploadStatus === 'failed' && styles.uploadStatusFailed,
              ]}
            >
              {formatUploadStatus(media.uploadStatus)}
            </Text>
            {media.uploadStatus === 'failed' && onRetry ? (
              <Pressable
                accessibilityLabel="Tentar upload novamente"
                accessibilityRole="button"
                accessibilityState={{ busy: attaching, disabled: attaching }}
                disabled={attaching}
                onPress={onRetry}
                style={styles.photoButton}
              >
                <RefreshCw color={colors.accent} size={17} />
                <Text style={styles.photoButtonText}>Tentar novamente</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: attaching, disabled: attaching }}
              disabled={attaching}
              onPress={() => onAttach('camera')}
              style={styles.photoButton}
            >
              <Camera color={colors.accent} size={17} />
              <Text style={styles.photoButtonText}>Camera</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: attaching, disabled: attaching }}
              disabled={attaching}
              onPress={() => onAttach('library')}
              style={styles.photoButton}
            >
              <ImagePlus color={colors.accent} size={17} />
              <Text style={styles.photoButtonText}>
                {attaching ? 'Abrindo...' : 'Galeria'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.iconButton, primary && styles.iconButtonPrimary]}
    >
      {icon}
    </Pressable>
  );
}

function emptyForm(date: Date): MealForm {
  return {
    carbsG: '',
    date: formatInputDate(date),
    fatG: '',
    kcal: '',
    mealType: mealTypeForHour(date.getHours()),
    notes: '',
    proteinG: '',
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function mealTypeForHour(hour: number): MealType {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  if (hour < 22) return 'dinner';
  return 'supper';
}

function mealTypeLabel(type: MealType) {
  return mealTypes.find((item) => item.value === type)?.label ?? 'Refeicao';
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  return Number(value.replace(',', '.'));
}

function requiredNumber(value: string) {
  return Number(value.replace(',', '.'));
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue)) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
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

function isToday(date: Date) {
  return formatInputDate(date) === formatInputDate(new Date());
}

function formatSelectedDate(date: Date) {
  if (isToday(date)) return 'Hoje';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatInputDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
    value,
  );
}

function formatMealCount(value: number) {
  return `${value} ${value === 1 ? 'refeicao' : 'refeicoes'}`;
}

function formatOptionalMacro(value: number | null) {
  return value === null ? '--' : `${formatNumber(value)} g`;
}

function formatUploadStatus(status: Media['uploadStatus']) {
  if (status === 'uploaded') return 'Foto sincronizada';
  if (status === 'failed') return 'Upload pendente';
  if (status === 'uploading') return 'Enviando foto';
  return 'Foto salva localmente';
}

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

const styles = StyleSheet.create({
  dateCaption: { ...typography.caption, color: colors.textMuted },
  dateNavigator: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTextBlock: { alignItems: 'center', gap: 2 },
  dateTitle: { ...typography.subtitle, color: colors.text },
  disabled: { opacity: 0.55 },
  editor: { gap: spacing.md },
  error: { ...typography.caption, color: colors.danger, fontWeight: '800' },
  field: { flex: 1, gap: spacing.xs, minWidth: 130 },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  macroText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  mealHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mealKcal: { ...typography.body, color: colors.accent, fontWeight: '900' },
  mealNotes: { ...typography.body, color: colors.textMuted },
  mealPhoto: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    width: '100%',
  },
  mealTime: { ...typography.caption, color: colors.textMuted },
  mealTitle: { ...typography.subtitle, color: colors.text },
  mealTitleBlock: { flex: 1, gap: 2 },
  notesInput: { minHeight: 84, textAlignVertical: 'top' },
  photoActions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  photoButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  photoButtonText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
  },
  photoMessage: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  summary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryMetric: {
    alignItems: 'center',
    borderRightColor: colors.border,
    flex: 1,
    minWidth: 70,
    paddingHorizontal: spacing.xs,
  },
  summaryUnit: { ...typography.caption, color: colors.textSubtle },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  typeButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  typeButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  typeTextSelected: { color: colors.surface },
  uploadStatus: {
    ...typography.caption,
    color: colors.successText,
    flex: 1,
    fontWeight: '800',
  },
  uploadStatusFailed: { color: colors.warning },
  uploadStatusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
