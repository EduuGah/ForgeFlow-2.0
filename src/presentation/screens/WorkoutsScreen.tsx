import { useEffect, useState } from 'react';
import { Plus, Search, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExerciseLibraryItem } from '../../application/useCases/exerciseLibrary';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Biceps'];
const equipmentOptions = ['Barra', 'Halteres', 'Maquina', 'Peso corporal'];

type ExerciseLibraryState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: ExerciseLibraryItem[] };

export function WorkoutsScreen() {
  const services = useAppServices();
  const [query, setQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(
    null,
  );
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(
    null,
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [library, setLibrary] = useState<ExerciseLibraryState>({
    status: 'loading',
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMuscleGroup, setCreateMuscleGroup] = useState('');
  const [createEquipment, setCreateEquipment] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    services.exerciseLibrary
      .list({
        equipment: selectedEquipment,
        favoritesOnly,
        primaryMuscleGroup: selectedMuscleGroup,
        query,
      })
      .then((value) => {
        if (isMounted) {
          setLibrary({ status: 'ready', value });
        }
      })
      .catch(() => {
        if (isMounted) {
          setLibrary({ status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [favoritesOnly, query, selectedEquipment, selectedMuscleGroup, services]);

  const refreshLibrary = async () => {
    const value = await services.exerciseLibrary.list({
      equipment: selectedEquipment,
      favoritesOnly,
      primaryMuscleGroup: selectedMuscleGroup,
      query,
    });

    setLibrary({ status: 'ready', value });
  };

  const handleCreateExercise = async () => {
    setFormError(null);

    try {
      await services.exerciseLibrary.create({
        description: createDescription,
        equipment: createEquipment,
        name: createName,
        primaryMuscleGroup: createMuscleGroup,
      });
      setCreateName('');
      setCreateMuscleGroup('');
      setCreateEquipment('');
      setCreateDescription('');
      setIsCreateOpen(false);
      await refreshLibrary();
    } catch {
      setFormError('Informe nome e grupo muscular com pelo menos 2 letras.');
    }
  };

  const handleToggleFavorite = async (exerciseId: string) => {
    setPendingExerciseId(exerciseId);

    try {
      await services.exerciseLibrary.toggleFavorite(exerciseId);
      await refreshLibrary();
    } finally {
      setPendingExerciseId(null);
    }
  };

  const exerciseCount = library.status === 'ready' ? library.value.length : 0;

  return (
    <AppScreen
      action={
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsCreateOpen((value) => !value)}
          style={styles.iconButton}
        >
          <Plus color={colors.surface} size={20} strokeWidth={2.4} />
        </Pressable>
      }
      eyebrow="Treinos"
      title="Biblioteca de exercicios"
    >
      <Section title="Encontrar exercicio">
        <View style={styles.searchBox}>
          <Search color={colors.textSubtle} size={18} strokeWidth={2.2} />
          <TextInput
            accessibilityLabel="Buscar exercicios"
            onChangeText={setQuery}
            placeholder="Buscar por nome, grupo ou equipamento"
            placeholderTextColor={colors.textSubtle}
            style={styles.searchInput}
            value={query}
          />
        </View>
        <FilterRow
          label="Grupo"
          onSelect={setSelectedMuscleGroup}
          options={muscleGroups}
          selectedValue={selectedMuscleGroup}
        />
        <FilterRow
          label="Equipamento"
          onSelect={setSelectedEquipment}
          options={equipmentOptions}
          selectedValue={selectedEquipment}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setFavoritesOnly((value) => !value)}
          style={[styles.favoriteFilter, favoritesOnly && styles.activeChip]}
        >
          <Star
            color={favoritesOnly ? colors.surface : colors.accent}
            fill={favoritesOnly ? colors.surface : 'transparent'}
            size={16}
          />
          <Text
            style={[
              styles.favoriteFilterText,
              favoritesOnly && styles.activeChipText,
            ]}
          >
            Somente favoritos
          </Text>
        </Pressable>
      </Section>

      {isCreateOpen ? (
        <Section title="Criar exercicio">
          <View style={styles.formPanel}>
            <TextInput
              accessibilityLabel="Nome do exercicio"
              onChangeText={setCreateName}
              placeholder="Nome"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={createName}
            />
            <TextInput
              accessibilityLabel="Grupo muscular principal"
              onChangeText={setCreateMuscleGroup}
              placeholder="Grupo muscular principal"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={createMuscleGroup}
            />
            <TextInput
              accessibilityLabel="Equipamento"
              onChangeText={setCreateEquipment}
              placeholder="Equipamento opcional"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={createEquipment}
            />
            <TextInput
              accessibilityLabel="Instrucao do exercicio"
              multiline
              onChangeText={setCreateDescription}
              placeholder="Instrucao opcional"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.textArea]}
              value={createDescription}
            />
            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleCreateExercise}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Salvar exercicio</Text>
            </Pressable>
          </View>
        </Section>
      ) : null}

      <Section title={`Resultados (${exerciseCount})`}>
        {library.status === 'loading' ? (
          <EmptyState
            body="Carregando o catalogo local de exercicios."
            title="Buscando biblioteca"
          />
        ) : null}
        {library.status === 'error' ? (
          <EmptyState
            body="Nao foi possivel carregar a biblioteca local."
            title="Erro ao carregar"
          />
        ) : null}
        {library.status === 'ready' && library.value.length === 0 ? (
          <EmptyState
            body="Ajuste os filtros ou crie um exercicio proprio."
            title="Nenhum exercicio encontrado"
          />
        ) : null}
        {library.status === 'ready'
          ? library.value.map((exercise) => (
              <ExerciseRow
                exercise={exercise}
                isPending={pendingExerciseId === exercise.id}
                key={exercise.id}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          : null}
      </Section>
    </AppScreen>
  );
}

type FilterRowProps = {
  label: string;
  onSelect: (value: string | null) => void;
  options: string[];
  selectedValue: string | null;
};

function FilterRow({
  label,
  onSelect,
  options,
  selectedValue,
}: FilterRowProps) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isActive = selectedValue === option;

          return (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => onSelect(isActive ? null : option)}
              style={[styles.chip, isActive && styles.activeChip]}
            >
              <Text
                style={[styles.chipText, isActive && styles.activeChipText]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ExerciseRowProps = {
  exercise: ExerciseLibraryItem;
  isPending: boolean;
  onToggleFavorite: (exerciseId: string) => void;
};

function ExerciseRow({
  exercise,
  isPending,
  onToggleFavorite,
}: ExerciseRowProps) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseBody}>
        <View style={styles.exerciseTitleRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.sourceLabel}>
            {exercise.isSystem ? 'Catalogo' : 'Proprio'}
          </Text>
        </View>
        <Text style={styles.exerciseMeta}>
          {[exercise.primaryMuscleGroup, exercise.equipment]
            .filter(Boolean)
            .join(' / ')}
        </Text>
        {exercise.description ? (
          <Text style={styles.exerciseDescription}>{exercise.description}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isPending}
        onPress={() => onToggleFavorite(exercise.id)}
        style={styles.favoriteButton}
      >
        <Star
          color={exercise.isFavorite ? colors.warning : colors.textSubtle}
          fill={exercise.isFavorite ? colors.warning : 'transparent'}
          size={20}
          strokeWidth={2.2}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  activeChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activeChipText: {
    color: colors.surface,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '800',
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  exerciseBody: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  exerciseMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  exerciseName: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
  },
  exerciseRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  favoriteButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  favoriteFilter: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  favoriteFilterText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '800',
  },
  filterBlock: {
    gap: spacing.xs,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  formPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    minHeight: 42,
    padding: 0,
  },
  sourceLabel: {
    ...typography.caption,
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    color: colors.successText,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
});
