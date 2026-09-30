import React, { useState } from 'react';
import {
  Award,
  Flame,
  Dumbbell,
  Calculator,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../store';

export function ProgressScreen() {
  const store = useAppStore();
  const { history, prs, userProfile } = store;

  // 1RM Calculator inputs
  const [calcWeight, setCalcWeight] = useState(80);
  const [calcReps, setCalcReps] = useState(8);

  // Epley formula: 1RM = Weight * (1 + Reps/30)
  const epley1RM = Math.round(calcWeight * (1 + calcReps / 30));
  // Brzycki formula: 1RM = Weight * (36 / (37 - Reps))
  const brzycki1RM = calcReps < 37 ? Math.round(calcWeight * (36 / (37 - calcReps))) : epley1RM;

  // Total volume from history
  const totalLiftedVolume = history.reduce((acc, h) => acc + h.totalVolumeKg, 0);
  const totalWorkouts = history.length;

  const achievementsList = [
    {
      id: 'ach-1',
      title: 'Primeiro Treino',
      desc: 'Conclua seu primeiro treino no ForgeFlow.',
      unlocked: totalWorkouts >= 1,
      date: 'Desbloqueado',
    },
    {
      id: 'ach-2',
      title: 'Primeiro Recorde Pessoal (PR)',
      desc: 'Estabeleça sua primeira marca pessoal de carga ou repetições.',
      unlocked: prs.length >= 1,
      date: 'Desbloqueado',
    },
    {
      id: 'ach-3',
      title: 'Clube dos 10.000 kg',
      desc: 'Levante mais de 10 toneladas em volume acumulado.',
      unlocked: totalLiftedVolume >= 10000,
      date: totalLiftedVolume >= 10000 ? 'Desbloqueado' : `${Math.round(totalLiftedVolume)} / 10.000 kg`,
    },
    {
      id: 'ach-4',
      title: 'Consistência de Aço',
      desc: 'Mantenha pelo menos 3 semanas seguidas de treino.',
      unlocked: userProfile.streakWeeks >= 3,
      date: `${userProfile.streakWeeks} semanas ativas`,
    },
    {
      id: 'ach-5',
      title: 'Clube dos 50.000 kg',
      desc: 'Alcance 50 toneladas de volume acumulado.',
      unlocked: totalLiftedVolume >= 50000,
      date: totalLiftedVolume >= 50000 ? 'Desbloqueado' : `${Math.round(totalLiftedVolume)} / 50.000 kg`,
    },
    {
      id: 'ach-6',
      title: 'Mestre da Frequência (10 Treinos)',
      desc: 'Finalize 10 sessões completas de musculação.',
      unlocked: totalWorkouts >= 10,
      date: `${totalWorkouts} / 10 treinos`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
          Progresso & Recordes Pessoais
        </h1>
        <p className="text-sm text-[#56615C]">
          Acompanhe sua evolução de força, marcas históricas (PRs) e conquistas.
        </p>
      </div>

      {/* Top 3 High Level KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wider">
              Volume Total Acumulado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#146C45] flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#161917] mt-3">
            {totalLiftedVolume.toLocaleString('pt-BR')} <span className="text-sm font-semibold text-[#56615C]">kg</span>
          </div>
          <p className="text-xs text-[#56615C] mt-1">Soma das cargas de todas as séries concluídas</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wider">
              Treinos Realizados
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E7F5EC] text-[#146C45] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#161917] mt-3">
            {totalWorkouts}
          </div>
          <p className="text-xs text-[#56615C] mt-1">Sessões gravadas no seu histórico local</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#56615C] uppercase tracking-wider">
              Sequência Ativa
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#161917] mt-3">
            {userProfile.streakWeeks} <span className="text-sm font-semibold text-[#56615C]">semanas</span>
          </div>
          <p className="text-xs text-[#56615C] mt-1">Treinando pelo menos 3 vezes por semana</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Records Board (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#161917] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Quadro de Recordes Pessoais (PRs)
                </h2>
                <p className="text-xs text-[#56615C]">
                  Cargas máximas e estimativas de 1RM registradas durante seus treinos
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9DED6] text-[10px] font-extrabold uppercase text-[#56615C]">
                    <th className="py-2.5 px-3">Exercício</th>
                    <th className="py-2.5 px-3">Tipo de PR</th>
                    <th className="py-2.5 px-3 text-right">Melhor Marca</th>
                    <th className="py-2.5 px-3 text-right">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-xs text-[#56615C]">
                        Nenhum recorde pessoal registrado ainda. Complete séries nos treinos para registrar seus PRs!
                      </td>
                    </tr>
                  ) : (
                    prs.map((pr) => (
                      <tr key={pr.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3 font-bold text-[#161917]">
                          {pr.exerciseName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            pr.type === 'weight'
                              ? 'bg-emerald-50 text-[#146C45]'
                              : pr.type === 'estimated_1rm'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-sky-50 text-sky-800'
                          }`}>
                            {pr.type === 'weight'
                              ? 'Carga Máxima'
                              : pr.type === 'estimated_1rm'
                              ? '1RM Estimado'
                              : 'Repetições'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-sm text-[#146C5F]">
                          {pr.value} {pr.unit}
                        </td>
                        <td className="py-3 px-3 text-right text-[#56615C]">
                          {pr.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 1RM Calculator Widget */}
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#146C5F]" />
              <h2 className="text-lg font-black text-[#161917]">
                Calculadora de 1RM (Uma Repetição Máxima)
              </h2>
            </div>
            <p className="text-xs text-[#56615C]">
              Estime sua repetição máxima sem precisar testar a falha total, utilizando as fórmulas consagradas de Epley e Brzycki.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Carga Levantada (kg)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Repetições Executadas
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={calcReps}
                  onChange={(e) => setCalcReps(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-[#146C5F]"
                />
              </div>
            </div>

            <div className="bg-[#F7F7F2] p-4 rounded-xl border border-[#D9DED6] grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[10px] font-extrabold text-[#56615C] uppercase block">
                  Fórmula de Epley
                </span>
                <span className="text-2xl font-black text-[#146C5F]">{epley1RM} kg</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#56615C] uppercase block">
                  Fórmula de Brzycki
                </span>
                <span className="text-2xl font-black text-[#146C5F]">{brzycki1RM} kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Achievements & Badges (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-black text-[#161917] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#146C5F]" />
              Conquistas & Distintivos
            </h2>
            <p className="text-xs text-[#56615C]">
              Marcos de consistência e superação atlética
            </p>
          </div>

          <div className="space-y-3">
            {achievementsList.map((ach) => (
              <div
                key={ach.id}
                className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                  ach.unlocked
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    ach.unlocked ? 'bg-[#146C5F] text-white shadow-xs' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {ach.unlocked ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-[#161917]">{ach.title}</h3>
                    <span className="text-[10px] font-extrabold text-[#146C5F]">{ach.date}</span>
                  </div>
                  <p className="text-[11px] text-[#56615C] mt-0.5 leading-snug">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
