import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Trash2,
  Plus,
  Timer,
  Award,
  Check,
  Search,
} from 'lucide-react';
import { useAppStore } from '../store';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveWorkoutModal({ isOpen, onClose }: ActiveWorkoutModalProps) {
  const store = useAppStore();
  const { activeWorkout, allExercises } = store;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [isConfirmFinishOpen, setIsConfirmFinishOpen] = useState(false);

  // Live timer for active workout
  useEffect(() => {
    if (!activeWorkout) return;
    const start = new Date(activeWorkout.startedAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  if (!isOpen || !activeWorkout) return null;

  const formatElapsedTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Metrics calculation
  let totalVolume = 0;
  let completedSetsCount = 0;
  let totalSetsCount = 0;

  activeWorkout.exercises.forEach((ex) => {
    ex.sets.forEach((set) => {
      totalSetsCount++;
      if (set.completed) {
        completedSetsCount++;
        totalVolume += set.weightKg * set.repetitions;
      }
    });
  });

  const filteredExercisesToAdd = allExercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <div className="bg-[#F7F7F2] w-full max-w-4xl h-[95vh] sm:h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-[#D9DED6]">
        {/* Top Header Bar */}
        <div className="bg-white px-5 py-4 border-b border-[#D9DED6] flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <h2 className="text-lg font-black text-[#161917] tracking-tight">
                {activeWorkout.name}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#56615C] mt-1 font-semibold">
              <span className="flex items-center gap-1 text-[#146C5F] font-bold">
                <Timer className="w-3.5 h-3.5" />
                {formatElapsedTime(elapsedSeconds)}
              </span>
              <span>•</span>
              <span>{completedSetsCount}/{totalSetsCount} séries feitas</span>
              <span>•</span>
              <span className="text-[#161917] font-bold">
                {totalVolume.toLocaleString('pt-BR')} kg volume
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsConfirmFinishOpen(true)}
              className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Finalizar Treino
            </button>
            <button
              onClick={onClose}
              title="Minimizar treino"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area: Exercises List with Sets */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeWorkout.exercises.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-[#D9DED6] text-center my-8">
              <Award className="w-12 h-12 text-[#146C5F]/30 mx-auto mb-3" />
              <h3 className="font-extrabold text-[#161917] text-base">
                Nenhum exercício adicionado ainda
              </h3>
              <p className="text-xs text-[#56615C] mt-1 max-w-sm mx-auto mb-4">
                Adicione exercícios da biblioteca para registrar cargas, repetições e bater seus recordes.
              </p>
              <button
                onClick={() => setIsAddExerciseModalOpen(true)}
                className="bg-[#146C5F] text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Adicionar Exercício
              </button>
            </div>
          ) : (
            activeWorkout.exercises.map((ex, exIndex) => (
              <div
                key={ex.exerciseId + exIndex}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D9DED6] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#D9DED6]/60 pb-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#146C5F] bg-[#E7F5EC] px-2 py-0.5 rounded-md inline-block mb-0.5">
                      {ex.primaryMuscleGroup}
                    </span>
                    <h3 className="font-black text-[#161917] text-base">{ex.exerciseName}</h3>
                  </div>
                  <button
                    onClick={() => store.removeExerciseFromActiveWorkout(exIndex)}
                    title="Remover exercício do treino"
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[#56615C] font-extrabold uppercase border-b border-[#D9DED6]/40 text-[10px]">
                        <th className="py-2 px-2 w-12 text-center">Série</th>
                        <th className="py-2 px-2 w-24">Tipo</th>
                        <th className="py-2 px-2 text-center w-28">Carga (kg)</th>
                        <th className="py-2 px-2 text-center w-24">Reps</th>
                        <th className="py-2 px-2 text-center w-16">Feito</th>
                        <th className="py-2 px-1 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ex.sets.map((set, setIndex) => (
                        <tr
                          key={set.id}
                          className={`transition ${set.completed ? 'bg-emerald-50/60' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="py-2 px-2 font-black text-center text-[#161917]">
                            {set.setNumber}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() =>
                                store.updateSetActiveWorkout(exIndex, setIndex, {
                                  setType: set.setType === 'working' ? 'warmup' : 'working',
                                })
                              }
                              className={`text-[10px] font-extrabold px-2 py-1 rounded transition ${
                                set.setType === 'working'
                                  ? 'bg-[#146C5F]/10 text-[#146C5F]'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {set.setType === 'working' ? 'Trabalho' : 'Aquec.'}
                            </button>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg}
                              onChange={(e) =>
                                store.updateSetActiveWorkout(exIndex, setIndex, {
                                  weightKg: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 text-center py-1.5 rounded-lg border border-[#D9DED6] font-bold text-xs focus:outline-none focus:border-[#146C5F] bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={set.repetitions}
                              onChange={(e) =>
                                store.updateSetActiveWorkout(exIndex, setIndex, {
                                  repetitions: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-16 text-center py-1.5 rounded-lg border border-[#D9DED6] font-bold text-xs focus:outline-none focus:border-[#146C5F] bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                store.updateSetActiveWorkout(exIndex, setIndex, {
                                  completed: !set.completed,
                                })
                              }
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                                set.completed
                                  ? 'bg-[#146C5F] text-white shadow-xs'
                                  : 'border-2 border-[#D9DED6] hover:border-[#146C5F] text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </td>
                          <td className="py-2 px-1 text-center">
                            {ex.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => store.removeSetFromActiveExercise(exIndex, setIndex)}
                                className="text-gray-300 hover:text-rose-500 p-1"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => store.addSetToActiveExercise(exIndex)}
                    className="text-xs font-bold text-[#146C5F] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Série
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add Exercise and Discard actions at bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setIsAddExerciseModalOpen(true)}
              className="w-full sm:w-auto bg-white border border-[#D9DED6] hover:bg-gray-50 text-[#161917] px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4 text-[#146C5F]" />
              Adicionar Exercício ao Treino
            </button>

            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja descartar este treino? Os dados da sessão não serão salvos.')) {
                  store.discardActiveWorkout();
                  onClose();
                }
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 transition"
            >
              Descartar Treino
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Select Exercise to add */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#D9DED6] space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-[#161917]">Selecionar Exercício</h3>
              <button
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D9DED6] text-xs focus:outline-none focus:border-[#146C5F]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredExercisesToAdd.slice(0, 30).map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => {
                    store.addExerciseToActiveWorkout(ex);
                    setIsAddExerciseModalOpen(false);
                    setExerciseSearch('');
                  }}
                  className="p-2.5 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 border border-transparent cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-[#161917]">{ex.name}</div>
                    <div className="text-[10px] text-[#56615C]">
                      {ex.primaryMuscleGroup} {ex.equipment ? `• ${ex.equipment}` : ''}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-[#146C5F]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Finish Workout */}
      {isConfirmFinishOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#D9DED6] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#146C45] flex items-center justify-center mx-auto">
              <Award className="w-6 h-6 text-[#146C5F]" />
            </div>

            <div>
              <h3 className="font-black text-lg text-[#161917]">Parabéns pelo treino! 🎉</h3>
              <p className="text-xs text-[#56615C] mt-1">
                Você concluiu <span className="font-bold text-[#161917]">{completedSetsCount}</span> séries e levantou um volume total de{' '}
                <span className="font-bold text-[#146C5F]">{totalVolume.toLocaleString('pt-BR')} kg</span>!
              </p>
            </div>

            <div className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6] text-xs text-[#56615C] space-y-1">
              <div className="flex justify-between">
                <span>Duração:</span>
                <span className="font-bold text-[#161917]">{formatElapsedTime(elapsedSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span>Exercícios:</span>
                <span className="font-bold text-[#161917]">{activeWorkout.exercises.length}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsConfirmFinishOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  store.finishActiveWorkout();
                  setIsConfirmFinishOpen(false);
                  onClose();
                }}
                className="flex-1 bg-[#146C5F] hover:bg-[#0f5449] text-white py-2 rounded-xl text-xs font-bold transition shadow-xs"
              >
                Salvar no Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
