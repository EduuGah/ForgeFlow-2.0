import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Medal, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CompletedWorkout } from '../../application/useCases/workoutExecution';
import { useAppServices } from '../../composition/AppServicesProvider';
import { EmptyState, Section } from './AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

type HistoryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: CompletedWorkout[] };

export function WorkoutHistory({
  initialSessionId,
}: {
  initialSessionId: string | null;
}) {
  const services = useAppServices();
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState(initialSessionId);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let mounted = true;
    services.workoutExecution
      .history()
      .then((items) => {
        if (mounted) setState({ status: 'ready', items });
      })
      .catch(() => {
        if (mounted) setState({ status: 'error' });
      });
    return () => {
      mounted = false;
    };
  }, [services, reload]);

  if (state.status === 'loading')
    return (
      <EmptyState
        title="Carregando historico"
        body="Buscando seus treinos concluidos."
      />
    );
  if (state.status === 'error')
    return (
      <View style={styles.section}>
        <EmptyState
          title="Erro ao carregar"
          body="Nao foi possivel abrir seu historico."
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setState({ status: 'loading' });
            setReload((value) => value + 1);
          }}
          style={styles.action}
        >
          <RefreshCw color={colors.accent} size={18} />
          <Text style={styles.link}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  if (state.items.length === 0)
    return (
      <EmptyState
        title="Nenhum treino concluido"
        body="Seus treinos finalizados aparecerao aqui."
      />
    );

  const selected = state.items.find((item) => item.id === selectedId);
  if (selected)
    return (
      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelectedId(null)}
          style={styles.action}
        >
          <ArrowLeft color={colors.accent} size={20} />
          <Text style={styles.link}>Todos os treinos</Text>
        </Pressable>
        <Section title={selected.workoutName ?? 'Treino livre'}>
          <Text style={styles.meta}>
            Concluido em {new Date(selected.completedAt).toLocaleString()}
          </Text>
          <WorkoutTotals workout={selected} />
        </Section>
        {selected.exercises.map((exercise) => (
          <Section key={exercise.id} title={exercise.exerciseName}>
            {exercise.sets
              .filter((set) => set.completedAt !== null)
              .map((set) => (
                <View key={set.id} style={styles.set}>
                  <View style={styles.row}>
                    <Text style={styles.text}>
                      {set.setNumber}.{' '}
                      {set.setType === 'warmup' ? 'Aquecimento' : 'Trabalho'}
                    </Text>
                    <Text style={styles.text}>
                      {set.weightKg.toLocaleString()} kg x {set.repetitions}
                    </Text>
                  </View>
                  {set.restSeconds !== null ? (
                    <Text style={styles.meta}>
                      Descanso: {set.restSeconds}s
                    </Text>
                  ) : null}
                  {set.notes ? (
                    <Text style={styles.text}>{set.notes}</Text>
                  ) : null}
                  {set.personalRecordTypes.length > 0 ? (
                    <View style={styles.records}>
                      <Medal color={colors.warning} size={16} />
                      <Text style={styles.recordText}>
                        {set.personalRecordTypes
                          .map(formatRecordType)
                          .join(' / ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            {!exercise.sets.some((set) => set.completedAt !== null) ? (
              <Text style={styles.meta}>Nenhuma serie concluida.</Text>
            ) : null}
          </Section>
        ))}
      </View>
    );

  return (
    <Section title="Treinos concluidos">
      {state.items.map((workout) => (
        <Pressable
          key={workout.id}
          accessibilityRole="button"
          accessibilityLabel={`Abrir treino ${workout.workoutName ?? 'livre'} de ${new Date(workout.startedAt).toLocaleString()}`}
          onPress={() => setSelectedId(workout.id)}
          style={styles.item}
        >
          <View style={styles.row}>
            <Text style={styles.title}>
              {workout.workoutName ?? 'Treino livre'}
            </Text>
            <ChevronRight color={colors.accent} size={20} />
          </View>
          <Text style={styles.meta}>
            {new Date(workout.startedAt).toLocaleString()}
          </Text>
          <WorkoutTotals workout={workout} />
        </Pressable>
      ))}
    </Section>
  );
}

function WorkoutTotals({ workout }: { workout: CompletedWorkout }) {
  const minutes = Math.floor(workout.durationSeconds / 60);
  const seconds = String(workout.durationSeconds % 60).padStart(2, '0');
  const performed = workout.exercises.filter((exercise) =>
    exercise.sets.some((set) => set.completedAt !== null),
  ).length;
  return (
    <View style={styles.totals}>
      <Text style={styles.text}>
        Duracao: {minutes}:{seconds}
      </Text>
      <Text style={styles.text}>
        Volume de trabalho: {workout.workingVolume.toLocaleString()} kg
      </Text>
      <Text style={styles.meta}>
        Series concluidas: {workout.setCount} / Exercicios realizados:{' '}
        {performed}
      </Text>
    </View>
  );
}

function formatRecordType(
  type: CompletedWorkout['exercises'][number]['sets'][number]['personalRecordTypes'][number],
) {
  if (type === 'estimated_1rm') return '1RM estimado';
  if (type === 'repetitions') return 'Recorde de repeticoes';
  if (type === 'volume') return 'Recorde de volume';
  return 'Recorde de peso';
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  item: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  link: { ...typography.body, color: colors.accent },
  meta: { ...typography.caption, color: colors.textMuted },
  records: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  recordText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  section: { gap: spacing.lg },
  set: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  text: { ...typography.body, color: colors.text },
  title: { ...typography.subtitle, color: colors.text, flex: 1 },
  totals: { gap: spacing.xs },
});
