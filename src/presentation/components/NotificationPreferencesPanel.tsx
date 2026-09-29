import { Bell, Moon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppServices } from '../../composition/AppServicesProvider';
import type {
  NotificationFrequencyMode,
  NotificationPreferences,
} from '../../domain/notifications/entities';
import { colors, radius, spacing, typography } from '../theme/tokens';

type BooleanPreferenceKey = {
  [
    Key in keyof NotificationPreferences
  ]: NotificationPreferences[Key] extends boolean ? Key : never;
}[keyof NotificationPreferences];

const categories: { key: BooleanPreferenceKey; label: string }[] = [
  { key: 'workoutsEnabled', label: 'Treinos' },
  { key: 'goalsEnabled', label: 'Metas' },
  { key: 'personalRecordsEnabled', label: 'Recordes pessoais' },
  { key: 'progressEnabled', label: 'Progresso' },
  { key: 'inactivityEnabled', label: 'Inatividade' },
  { key: 'achievementsEnabled', label: 'Conquistas' },
  { key: 'reportsEnabled', label: 'Relatorios' },
  { key: 'nutritionEnabled', label: 'Nutricao' },
  { key: 'hydrationEnabled', label: 'Hidratacao' },
];

const frequencies: {
  label: string;
  value: NotificationFrequencyMode;
}[] = [
  { label: 'Reduzida', value: 'reduced' },
  { label: 'Inteligente', value: 'intelligent' },
  { label: 'Frequente', value: 'frequent' },
];

export function NotificationPreferencesPanel() {
  const services = useAppServices();
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');

  useEffect(() => {
    let isMounted = true;
    services.notificationPreferences
      .get()
      .then((value) => {
        if (!isMounted) return;
        setPreferences(value);
        setQuietStart(value.quietHoursStart ?? '22:00');
        setQuietEnd(value.quietHoursEnd ?? '08:00');
      })
      .catch(() => {
        if (isMounted) setMessage('Nao foi possivel carregar as preferencias.');
      });
    return () => {
      isMounted = false;
    };
  }, [services]);

  async function update(
    patch: Partial<Omit<NotificationPreferences, 'id' | 'userId'>>,
  ) {
    if (!preferences || saving) return;
    const previous = preferences;
    setPreferences({ ...preferences, ...patch });
    setSaving(true);
    setMessage('');
    try {
      setPreferences(await services.notificationPreferences.update(patch));
    } catch (error) {
      setPreferences(previous);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar as preferencias.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePush(enabled: boolean) {
    if (!preferences || saving) return;
    if (!enabled) {
      await update({ pushEnabled: false });
      setMessage('Notificacoes desativadas.');
      return;
    }

    setSaving(true);
    setMessage('');
    const registration =
      await services.notificationDelivery.registerDevice(true);
    setSaving(false);
    if (registration.status === 'denied') {
      setMessage(
        'Permissao negada. Voce pode libera-la nos ajustes do aparelho.',
      );
      return;
    }
    if (registration.status === 'failed') {
      setMessage('Nao foi possivel ativar as notificacoes agora.');
      return;
    }
    await update({ pushEnabled: true });
    setMessage(
      registration.status === 'registered'
        ? 'Notificacoes ativadas neste aparelho.'
        : 'Preferencia salva. O push sera registrado em um aparelho compativel.',
    );
  }

  if (!preferences) {
    return (
      <Text
        accessibilityLiveRegion="polite"
        accessibilityRole={message ? 'alert' : 'progressbar'}
        accessibilityState={{ busy: !message }}
        style={styles.status}
      >
        {message || 'Carregando...'}
      </Text>
    );
  }

  const quietHoursEnabled = preferences.quietHoursStart !== null;

  return (
    <View style={styles.container}>
      <PreferenceRow
        icon={<Bell color={colors.accent} size={20} strokeWidth={2.2} />}
        label="Permitir notificacoes"
        onValueChange={togglePush}
        value={preferences.pushEnabled}
      />

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Categorias</Text>
        {categories.map((category) => (
          <PreferenceRow
            key={category.key}
            label={category.label}
            onValueChange={(value) => update({ [category.key]: value })}
            value={preferences[category.key]}
          />
        ))}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Frequencia</Text>
        <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
          {frequencies.map((frequency) => {
            const selected = preferences.frequencyMode === frequency.value;
            return (
              <Pressable
                accessibilityState={{ checked: selected }}
                accessibilityRole="radio"
                aria-checked={selected}
                key={frequency.value}
                onPress={() => update({ frequencyMode: frequency.value })}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextSelected,
                  ]}
                >
                  {frequency.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <PreferenceRow
          icon={<Moon color={colors.accent} size={20} strokeWidth={2.2} />}
          label="Horario silencioso"
          onValueChange={(enabled) =>
            update({
              quietHoursEnd: enabled ? quietEnd : null,
              quietHoursStart: enabled ? quietStart : null,
            })
          }
          value={quietHoursEnabled}
        />
        {quietHoursEnabled ? (
          <View style={styles.timeEditor}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Inicio</Text>
              <TextInput
                accessibilityLabel="Inicio do horario silencioso"
                maxLength={5}
                onChangeText={setQuietStart}
                placeholder="22:00"
                placeholderTextColor={colors.textSubtle}
                style={styles.timeInput}
                value={quietStart}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Fim</Text>
              <TextInput
                accessibilityLabel="Fim do horario silencioso"
                maxLength={5}
                onChangeText={setQuietEnd}
                placeholder="08:00"
                placeholderTextColor={colors.textSubtle}
                style={styles.timeInput}
                value={quietEnd}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                update({
                  quietHoursEnd: quietEnd,
                  quietHoursStart: quietStart,
                })
              }
              style={styles.saveTimeButton}
            >
              <Text style={styles.saveTimeText}>Salvar</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function PreferenceRow({
  icon,
  label,
  onValueChange,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.row}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        onValueChange={onValueChange}
        thumbColor={colors.surface}
        trackColor={{ false: colors.border, true: colors.accent }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  group: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  groupTitle: {
    ...typography.caption,
    color: colors.textSubtle,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  icon: {
    alignItems: 'center',
    width: 28,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontWeight: '700',
  },
  saveTimeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  saveTimeText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: colors.surface,
  },
  segmentedControl: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  status: {
    ...typography.caption,
    color: colors.textMuted,
    padding: spacing.md,
  },
  timeEditor: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  timeField: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 100,
  },
  timeInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.textSubtle,
    fontWeight: '700',
  },
});
