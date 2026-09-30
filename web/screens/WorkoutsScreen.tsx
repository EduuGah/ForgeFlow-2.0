import React, { useState } from 'react';
import {
  Dumbbell,
  Plus,
  Search,
  Star,
  Trash2,
  Copy,
  Clock,
  Filter,
  Check,
  Play,
  Award,
} from 'lucide-react';
import { useAppStore, WorkoutTemplateItem } from '../store';

const MUSCLE_GROUPS = [
  'Todos',
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Biceps',
  'Triceps',
  'Core',
];

interface WorkoutsScreenProps {
  initialSubTab?: 'templates' | 'library' | 'history';
  onOpenActiveWorkout: () => void;
}

export function WorkoutsScreen({ initialSubTab = 'templates', onOpenActiveWorkout }: WorkoutsScreenProps) {
  const store = useAppStore();
  const {
    templates,
    history,
    allExercises,
    favorites,
    activeWorkout,
  } = store;

  const [subTab, setSubTab] = useState<'templates' | 'library' | 'history'>(initialSubTab);

  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // New Workout Template Modal state
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [selectedExercisesForTemplate, setSelectedExercisesForTemplate] = useState<
    {
      exerciseId: string;
      exerciseName: string;
      targetSets: number;
      targetReps: number;
      targetWeightKg?: number;
      restSeconds: number;
    }[]
  >([]);

  // Custom Exercise Modal state
  const [isCustomExerciseOpen, setIsCustomExerciseOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('Peito');
  const [customEquipment, setCustomEquipment] = useState('Barra ou halteres');
  const [customDescription, setCustomDescription] = useState('');

  // Filter exercises
  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle =
      selectedMuscle === 'Todos' ||
      ex.primaryMuscleGroup.toLowerCase() === selectedMuscle.toLowerCase() ||
      ex.secondaryMuscleGroups.some((m) => m.toLowerCase() === selectedMuscle.toLowerCase());
    const matchesFav = onlyFavorites ? favorites.includes(ex.id) : true;
    return matchesSearch && matchesMuscle && matchesFav;
  });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    store.createTemplate({
      name: templateName.trim(),
      description: templateDesc.trim() || 'Treino personalizado.',
      exercises: selectedExercisesForTemplate.length > 0 ? selectedExercisesForTemplate : [
        {
          exerciseId: allExercises[0]?.id || '1',
          exerciseName: allExercises[0]?.name || 'Supino reto com barra',
          targetSets: 4,
          targetReps: 10,
          targetWeightKg: 60,
          restSeconds: 90,
        },
      ],
    });

    setIsNewTemplateOpen(false);
    setTemplateName('');
    setTemplateDesc('');
    setSelectedExercisesForTemplate([]);
  };

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    store.createCustomExercise({
      name: customName.trim(),
      primaryMuscleGroup: customMuscle,
      equipment: customEquipment,
      description: customDescription.trim() || undefined,
    });

    setIsCustomExerciseOpen(false);
    setCustomName('');
    setCustomDescription('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Treinos & Exercícios
          </h1>
          <p className="text-sm text-[#56615C]">
            Gerencie suas rotinas, explore a biblioteca de exercícios e acompanhe o histórico.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-[#D9DED6]/40 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSubTab('templates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'templates'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Rotinas ({templates.length})
          </button>
          <button
            onClick={() => setSubTab('library')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'library'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Biblioteca ({allExercises.length})
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'history'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Histórico ({history.length})
          </button>
        </div>
      </div>

      {/* -------------------- 1. TEMPLATES VIEW -------------------- */}
      {subTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#161917]">Suas Rotinas Salvas</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  store.startEmptyWorkout();
                  onOpenActiveWorkout();
                }}
                className="bg-white hover:bg-gray-50 border border-[#D9DED6] text-[#161917] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 text-[#146C5F]" />
                Treino Livre
              </button>
              <button
                onClick={() => setIsNewTemplateOpen(true)}
                className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Criar Rotina
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((template: WorkoutTemplateItem) => (
              <div
                key={template.id}
                className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between hover:border-[#146C5F]/40 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-[#161917] text-base leading-snug">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => store.duplicateTemplate(template.id)}
                        title="Duplicar rotina"
                        className="p-1.5 text-gray-400 hover:text-[#146C5F] rounded-lg hover:bg-gray-100 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => store.deleteTemplate(template.id)}
                        title="Excluir rotina"
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#56615C] mb-4 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="space-y-1.5 mb-4">
                    <span className="text-[11px] font-bold text-[#56615C] uppercase tracking-wider block">
                      Exercícios ({template.exercises.length}):
                    </span>
                    <ul className="text-xs text-[#161917] space-y-1">
                      {template.exercises.slice(0, 4).map((ex, i) => (
                        <li key={i} className="flex items-center justify-between text-[#56615C]">
                          <span className="truncate pr-2 font-medium">• {ex.exerciseName}</span>
                          <span className="text-[11px] font-semibold text-[#146C5F] shrink-0">
                            {ex.targetSets}x{ex.targetReps}
                          </span>
                        </li>
                      ))}
                      {template.exercises.length > 4 && (
                        <li className="text-[11px] text-[#56615C] italic">
                          + {template.exercises.length - 4} outros exercícios...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#D9DED6] flex items-center justify-between">
                  <span className="text-xs text-[#56615C] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ~50 min
                  </span>
                  <button
                    onClick={() => {
                      store.startWorkoutFromTemplate(template.id);
                      onOpenActiveWorkout();
                    }}
                    className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Iniciar Treino
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- 2. LIBRARY VIEW -------------------- */}
      {subTab === 'library' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs space-y-4">
            {/* Search and action bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar exercício por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    onlyFavorites
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'border-[#D9DED6] text-[#56615C] hover:bg-gray-50'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
                  Apenas Favoritos
                </button>
                <button
                  onClick={() => setIsCustomExerciseOpen(true)}
                  className="bg-[#146C5F] text-white hover:bg-[#0f5449] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Novo Exercício
                </button>
              </div>
            </div>

            {/* Muscle Group Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[#56615C] font-bold mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Músculo:
              </span>
              {MUSCLE_GROUPS.map((group) => (
                <button
                  key={group}
                  onClick={() => setSelectedMuscle(group)}
                  className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition ${
                    selectedMuscle === group
                      ? 'bg-[#146C5F] text-white'
                      : 'bg-[#F7F7F2] text-[#56615C] hover:bg-[#D9DED6]/50'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((exercise) => {
              const isFav = favorites.includes(exercise.id);
              return (
                <div
                  key={exercise.id}
                  className="bg-white rounded-2xl p-4 border border-[#D9DED6] shadow-xs flex flex-col justify-between hover:border-[#146C5F]/30 transition"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#146C5F] bg-[#E7F5EC] px-2 py-0.5 rounded-md inline-block mb-1">
                          {exercise.primaryMuscleGroup}
                        </span>
                        <h3 className="font-bold text-[#161917] text-sm leading-tight">
                          {exercise.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => store.toggleFavorite(exercise.id)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    </div>

                    <p className="text-xs text-[#56615C] mt-2 line-clamp-3">
                      {exercise.description || 'Execução padrão focada na contração e amplitude de movimento.'}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {exercise.equipment && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                          Equipamento: {exercise.equipment}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeWorkout && (
                    <div className="mt-4 pt-3 border-t border-[#D9DED6]/50">
                      <button
                        onClick={() => store.addExerciseToActiveWorkout(exercise)}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-[#146C45] font-bold text-xs py-1.5 rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar ao Treino Ativo
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- 3. HISTORY VIEW -------------------- */}
      {subTab === 'history' && (
        <div className="space-y-4">
          <h2 className="text-lg font-black text-[#161917]">Histórico Completo</h2>

          {history.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-[#D9DED6] text-center">
              <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-[#161917]">Nenhum treino concluído ainda</h3>
              <p className="text-xs text-[#56615C] mt-1">
                Inicie uma rotina e conclua os exercícios para ver o histórico e métricas aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DED6]/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#161917]">{item.name}</h3>
                        {item.prsAchieved.map((pr, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full flex items-center gap-1"
                          >
                            <Award className="w-3 h-3 text-amber-600" />
                            {pr}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-[#56615C] mt-0.5">
                        Concluído em {new Date(item.completedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold text-[#161917]">
                      <div className="bg-[#F7F7F2] px-3 py-1.5 rounded-lg border border-[#D9DED6]">
                        ⏱️ {item.durationMinutes} min
                      </div>
                      <div className="bg-[#E7F5EC] text-[#146C45] px-3 py-1.5 rounded-lg border border-[#8BC6A3]">
                        🏋️ {item.totalVolumeKg.toLocaleString('pt-BR')} kg volume
                      </div>
                      <div className="bg-[#F7F7F2] px-3 py-1.5 rounded-lg border border-[#D9DED6]">
                        ✅ {item.totalSets} séries
                      </div>
                    </div>
                  </div>

                  {/* Exercises Details in this workout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {item.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6]/70 text-xs"
                      >
                        <div className="font-bold text-[#161917] mb-1">{ex.exerciseName}</div>
                        <div className="text-[#56615C] flex items-center justify-between">
                          <span>{ex.setsCount} séries concluídas</span>
                          {ex.bestWeightKg > 0 && (
                            <span className="font-extrabold text-[#146C5F]">
                              Máx: {ex.bestWeightKg} kg
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- MODAL: CREATE WORKOUT TEMPLATE -------------------- */}
      {isNewTemplateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#D9DED6] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[#161917]">Criar Nova Rotina</h3>
              <button
                onClick={() => setIsNewTemplateOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Nome da Rotina *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treino de Costas e Trapézio"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  placeholder="Ex: Foco em remadas pesadas e exercícios compostos."
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              {/* Add exercises to template */}
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Adicionar Exercícios à Rotina
                </label>
                <div className="max-h-48 overflow-y-auto border border-[#D9DED6] rounded-xl p-2 space-y-1">
                  {allExercises.slice(0, 15).map((ex) => {
                    const isAdded = selectedExercisesForTemplate.some((s) => s.exerciseId === ex.id);
                    return (
                      <div
                        key={ex.id}
                        onClick={() => {
                          if (isAdded) {
                            setSelectedExercisesForTemplate((prev) =>
                              prev.filter((s) => s.exerciseId !== ex.id)
                            );
                          } else {
                            setSelectedExercisesForTemplate((prev) => [
                              ...prev,
                              {
                                exerciseId: ex.id,
                                exerciseName: ex.name,
                                targetSets: 4,
                                targetReps: 10,
                                targetWeightKg: 40,
                                restSeconds: 60,
                              },
                            ]);
                          }
                        }}
                        className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition ${
                          isAdded ? 'bg-emerald-50 text-[#146C45] font-bold' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span>{ex.name} ({ex.primaryMuscleGroup})</span>
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#56615C] mt-1">
                  {selectedExercisesForTemplate.length} exercícios selecionados para esta rotina.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9DED6]">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Salvar Rotina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: CREATE CUSTOM EXERCISE -------------------- */}
      {isCustomExerciseOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DED6] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[#161917]">Novo Exercício Personalizado</h3>
              <button
                onClick={() => setIsCustomExerciseOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Nome do Exercício *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supino Inclinado Articulado"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Grupo Muscular Principal *
                </label>
                <select
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                >
                  {MUSCLE_GROUPS.filter((m) => m !== 'Todos').map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Equipamento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Máquina Smith, Halteres, Cabo"
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Instruções / Dicas de Execução
                </label>
                <textarea
                  placeholder="Foco no alongamento na descida e contração no topo..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9DED6]">
                <button
                  type="button"
                  onClick={() => setIsCustomExerciseOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Criar Exercício
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
