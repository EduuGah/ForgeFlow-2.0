import React, { useState } from 'react';
import { Utensils, Plus, Trash2, Clock } from 'lucide-react';
import { useAppStore, MealItem } from '../store';

export function NutritionScreen() {
  const store = useAppStore();
  const {
    nutritionTargetKcal,
    nutritionTargetProtein,
    nutritionTargetCarbs,
    nutritionTargetFat,
    meals,
  } = store;

  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealItem['mealType']>('breakfast');
  const [mealKcal, setMealKcal] = useState(450);
  const [mealProtein, setMealProtein] = useState(30);
  const [mealCarbs, setMealCarbs] = useState(45);
  const [mealFat, setMealFat] = useState(12);

  // Compute daily totals
  const totalKcal = meals.reduce((acc, m) => acc + m.kcal, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.proteinG, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.carbsG, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.fatG, 0);

  const kcalProgress = Math.min(100, Math.round((totalKcal / nutritionTargetKcal) * 100));

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;

    store.addMeal({
      name: mealName.trim(),
      mealType,
      kcal: mealKcal,
      proteinG: mealProtein,
      carbsG: mealCarbs,
      fatG: mealFat,
    });

    setIsAddMealModalOpen(false);
    setMealName('');
  };

  const mealTypeLabels: Record<MealItem['mealType'], string> = {
    breakfast: 'Café da Manhã',
    lunch: 'Almoço',
    dinner: 'Jantar',
    snack: 'Lanche / Snack',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Diário Nutricional
          </h1>
          <p className="text-sm text-[#56615C]">
            Acompanhe o balanço energético diário e distribuição de macronutrientes.
          </p>
        </div>

        <button
          onClick={() => setIsAddMealModalOpen(true)}
          className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Refeição
        </button>
      </div>

      {/* Main KPI Summary Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wider">
              Calorias Totais Hoje
            </span>
            <div className="text-3xl sm:text-4xl font-black text-[#161917] mt-1 flex items-baseline gap-2">
              {totalKcal}{' '}
              <span className="text-base font-bold text-[#56615C]">
                / {nutritionTargetKcal} kcal
              </span>
            </div>
          </div>

          <div className="text-xs font-bold text-[#56615C] flex items-center gap-2">
            <span>{kcalProgress}% da meta calórica</span>
          </div>
        </div>

        {/* Calorie bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-amber-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${kcalProgress}%` }}
          ></div>
        </div>

        {/* 3 Macro Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Protein */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-900 mb-1">
              <span>Proteínas</span>
              <span>{Math.round((totalProtein / nutritionTargetProtein) * 100)}%</span>
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {totalProtein} <span className="text-xs font-bold">/ {nutritionTargetProtein} g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="flex justify-between items-center text-xs font-bold text-amber-900 mb-1">
              <span>Carboidratos</span>
              <span>{Math.round((totalCarbs / nutritionTargetCarbs) * 100)}%</span>
            </div>
            <div className="text-2xl font-black text-amber-800">
              {totalCarbs} <span className="text-xs font-bold">/ {nutritionTargetCarbs} g</span>
            </div>
          </div>

          {/* Fat */}
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
            <div className="flex justify-between items-center text-xs font-bold text-rose-900 mb-1">
              <span>Gorduras</span>
              <span>{Math.round((totalFat / nutritionTargetFat) * 100)}%</span>
            </div>
            <div className="text-2xl font-black text-rose-800">
              {totalFat} <span className="text-xs font-bold">/ {nutritionTargetFat} g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meals List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-[#161917]">Refeições Registradas</h2>

        {meals.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-[#D9DED6] text-center">
            <Utensils className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="font-bold text-[#161917]">Nenhuma refeição registrada hoje</h3>
            <p className="text-xs text-[#56615C] mt-1">
              Clique em &quot;Registrar Refeição&quot; para começar o diário de hoje.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#D9DED6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                      {mealTypeLabels[meal.mealType]}
                    </span>
                    <h3 className="font-bold text-sm text-[#161917]">{meal.name}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#56615C] mt-1.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {meal.consumedAt}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-bold">P: {meal.proteinG}g</span>
                    <span>•</span>
                    <span className="text-amber-700 font-bold">C: {meal.carbsG}g</span>
                    <span>•</span>
                    <span className="text-rose-700 font-bold">G: {meal.fatG}g</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-right">
                    <span className="text-base font-black text-[#146C5F]">{meal.kcal}</span>
                    <span className="text-xs text-[#56615C] font-semibold"> kcal</span>
                  </div>

                  <button
                    onClick={() => store.removeMeal(meal.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                    title="Excluir refeição"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Add Meal */}
      {isAddMealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#D9DED6] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-[#161917]">Registrar Refeição</h3>
              <button
                onClick={() => setIsAddMealModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Nome ou Descrição da Refeição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz, feijão e filé de frango"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Tipo de Refeição
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealItem['mealType'])}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                >
                  <option value="breakfast">Café da Manhã</option>
                  <option value="lunch">Almoço</option>
                  <option value="dinner">Jantar</option>
                  <option value="snack">Lanche / Snack</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Calorias (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mealKcal}
                    onChange={(e) => setMealKcal(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Proteínas (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mealProtein}
                    onChange={(e) => setMealProtein(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Carboidratos (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mealCarbs}
                    onChange={(e) => setMealCarbs(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                    Gorduras (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mealFat}
                    onChange={(e) => setMealFat(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9DED6]">
                <button
                  type="button"
                  onClick={() => setIsAddMealModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Salvar Refeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
