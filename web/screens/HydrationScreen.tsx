import React, { useState } from 'react';
import { Droplets, Trash2, Clock, CheckCircle2, Settings } from 'lucide-react';
import { useAppStore } from '../store';

export function HydrationScreen() {
  const store = useAppStore();
  const { hydrationTargetMl, hydrationLogs } = store;

  const [customMl, setCustomMl] = useState(300);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTarget, setNewTarget] = useState(hydrationTargetMl);

  const totalMl = hydrationLogs.reduce((acc, l) => acc + l.amountMl, 0);
  const progressPercent = Math.min(100, Math.round((totalMl / hydrationTargetMl) * 100));
  const remainingMl = Math.max(0, hydrationTargetMl - totalMl);

  const handleUpdateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    store.setHydrationTarget(newTarget);
    setIsSettingsOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Controle de Hidratação
          </h1>
          <p className="text-sm text-[#56615C]">
            Mantenha seu rendimento muscular e saúde geral bebendo água regularmente.
          </p>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-white border border-[#D9DED6] hover:bg-gray-50 text-[#161917] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition self-start sm:self-auto"
        >
          <Settings className="w-3.5 h-3.5 text-[#146C5F]" />
          Ajustar Meta Diária
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status & Quick Action Card (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#D9DED6] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center sm:text-left">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md inline-block">
                Consumo de Hoje
              </span>
              <div className="text-4xl sm:text-5xl font-black text-[#161917]">
                {totalMl} <span className="text-lg font-bold text-[#56615C]">/ {hydrationTargetMl} ml</span>
              </div>
              <p className="text-xs text-[#56615C]">
                {remainingMl > 0 ? (
                  <span>
                    Faltam <span className="font-bold text-sky-700">{remainingMl} ml</span> para bater sua meta diária!
                  </span>
                ) : (
                  <span className="text-[#146C45] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Parabéns! Meta de hidratação batida hoje!
                  </span>
                )}
              </p>
            </div>

            {/* Circular or Pill Progress Graphic */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-sky-500 transition-all duration-500 ease-out"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <Droplets className="w-6 h-6 text-sky-500 mb-0.5" />
                <span className="text-xl font-black text-[#161917]">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Quick Add Buttons */}
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#161917] uppercase tracking-wider">
              Registrar Consumo Rápido
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Copo', amount: 250, desc: '250 ml' },
                { label: 'Caneca', amount: 350, desc: '350 ml' },
                { label: 'Garrafa Peq.', amount: 500, desc: '500 ml' },
                { label: 'Garrafa Gde.', amount: 750, desc: '750 ml' },
              ].map((btn) => (
                <button
                  key={btn.amount}
                  onClick={() => store.addHydration(btn.amount)}
                  className="p-4 rounded-xl border border-[#D9DED6] hover:border-sky-300 hover:bg-sky-50/50 text-center transition group shadow-xs"
                >
                  <Droplets className="w-5 h-5 text-sky-500 mx-auto mb-1 group-hover:scale-110 transition" />
                  <div className="font-bold text-xs text-[#161917]">{btn.label}</div>
                  <div className="text-[11px] font-extrabold text-sky-600 mt-0.5">+{btn.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="pt-2 border-t border-[#D9DED6]/50 flex items-center gap-3">
              <span className="text-xs font-bold text-[#56615C] shrink-0">Quantidade Personalizada:</span>
              <input
                type="number"
                step="50"
                value={customMl}
                onChange={(e) => setCustomMl(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-3 py-1.5 rounded-lg border border-[#D9DED6] text-xs font-bold focus:outline-none focus:border-sky-500"
              />
              <span className="text-xs text-[#56615C]">ml</span>
              <button
                onClick={() => {
                  if (customMl > 0) store.addHydration(customMl);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
              >
                + Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Today's Logs History (1 col) */}
        <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D9DED6]/60 pb-3">
            <h3 className="font-black text-sm text-[#161917]">Registros de Hoje</h3>
            <span className="text-xs text-[#56615C] font-semibold">{hydrationLogs.length} registros</span>
          </div>

          {hydrationLogs.length === 0 ? (
            <div className="text-center py-8 text-[#56615C] text-xs">
              Nenhum consumo registrado hoje ainda.
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {hydrationLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F2] border border-[#D9DED6] text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                      💧
                    </div>
                    <div>
                      <div className="font-extrabold text-[#161917]">+{log.amountMl} ml</div>
                      <div className="text-[10px] text-[#56615C] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {log.timestamp}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => store.removeHydration(log.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 transition"
                    title="Remover registro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-[#D9DED6] space-y-4">
            <h3 className="font-black text-base text-[#161917]">Ajustar Meta Diária de Água</h3>
            <form onSubmit={handleUpdateTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#56615C] uppercase mb-1">
                  Meta em Mililitros (ml)
                </label>
                <input
                  type="number"
                  step="100"
                  min="500"
                  max="10000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(parseInt(e.target.value, 10) || 2000)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm font-bold focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#D9DED6] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
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
