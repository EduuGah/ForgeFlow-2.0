import React from 'react';
import {
  Dumbbell,
  Play,
  Droplet,
  Utensils,
  Target,
  Award,
  ChevronRight,
  Flame,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '../store';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
  onOpenActiveWorkout: () => void;
}

export function HomeScreen({ onNavigate, onOpenActiveWorkout }: HomeScreenProps) {
  const store = useAppStore();
  const {
    activeWorkout,
    templates,
    history,
    prs,
    goals,
    hydrationTargetMl,
    hydrationLogs,
    nutritionTargetKcal,
    meals,
    userProfile,
  } = store;

  // Compute daily totals
  const totalWaterMl = hydrationLogs.reduce((acc, log) => acc + log.amountMl, 0);
  const waterProgress = Math.min(100, Math.round((totalWaterMl / hydrationTargetMl) * 100));

  const totalCalories = meals.reduce((acc, meal) => acc + meal.kcal, 0);
  const totalProtein = meals.reduce((acc, meal) => acc + meal.proteinG, 0);
  const totalCarbs = meals.reduce((acc, meal) => acc + meal.carbsG, 0);
  const totalFat = meals.reduce((acc, meal) => acc + meal.fatG, 0);

  const activeGoalsCount = goals.filter((g) => g.status === 'active').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Welcome & Status Bar */}
      <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#146C5F] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#146C5F]"></span>
            Modo Local-First Ativo
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Olá, {userProfile.name}! 👋
          </h1>
          <p className="text-sm text-[#56615C] mt-0.5">
            Pronto para manter a consistência e quebrar seus recordes hoje.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#E7F5EC] border border-[#8BC6A3] text-[#146C45] px-3.5 py-2 rounded-xl text-xs font-bold">
            <Flame className="w-4 h-4 text-[#146C5F]" />
            <span>{userProfile.streakWeeks} semanas seguidas</span>
          </div>

          <button
            onClick={() => {
              if (activeWorkout) {
                onOpenActiveWorkout();
              } else {
                store.startEmptyWorkout();
                onOpenActiveWorkout();
              }
            }}
            className="flex items-center gap-2 bg-[#146C5F] hover:bg-[#0f5449] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs transition"
          >
            <Play className="w-4 h-4 fill-white" />
            {activeWorkout ? 'Continuar Treino' : 'Iniciar Treino'}
          </button>
        </div>
      </div>

      {/* Active Workout Alert if Running */}
      {activeWorkout && (
        <div className="bg-gradient-to-r from-[#146C5F] to-[#1c8474] rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
              Sessão Ativa
            </span>
            <h2 className="text-xl font-black">{activeWorkout.name}</h2>
            <p className="text-xs text-emerald-100">
              {activeWorkout.exercises.length} exercícios adicionados • Iniciado há pouco
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenActiveWorkout}
              className="flex-1 sm:flex-none bg-white text-[#146C5F] hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-xs"
            >
              Abrir Registro de Séries
            </button>
          </div>
        </div>
      )}

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workouts Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wide">Treinos</span>
            <div className="w-8 h-8 rounded-lg bg-[#E7F5EC] flex items-center justify-center text-[#146C45]">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#161917]">{templates.length}</div>
            <p className="text-xs text-[#56615C]">Rotinas configuradas</p>
          </div>
          <button
            onClick={() => onNavigate('workouts')}
            className="flex items-center justify-between text-xs font-bold text-[#146C5F] hover:underline pt-2 border-t border-[#D9DED6]/50"
          >
            Ver treinos e biblioteca
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hydration Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wide">Hidratação Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#161917] flex items-baseline gap-1">
              {totalWaterMl} <span className="text-sm font-bold text-[#56615C]">/ {hydrationTargetMl} ml</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${waterProgress}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#D9DED6]/50">
            <div className="flex gap-1.5">
              <button
                onClick={() => store.addHydration(250)}
                className="text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-1 rounded"
              >
                +250ml
              </button>
              <button
                onClick={() => store.addHydration(500)}
                className="text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-1 rounded"
              >
                +500ml
              </button>
            </div>
            <button
              onClick={() => onNavigate('hydration')}
              className="text-xs font-bold text-[#146C5F] hover:underline"
            >
              Ver mais
            </button>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wide">Nutrição Diária</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#161917] flex items-baseline gap-1">
              {totalCalories} <span className="text-sm font-bold text-[#56615C]">/ {nutritionTargetKcal} kcal</span>
            </div>
            <div className="flex gap-2 text-[10px] text-[#56615C] font-semibold mt-1">
              <span className="text-emerald-700">P: {totalProtein}g</span>
              <span className="text-amber-700">C: {totalCarbs}g</span>
              <span className="text-rose-700">G: {totalFat}g</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('nutrition')}
            className="flex items-center justify-between text-xs font-bold text-[#146C5F] hover:underline pt-2 border-t border-[#D9DED6]/50"
          >
            Registrar refeições
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Goals & PRs Card */}
        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wide">Recordes & Metas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#146C45]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#161917]">{prs.length}</div>
            <p className="text-xs text-[#56615C]">{activeGoalsCount} metas ativas em progresso</p>
          </div>
          <button
            onClick={() => onNavigate('progress')}
            className="flex items-center justify-between text-xs font-bold text-[#146C5F] hover:underline pt-2 border-t border-[#D9DED6]/50"
          >
            Ver quadro de PRs
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div>
        <h3 className="text-sm font-extrabold text-[#56615C] uppercase tracking-wider mb-3">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('workouts')}
            className="bg-white hover:bg-emerald-50/50 p-4 rounded-xl border border-[#D9DED6] text-left transition flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-lg bg-[#146C5F] text-white flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#161917]">Rotinas</div>
              <div className="text-xs text-[#56615C]">Ver treinos salvos</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('hydration')}
            className="bg-white hover:bg-sky-50/50 p-4 rounded-xl border border-[#D9DED6] text-left transition flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#161917]">Hidratação</div>
              <div className="text-xs text-[#56615C]">Adicionar consumo</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('nutrition')}
            className="bg-white hover:bg-amber-50/50 p-4 rounded-xl border border-[#D9DED6] text-left transition flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#161917]">Refeições</div>
              <div className="text-xs text-[#56615C]">Diário nutricional</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('goals')}
            className="bg-white hover:bg-emerald-50/50 p-4 rounded-xl border border-[#D9DED6] text-left transition flex items-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#161917]">Metas</div>
              <div className="text-xs text-[#56615C]">Acompanhar alvos</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Workouts History Preview */}
      <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-[#161917]">Histórico Recente de Treinos</h2>
            <p className="text-xs text-[#56615C]">Seus últimos treinos concluídos com sucesso</p>
          </div>
          <button
            onClick={() => onNavigate('workouts')}
            className="text-xs font-bold text-[#146C5F] hover:underline"
          >
            Ver histórico completo →
          </button>
        </div>

        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F7F2] border border-[#D9DED6] text-center text-xs text-[#56615C]">
              Nenhum treino concluído ainda. Inicie seu primeiro treino para ver seu histórico aqui!
            </div>
          ) : (
            history.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#F7F7F2] border border-[#D9DED6] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#161917] text-sm">{item.name}</h3>
                    {item.prsAchieved.length > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600" />
                        Novo PR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#56615C] mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.completedAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span>•</span>
                    <span>{item.durationMinutes} min</span>
                    <span>•</span>
                    <span className="font-bold text-[#161917]">{item.totalVolumeKg.toLocaleString('pt-BR')} kg</span>
                    <span>•</span>
                    <span>{item.totalSets} séries</span>
                  </div>
                </div>

                <div className="text-xs text-[#56615C]">
                  {item.exercises.length} exercícios registrados
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
