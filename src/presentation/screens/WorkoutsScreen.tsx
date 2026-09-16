import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Archive,
  CheckCircle2,
  Copy,
  PenLine,
  PlayCircle,
  Plus,
  Search,
  Star,
  StopCircle,
  Trash2,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExerciseLibraryItem } from '../../application/useCases/exerciseLibrary';
import type {
  WorkoutExercisePlanInput,
  WorkoutTemplateSummary,
} from '../../application/useCases/workoutCrud';
import type { ActiveWorkout } from '../../application/useCases/workoutExecution';
import type { SetType } from '../../domain/training/entities';
import { useAppServices } from '../../composition/AppServicesProvider';
import { AppScreen, EmptyState, Section } from '../components/AppScreen';
import { colors, radius, spacing, typography } from '../theme/tokens';

const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Biceps'];
const equipmentOptions = ['Barra', 'Halteres', 'Maquina', 'Peso corporal'];

type ExerciseLibraryState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: ExerciseLibraryItem[] };

type WorkoutListState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: WorkoutTemplateSummary[] };

type ActiveWorkoutState =
  | { status: 'error' }
  | { status: 'loading' }
  | { status: 'ready'; value: ActiveWorkout | null };

type ViewMode = 'library' | 'workouts';

export function WorkoutsScreen() {
  const services = useAppServices();
  const [viewMode, setViewMode] = useState<ViewMode>('workouts');
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
  const [workouts, setWorkouts] = useState<WorkoutListState>({
    status: 'loading',
  });
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState>({
    status: 'loading',
  });
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isExerciseCreateOpen, setIsExerciseCreateOpen] = useState(false);
  const [isWorkoutFormOpen, setIsWorkoutFormOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [selectedWorkoutExerciseIds, setSelectedWorkoutExerciseIds] = useState<
    string[]
  >([]);
  const [targetSets, setTargetSets] = useState('3');
  const [targetRepsMin, setTargetRepsMin] = useState('8');
  const [targetRepsMax, setTargetRepsMax] = useState('12');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState('90');
  const [workoutFormError, setWorkoutFormError] = useState<string | null>(null);
  const [selectedSessionExerciseId, setSelectedSessionExerciseId] = useState<
    string | null
  >(null);
  const [setType, setSetType] = useState<SetType>('working');
  const [setWeightKg, setSetWeightKg] = useState('');
  const [setRepetitions, setSetRepetitions] = useState('');
  const [setRestSeconds, setSetRestSeconds] = useState('');
  const [setNotes, setSetNotes] = useState('');
  const [setFormError, setSetFormError] = useState<string | null>(null);
  const [isLoggingSet, setIsLoggingSet] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMuscleGroup, setCreateMuscleGroup] = useState('');
  const [createEquipment, setCreateEquipment] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [exerciseFormError, setExerciseFormError] = useState<string | null>(
    null,
  );
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(
    null,
  );
  const [pendingWorkoutId, setPendingWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    services.workouts
      .list(includeArchived)
      .then((value) => {
        if (isMounted) {
          setWorkouts({ status: 'ready', value });
        }
      })
      .catch(() => {
        if (isMounted) {
          setWorkouts({ status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [includeArchived, services]);

  useEffect(() => {
    let isMounted = true;

    services.workoutExecution
      .getActive()
      .then((value) => {
        if (isMounted) {
          setActiveWorkout({ status: 'ready', value });
        }
      })
      .catch(() => {
        if (isMounted) {
          setActiveWorkout({ status: 'error' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [services]);

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

  const refreshWorkouts = async () => {
    const value = await services.workouts.list(includeArchived);

    setWorkouts({ status: 'ready', value });
  };

  const refreshActiveWorkout = async () => {
    const value = await services.workoutExecution.getActive();

    setActiveWorkout({ status: 'ready', value });
  };

  const handleCreateExercise = async () => {
    setExerciseFormError(null);

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
      setIsExerciseCreateOpen(false);
      await refreshLibrary();
    } catch {
      setExerciseFormError(
        'Informe nome e grupo muscular com pelo menos 2 letras.',
      );
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

  const handleToggleWorkoutExercise = (exerciseId: string) => {
    setSelectedWorkoutExerciseIds((selectedIds) =>
      selectedIds.includes(exerciseId)
        ? selectedIds.filter((selectedId) => selectedId !== exerciseId)
        : [...selectedIds, exerciseId],
    );
  };

  const openCreateWorkoutForm = () => {
    setEditingWorkoutId(null);
    setWorkoutName('');
    setWorkoutDescription('');
    setSelectedWorkoutExerciseIds([]);
    setTargetSets('3');
    setTargetRepsMin('8');
    setTargetRepsMax('12');
    setTargetWeightKg('');
    setDefaultRestSeconds('90');
    setWorkoutFormError(null);
    setIsWorkoutFormOpen((isOpen) => !isOpen);
  };

  const openEditWorkoutForm = (workout: WorkoutTemplateSummary) => {
    const firstExercise = workout.exercises[0];

    setEditingWorkoutId(workout.id);
    setWorkoutName(workout.name);
    setWorkoutDescription(workout.description ?? '');
    setSelectedWorkoutExerciseIds(
      workout.exercises.map((exercise) => exercise.exerciseId),
    );
    setTargetSets(formatOptionalNumber(firstExercise?.targetSets, '3'));
    setTargetRepsMin(formatOptionalNumber(firstExercise?.targetRepsMin, '8'));
    setTargetRepsMax(formatOptionalNumber(firstExercise?.targetRepsMax, '12'));
    setTargetWeightKg(formatOptionalNumber(firstExercise?.targetWeightKg, ''));
    setDefaultRestSeconds(
      formatOptionalNumber(firstExercise?.defaultRestSeconds, '90'),
    );
    setWorkoutFormError(null);
    setIsWorkoutFormOpen(true);
  };

  const handleSaveWorkout = async () => {
    setWorkoutFormError(null);

    if (selectedWorkoutExerciseIds.length === 0) {
      setWorkoutFormError('Selecione pelo menos um exercicio.');
      return;
    }

    const exercises = selectedWorkoutExerciseIds.map(
      (exerciseId): WorkoutExercisePlanInput => ({
        defaultRestSeconds: parseOptionalNumber(defaultRestSeconds),
        exerciseId,
        targetRepsMax: parseOptionalNumber(targetRepsMax),
        targetRepsMin: parseOptionalNumber(targetRepsMin),
        targetSets: parseOptionalNumber(targetSets),
        targetWeightKg: parseOptionalNumber(targetWeightKg),
      }),
    );

    try {
      if (editingWorkoutId) {
        await services.workouts.update(editingWorkoutId, {
          description: workoutDescription,
          exercises,
          name: workoutName,
        });
      } else {
        await services.workouts.create({
          description: workoutDescription,
          exercises,
          name: workoutName,
        });
      }

      setIsWorkoutFormOpen(false);
      setEditingWorkoutId(null);
      await refreshWorkouts();
    } catch {
      setWorkoutFormError('Revise nome, exercicios e metas planejadas.');
    }
  };

  const handleDuplicateWorkout = async (workoutId: string) => {
    await services.workouts.duplicate(workoutId);
    await refreshWorkouts();
  };

  const handleArchiveWorkout = async (
    workoutId: string,
    isArchived: boolean,
  ) => {
    await services.workouts.archive(workoutId, !isArchived);
    await refreshWorkouts();
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    await services.workouts.delete(workoutId);
    await refreshWorkouts();
  };

  const handleStartWorkout = async (workoutId: string) => {
    setPendingWorkoutId(workoutId);

    try {
      await services.workoutExecution.start(workoutId);
      await refreshActiveWorkout();
    } finally {
      setPendingWorkoutId(null);
    }
  };

  const handleAbandonActiveWorkout = async () => {
    await services.workoutExecution.abandonActive();
    await refreshActiveWorkout();
  };

  const handleLogSet = async () => {
    const targetSessionExerciseId =
      selectedSessionExerciseId ??
      (activeWorkout.status === 'ready'
        ? activeWorkout.value?.exercises[0]?.id
        : null);

    if (!targetSessionExerciseId) {
      setSetFormError('Selecione um exercicio do treino ativo.');
      return;
    }

    const weightKg = parseRequiredNumber(setWeightKg);
    const repetitions = parseRequiredInteger(setRepetitions);
    const restSeconds = parseOptionalInteger(setRestSeconds);

    if (
      weightKg === null ||
      repetitions === null ||
      restSeconds === undefined
    ) {
      setSetFormError('Informe peso, repeticoes e descanso validos.');
      return;
    }

    setIsLoggingSet(true);
    setSetFormError(null);

    try {
      const value = await services.workoutExecution.logSet({
        notes: setNotes,
        repetitions,
        restSeconds,
        sessionExerciseId: targetSessionExerciseId,
        setType,
        weightKg,
      });

      setActiveWorkout({ status: 'ready', value });
      setSetWeightKg('');
      setSetRepetitions('');
      setSetNotes('');
    } catch {
      setSetFormError('Revise os dados da serie antes de salvar.');
    } finally {
      setIsLoggingSet(false);
    }
  };

  const exerciseCount = library.status === 'ready' ? library.value.length : 0;
  const workoutCount = workouts.status === 'ready' ? workouts.value.length : 0;
  const hasActiveWorkout =
    activeWorkout.status === 'ready' && activeWorkout.value !== null;
  const selectedActiveExercise =
    activeWorkout.status === 'ready' && activeWorkout.value
      ? (activeWorkout.value.exercises.find(
          (exercise) => exercise.id === selectedSessionExerciseId,
        ) ?? activeWorkout.value.exercises[0])
      : null;

  return (
    <AppScreen
      action={
        <Pressable
          accessibilityRole="button"
          onPress={
            viewMode === 'workouts'
              ? openCreateWorkoutForm
              : () => setIsExerciseCreateOpen((value) => !value)
          }
          style={styles.iconButton}
        >
          <Plus color={colors.surface} size={20} strokeWidth={2.4} />
        </Pressable>
      }
      eyebrow="Treinos"
      title={
        viewMode === 'workouts'
          ? 'Templates de treino'
          : 'Biblioteca de exercicios'
      }
    >
      <View style={styles.segmentedControl}>
        <SegmentButton
          isActive={viewMode === 'workouts'}
          label="Treinos"
          onPress={() => setViewMode('workouts')}
        />
        <SegmentButton
          isActive={viewMode === 'library'}
          label="Exercicios"
          onPress={() => setViewMode('library')}
        />
      </View>

      {viewMode === 'workouts' ? (
        <>
          <Section title="Treino ativo">
            {activeWorkout.status === 'loading' ? (
              <EmptyState
                body="Carregando a sessao ativa local."
                title="Buscando treino"
              />
            ) : null}
            {activeWorkout.status === 'error' ? (
              <EmptyState
                body="Nao foi possivel carregar a sessao ativa."
                title="Erro ao carregar"
              />
            ) : null}
            {activeWorkout.status === 'ready' && !activeWorkout.value ? (
              <EmptyState
                body="Inicie um treino salvo para abrir a sessao ativa."
                title="Nenhum treino em andamento"
              />
            ) : null}
            {activeWorkout.status === 'ready' && activeWorkout.value ? (
              <View style={styles.activeWorkoutPanel}>
                <View style={styles.activeWorkoutHeader}>
                  <View style={styles.exerciseBody}>
                    <Text style={styles.exerciseName}>
                      {activeWorkout.value.workoutName ?? 'Treino livre'}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {activeWorkout.value.exerciseCount} exercicio
                      {activeWorkout.value.exerciseCount === 1
                        ? ''
                        : 's'} desde{' '}
                      {formatStartedAt(activeWorkout.value.startedAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleAbandonActiveWorkout}
                    style={styles.dangerButton}
                  >
                    <StopCircle color={colors.surface} size={18} />
                    <Text style={styles.primaryButtonText}>Abandonar</Text>
                  </Pressable>
                </View>
                <View style={styles.activeExerciseList}>
                  {activeWorkout.value.exercises.map((exercise) => (
                    <ActiveWorkoutExerciseBlock
                      exercise={exercise}
                      isSelected={exercise.id === selectedActiveExercise?.id}
                      key={exercise.id}
                      onSelect={setSelectedSessionExerciseId}
                    />
                  ))}
                </View>
                {selectedActiveExercise ? (
                  <View style={styles.setLogger}>
                    <View style={styles.exerciseTitleRow}>
                      <Text style={styles.exerciseName}>Registrar serie</Text>
                      <Text style={styles.sourceLabel}>
                        {selectedActiveExercise.exerciseName}
                      </Text>
                    </View>
                    <View style={styles.segmentedControl}>
                      <SegmentButton
                        isActive={setType === 'working'}
                        label="Working"
                        onPress={() => setSetType('working')}
                      />
                      <SegmentButton
                        isActive={setType === 'warmup'}
                        label="Warmup"
                        onPress={() => setSetType('warmup')}
                      />
                    </View>
                    <View style={styles.inlineInputs}>
                      <NumberField
                        label="Peso kg"
                        onChangeText={setSetWeightKg}
                        value={setWeightKg}
                      />
                      <NumberField
                        label="Reps"
                        onChangeText={setSetRepetitions}
                        value={setRepetitions}
                      />
                      <NumberField
                        label="Descanso s"
                        onChangeText={setSetRestSeconds}
                        value={setRestSeconds}
                      />
                    </View>
                    <TextInput
                      accessibilityLabel="Observacao da serie"
                      onChangeText={setSetNotes}
                      placeholder="Observacao opcional"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.input}
                      value={setNotes}
                    />
                    {setFormError ? (
                      <Text style={styles.errorText}>{setFormError}</Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={isLoggingSet}
                      onPress={handleLogSet}
                      style={[
                        styles.primaryButton,
                        isLoggingSet && styles.disabledButton,
                      ]}
                    >
                      <CheckCircle2 color={colors.surface} size={18} />
                      <Text style={styles.primaryButtonText}>Salvar serie</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </Section>

          <Section title="Editor">
            <Pressable
              accessibilityRole="button"
              onPress={openCreateWorkoutForm}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {isWorkoutFormOpen ? 'Fechar editor' : 'Novo treino'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIncludeArchived((value) => !value)}
              style={[
                styles.favoriteFilter,
                includeArchived && styles.activeChip,
              ]}
            >
              <Archive
                color={includeArchived ? colors.surface : colors.accent}
                size={16}
              />
              <Text
                style={[
                  styles.favoriteFilterText,
                  includeArchived && styles.activeChipText,
                ]}
              >
                Mostrar arquivados
              </Text>
            </Pressable>
          </Section>

          {isWorkoutFormOpen ? (
            <Section
              title={editingWorkoutId ? 'Editar treino' : 'Criar treino'}
            >
              <View style={styles.formPanel}>
                <TextInput
                  accessibilityLabel="Nome do treino"
                  onChangeText={setWorkoutName}
                  placeholder="Nome do treino"
                  placeholderTextColor={colors.textSubtle}
                  style={styles.input}
                  value={workoutName}
                />
                <TextInput
                  accessibilityLabel="Descricao do treino"
                  onChangeText={setWorkoutDescription}
                  placeholder="Descricao opcional"
                  placeholderTextColor={colors.textSubtle}
                  style={styles.input}
                  value={workoutDescription}
                />
                <View style={styles.inlineInputs}>
                  <NumberField
                    label="Sets"
                    onChangeText={setTargetSets}
                    value={targetSets}
                  />
                  <NumberField
                    label="Rep min"
                    onChangeText={setTargetRepsMin}
                    value={targetRepsMin}
                  />
                  <NumberField
                    label="Rep max"
                    onChangeText={setTargetRepsMax}
                    value={targetRepsMax}
                  />
                </View>
                <View style={styles.inlineInputs}>
                  <NumberField
                    label="Carga kg"
                    onChangeText={setTargetWeightKg}
                    value={targetWeightKg}
                  />
                  <NumberField
                    label="Descanso s"
                    onChangeText={setDefaultRestSeconds}
                    value={defaultRestSeconds}
                  />
                </View>
                <Text style={styles.filterLabel}>Exercicios do treino</Text>
                <View style={styles.exercisePicker}>
                  {library.status === 'ready'
                    ? library.value.map((exercise) => {
                        const isSelected = selectedWorkoutExerciseIds.includes(
                          exercise.id,
                        );

                        return (
                          <Pressable
                            accessibilityRole="button"
                            key={exercise.id}
                            onPress={() =>
                              handleToggleWorkoutExercise(exercise.id)
                            }
                            style={[
                              styles.pickExerciseButton,
                              isSelected && styles.activeChip,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && styles.activeChipText,
                              ]}
                            >
                              {exercise.name}
                            </Text>
                          </Pressable>
                        );
                      })
                    : null}
                </View>
                {workoutFormError ? (
                  <Text style={styles.errorText}>{workoutFormError}</Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={handleSaveWorkout}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Salvar treino</Text>
                </Pressable>
              </View>
            </Section>
          ) : null}

          <Section title={`Treinos salvos (${workoutCount})`}>
            {workouts.status === 'loading' ? (
              <EmptyState
                body="Carregando templates locais."
                title="Buscando treinos"
              />
            ) : null}
            {workouts.status === 'error' ? (
              <EmptyState
                body="Nao foi possivel carregar os treinos locais."
                title="Erro ao carregar"
              />
            ) : null}
            {workouts.status === 'ready' && workouts.value.length === 0 ? (
              <EmptyState
                body="Crie seu primeiro treino e escolha os exercicios planejados."
                title="Nenhum treino salvo"
              />
            ) : null}
            {workouts.status === 'ready'
              ? workouts.value.map((workout) => (
                  <WorkoutRow
                    key={workout.id}
                    onArchive={handleArchiveWorkout}
                    onDelete={handleDeleteWorkout}
                    onDuplicate={handleDuplicateWorkout}
                    onEdit={openEditWorkoutForm}
                    onStart={handleStartWorkout}
                    isStartDisabled={hasActiveWorkout}
                    pendingWorkoutId={pendingWorkoutId}
                    workout={workout}
                  />
                ))
              : null}
          </Section>
        </>
      ) : (
        <>
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
              style={[
                styles.favoriteFilter,
                favoritesOnly && styles.activeChip,
              ]}
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

          {isExerciseCreateOpen ? (
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
                {exerciseFormError ? (
                  <Text style={styles.errorText}>{exerciseFormError}</Text>
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
        </>
      )}
    </AppScreen>
  );
}

type SegmentButtonProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function SegmentButton({ isActive, label, onPress }: SegmentButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentButton, isActive && styles.activeSegmentButton]}
    >
      <Text
        style={[
          styles.segmentButtonText,
          isActive && styles.activeSegmentButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type NumberFieldProps = {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
};

function NumberField({ label, onChangeText, value }: NumberFieldProps) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="numeric"
        onChangeText={onChangeText}
        placeholder="-"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        value={value}
      />
    </View>
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

type WorkoutRowProps = {
  onArchive: (workoutId: string, isArchived: boolean) => void;
  onDelete: (workoutId: string) => void;
  onDuplicate: (workoutId: string) => void;
  onEdit: (workout: WorkoutTemplateSummary) => void;
  onStart: (workoutId: string) => void;
  isStartDisabled: boolean;
  pendingWorkoutId: string | null;
  workout: WorkoutTemplateSummary;
};

function WorkoutRow({
  onArchive,
  onDelete,
  onDuplicate,
  onEdit,
  onStart,
  isStartDisabled,
  pendingWorkoutId,
  workout,
}: WorkoutRowProps) {
  return (
    <View style={styles.workoutRow}>
      <View style={styles.exerciseBody}>
        <View style={styles.exerciseTitleRow}>
          <Text style={styles.exerciseName}>{workout.name}</Text>
          <Text style={styles.sourceLabel}>
            {workout.isArchived ? 'Arquivado' : 'Ativo'}
          </Text>
        </View>
        {workout.description ? (
          <Text style={styles.exerciseDescription}>{workout.description}</Text>
        ) : null}
        <Text style={styles.exerciseMeta}>
          {workout.exerciseCount} exercicio
          {workout.exerciseCount === 1 ? '' : 's'}
        </Text>
        {workout.exercises.map((exercise) => (
          <Text key={exercise.id} style={styles.exerciseDescription}>
            {exercise.position + 1}. {exercise.exerciseName}
            {formatPlan(exercise)}
          </Text>
        ))}
      </View>
      <View style={styles.rowActions}>
        <IconAction
          icon={<PlayCircle color={colors.accent} size={18} />}
          isDisabled={
            isStartDisabled ||
            pendingWorkoutId === workout.id ||
            workout.isArchived
          }
          label="Iniciar"
          onPress={() => onStart(workout.id)}
        />
        <IconAction
          icon={<PenLine color={colors.accent} size={18} />}
          label="Editar"
          onPress={() => onEdit(workout)}
        />
        <IconAction
          icon={<Copy color={colors.accent} size={18} />}
          label="Duplicar"
          onPress={() => onDuplicate(workout.id)}
        />
        <IconAction
          icon={<Archive color={colors.accent} size={18} />}
          label={workout.isArchived ? 'Reativar' : 'Arquivar'}
          onPress={() => onArchive(workout.id, workout.isArchived)}
        />
        <IconAction
          icon={<Trash2 color={colors.danger} size={18} />}
          label="Excluir"
          onPress={() => onDelete(workout.id)}
        />
      </View>
    </View>
  );
}

type ActiveWorkoutExerciseBlockProps = {
  exercise: ActiveWorkout['exercises'][number];
  isSelected: boolean;
  onSelect: (sessionExerciseId: string) => void;
};

function ActiveWorkoutExerciseBlock({
  exercise,
  isSelected,
  onSelect,
}: ActiveWorkoutExerciseBlockProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onSelect(exercise.id)}
      style={[
        styles.activeExerciseBlock,
        isSelected && styles.selectedExerciseBlock,
      ]}
    >
      <View style={styles.exerciseTitleRow}>
        <Text style={styles.exerciseName}>
          {exercise.position + 1}. {exercise.exerciseName}
        </Text>
        <Text style={styles.sourceLabel}>
          {exercise.setCount} serie{exercise.setCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={styles.exerciseMeta}>
        Volume working: {formatNumber(exercise.workingVolume)} kg
      </Text>
      {exercise.sets.length === 0 ? (
        <Text style={styles.exerciseDescription}>
          Nenhuma serie registrada.
        </Text>
      ) : (
        exercise.sets.map((set) => (
          <View key={set.id} style={styles.setRow}>
            <Text style={styles.setRowText}>
              {set.setNumber}. {set.setType === 'warmup' ? 'Warmup' : 'Working'}
            </Text>
            <Text style={styles.setRowText}>
              {formatNumber(set.weightKg)} kg x {set.repetitions}
            </Text>
            {set.restSeconds !== null ? (
              <Text style={styles.setRowText}>{set.restSeconds}s</Text>
            ) : null}
          </View>
        ))
      )}
    </Pressable>
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

type IconActionProps = {
  icon: ReactNode;
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
};

function IconAction({
  icon,
  isDisabled = false,
  label,
  onPress,
}: IconActionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.favoriteButton, isDisabled && styles.disabledButton]}
    >
      {icon}
    </Pressable>
  );
}

function formatOptionalNumber(
  value: number | null | undefined,
  fallback: string,
) {
  return typeof value === 'number' ? String(value) : fallback;
}

function formatStartedAt(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPlan(exercise: WorkoutTemplateSummary['exercises'][number]) {
  const targetSets = exercise.targetSets ? `${exercise.targetSets}x` : '';
  const targetReps =
    exercise.targetRepsMin && exercise.targetRepsMax
      ? `${exercise.targetRepsMin}-${exercise.targetRepsMax}`
      : '';
  const rest = exercise.defaultRestSeconds
    ? `, ${exercise.defaultRestSeconds}s`
    : '';

  if (!targetSets && !targetReps && !rest) {
    return '';
  }

  return ` (${targetSets}${targetReps}${rest})`;
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string) {
  const parsed = parseOptionalNumber(value);

  if (parsed === null) {
    return value.trim() ? undefined : null;
  }

  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseRequiredInteger(value: string) {
  const parsed = parseOptionalInteger(value);

  return typeof parsed === 'number' ? parsed : null;
}

function parseRequiredNumber(value: string) {
  return value.trim() ? parseOptionalNumber(value) : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  activeExerciseBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activeExerciseList: {
    gap: spacing.sm,
  },
  activeWorkoutHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  activeWorkoutPanel: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  activeChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activeChipText: {
    color: colors.surface,
  },
  activeSegmentButton: {
    backgroundColor: colors.accent,
  },
  activeSegmentButtonText: {
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
  dangerButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabledButton: {
    opacity: 0.45,
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
  exercisePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  inlineInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  numberField: {
    flex: 1,
    gap: spacing.xs,
  },
  pickExerciseButton: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '800',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    width: 92,
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
  segmentButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  segmentButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '800',
  },
  segmentedControl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  selectedExerciseBlock: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  setLogger: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  setRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  setRowText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
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
  workoutRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
});
