import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Edit3 } from 'lucide-react';
import { useAppStore, GoalItem } from '../store';

export function GoalsScreen() {
  const store = useAppStore();
  const { goals } = store;

  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalItem['type']>('exercise_weight');
  const [goalTarget, setGoalTarget] = useState(100);
  const [goalUnit, setGoalUnit] = useState('kg');
  const [goalDeadline, setGoalDeadline] = useState('31/12/2026');

  // Edit progress modal state
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [progressValue, setProgressValue] = useState(0);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;

    store.addGoal({
      title: goalTitle.trim(),
      type: goalType,
      currentValue: 0,
      targetValue: goalTarget,
      unit: goalUnit,
      deadline: goalDeadline.trim() || undefined,
    });

    setIsNewGoalModalOpen(false);
    setGoalTitle('');
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    store.updateGoalProgress(editingGoal.id, progressValue);
    setEditingGoal(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Metas & Objetivos
          </h1>
          <p className="text-sm text-[#56615C]">
            Defina metas claras para sua frequência de treino, cargas e composição física.
          </p>
        </div>

        <button
          onClick={() => setIsNewGoalModalOpen(true)}
          className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Criar Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {goals.map((goal) => {
          const progressPercent = Math.min(
            100,
            Math.round((goal.currentValue / goal.targetValue) * 100)
          );
          const isDone = goal.status === 'completed' || goal.currentValue >= goal.targetValue;

          return (
            <div
              key={goal.id}
              className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition ${
                isDone ? 'border-emerald-300 bg-emerald-50/20' : 'border-[#D9DED6]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mb-1 ${
                        isDone
                          ? 'bg-emerald-100 text-[#146C45]'
                          : 'bg-[#146C5F]/10 text-[#146C5F]'
                      }`}
                    >
                      {isDone ? 'Meta Atingida' : 'Em Andamento'}
                    </span>
                    <h3 className="font-extrabold text-[#161917] text-base">{goal.title}</h3>
                  </div>

                  <button
                    onClick={() => store.deleteGoal(goal.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                    title="Excluir meta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-4">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs font-bold text-[#56615C]">Progresso:</span>
                    <span className="text-sm font-black text-[#161917]">
                      {goal.currentValue} / {goal.targetValue} {goal.unit} ({progressPercent}%)
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        isDone ? 'bg-[#146C45]' : 'bg-[#146C5F]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#D9DED6]/60 flex items-center justify-between text-xs">
                <span className="text-[#56615C] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {goal.deadline ? `Prazo: ${goal.deadline}` : 'Sem prazo fixo'}
                </span>

                <button
                  onClick={() => {
                    setEditingGoal(goal);
                    setProgressValue(goal.currentValue);
                  }}
                  className="bg-[#F7F7F2] hover:bg-gray-200 border border-[#D9DED6] text-[#161917] px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#146C5F]" />
                  Atualizar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Goal */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DED6] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[#161917]">Nova Meta</h3>
              <button
                onClick={() => setIsNewGoalModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Título da Meta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supino Reto com 100 kg"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Tipo de Meta
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => {
                      const t = e.target.value as GoalItem['type'];
                      setGoalType(t);
                      if (t === 'frequency') setGoalUnit('treinos/sem');
                      else if (t === 'weight' || t === 'exercise_weight') setGoalUnit('kg');
                      else setGoalUnit('unid');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                  >
                    <option value="exercise_weight">Carga em Exercício</option>
                    <option value="frequency">Frequência Semanal</option>
                    <option value="weight">Peso Corporal</option>
                    <option value="custom">Personalizada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Valor Alvo
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={goalUnit}
                    onChange={(e) => setGoalUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Prazo Estimado
                  </label>
                  <input
                    type="text"
                    placeholder="DD/MM/AAAA"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9DED6]">
                <button
                  type="button"
                  onClick={() => setIsNewGoalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Progress */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#D9DED6] space-y-4">
            <h3 className="font-black text-base text-[#161917]">
              Atualizar Progresso: {editingGoal.title}
            </h3>

            <form onSubmit={handleUpdateProgress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Valor Atual ({editingGoal.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={progressValue}
                  onChange={(e) => setProgressValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                />
                <span className="text-[11px] text-[#56615C] mt-1 block">
                  Alvo: {editingGoal.targetValue} {editingGoal.unit}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2 rounded-xl text-xs font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
