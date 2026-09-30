import React, { useState } from 'react';
import {
  Bell,
  Download,
  FileText,
  Save,
  HardDrive,
  Cloud,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../store';

export function ProfileScreen() {
  const store = useAppStore();
  const { userProfile, notificationPrefs, currentUser, isSyncingWithFirestore } = store;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [bio, setBio] = useState(userProfile.bio);
  const [experience, setExperience] = useState(userProfile.experience);
  const [weightKg, setWeightKg] = useState(userProfile.weightKg);
  const [heightCm, setHeightCm] = useState(userProfile.heightCm);
  const [mainGoal, setMainGoal] = useState(userProfile.mainGoal);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateProfile({
      name,
      bio,
      experience,
      weightKg,
      heightCm,
      mainGoal,
    });
    setIsEditing(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await store.login();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleExportBackup = () => {
    const data = {
      profile: userProfile,
      history: store.history,
      templates: store.templates,
      prs: store.prs,
      goals: store.goals,
      hydrationLogs: store.hydrationLogs,
      meals: store.meals,
      exportedAt: new Date().toISOString(),
      version: 'ForgeFlow-2.0-web',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forgeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
          Perfil & Configurações
        </h1>
        <p className="text-sm text-[#56615C]">
          Gerencie sua conta Google, sincronização em nuvem Firestore e dados pessoais.
        </p>
      </div>

      {/* Google Account Card */}
      <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'Avatar'}
              className="w-14 h-14 rounded-2xl border border-[#D9DED6] object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#146C5F] text-white flex items-center justify-center font-black text-xl shadow-xs">
              {(currentUser?.displayName || userProfile.name).slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#161917]">
                {currentUser?.displayName || userProfile.name}
              </h2>
              {currentUser ? (
                <span className="text-[10px] font-bold bg-[#E7F5EC] text-[#146C45] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Conta Google Vinculada
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  Modo Convidado Local
                </span>
              )}
            </div>
            <p className="text-xs text-[#56615C] mt-0.5">
              {currentUser?.email || 'Nenhuma conta Google conectada atualmente.'}
            </p>
            {isSyncingWithFirestore && (
              <span className="text-[11px] font-semibold text-amber-600 animate-pulse mt-0.5 block">
                Sincronizando dados com Firebase Firestore...
              </span>
            )}
          </div>
        </div>

        <div>
          {currentUser ? (
            <button
              onClick={store.logout}
              className="flex items-center gap-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-xs font-bold transition"
            >
              <LogOut className="w-4 h-4" />
              Sair da Conta Google
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoggingIn ? 'Conectando...' : 'Conectar com Google'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Profile Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#D9DED6]/60 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-[#161917]">Dados do Atleta</h3>
                <p className="text-xs text-[#56615C]">Informações corporais e objetivos de treino</p>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-[#F7F7F2] hover:bg-gray-200 border border-[#D9DED6] text-[#161917] px-3.5 py-1.5 rounded-xl text-xs font-bold transition"
              >
                {isEditing ? 'Cancelar' : 'Editar Dados'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-[#56615C] uppercase mb-1">Nome de Exibição</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#56615C] uppercase mb-1">Experiência</label>
                    <input
                      type="text"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-[#56615C] uppercase mb-1">Peso Atual (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#56615C] uppercase mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={(e) => setHeightCm(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#56615C] uppercase mb-1">Objetivo Principal</label>
                    <input
                      type="text"
                      value={mainGoal}
                      onChange={(e) => setMainGoal(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#56615C] uppercase mb-1">Bio</label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D9DED6] text-sm focus:outline-none focus:border-[#146C5F]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-[#146C5F] hover:bg-[#0f5449] text-white px-5 py-2 rounded-xl font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6]/70">
                  <span className="text-[#56615C] font-semibold block text-[10px] uppercase">Experiência</span>
                  <span className="font-bold text-[#161917] mt-0.5 block">{userProfile.experience}</span>
                </div>
                <div className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6]/70">
                  <span className="text-[#56615C] font-semibold block text-[10px] uppercase">Peso</span>
                  <span className="font-bold text-[#161917] mt-0.5 block">{userProfile.weightKg} kg</span>
                </div>
                <div className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6]/70">
                  <span className="text-[#56615C] font-semibold block text-[10px] uppercase">Altura</span>
                  <span className="font-bold text-[#161917] mt-0.5 block">{userProfile.heightCm} cm</span>
                </div>
                <div className="bg-[#F7F7F2] p-3 rounded-xl border border-[#D9DED6]/70">
                  <span className="text-[#56615C] font-semibold block text-[10px] uppercase">Foco Principal</span>
                  <span className="font-bold text-[#161917] mt-0.5 block">{userProfile.mainGoal}</span>
                </div>
              </div>
            )}
          </div>

          {/* Export & Data Management */}
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-base text-[#161917] flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#146C5F]" />
                Exportação de Dados & Relatórios
              </h3>
              <p className="text-xs text-[#56615C]">
                Seus dados pertencem a você. Exporte o backup estruturado ou gere o relatório completo de progresso.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportBackup}
                className="p-4 rounded-xl border border-[#D9DED6] hover:border-[#146C5F] hover:bg-emerald-50/30 text-left transition flex items-center gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-lg bg-[#E7F5EC] text-[#146C45] flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#161917]">Baixar Backup JSON</div>
                  <div className="text-[11px] text-[#56615C]">Todos os treinos, séries e métricas</div>
                </div>
              </button>

              <button
                onClick={() => setIsReportOpen(true)}
                className="p-4 rounded-xl border border-[#D9DED6] hover:border-[#146C5F] hover:bg-emerald-50/30 text-left transition flex items-center gap-3 shadow-xs"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-[#161917]">Relatório Consolidado</div>
                  <div className="text-[11px] text-[#56615C]">Visualizar resumo analítico</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Architecture Status (1 col) */}
        <div className="space-y-6">
          {/* Cloud Database Status */}
          <div className="bg-[#E7F5EC] rounded-2xl p-5 border border-[#8BC6A3] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#146C45] font-black">
              <Cloud className="w-4 h-4" />
              Firebase Firestore Integrado
            </div>
            <p className="text-[#56615C] text-[11px] leading-relaxed">
              Base de dados NoSQL corporativa provisionada com isolamento de dados por usuário, autenticação segura Google e sincronização em tempo real.
            </p>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
            <h3 className="font-black text-base text-[#161917] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#146C5F]" />
              Preferências
            </h3>

            <div className="space-y-3 text-xs">
              {[
                { key: 'workoutReminders', label: 'Lembretes de Treino', desc: 'Alertas para manter sua rotina nos dias marcados' },
                { key: 'restTimerAlerts', label: 'Cronômetro de Descanso', desc: 'Sinal sonoro e visual ao fim do descanso' },
                { key: 'hydrationAlerts', label: 'Alertas de Hidratação', desc: 'Lembretes regulares para beber água' },
                { key: 'weeklyReport', label: 'Resumo Semanal', desc: 'Estatísticas de volume e consistência' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="pr-2">
                    <span className="font-bold text-[#161917] block">{item.label}</span>
                    <span className="text-[10px] text-[#56615C]">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notificationPrefs as any)[item.key]}
                    onChange={(e) =>
                      store.updateNotificationPrefs({
                        [item.key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#146C5F] rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Consolidated Report */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D9DED6] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D9DED6] pb-3">
              <div>
                <h3 className="font-black text-lg text-[#161917]">Relatório Consolidado de Treino</h3>
                <span className="text-xs text-[#56615C]">ForgeFlow 2.0 • Atleta: {userProfile.name}</span>
              </div>
              <button onClick={() => setIsReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#F7F7F2] p-4 rounded-xl border border-[#D9DED6] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#56615C]">Treinos Realizados:</span>
                  <span className="font-black text-[#161917]">{store.history.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#56615C]">Volume Total Levantado:</span>
                  <span className="font-black text-[#146C5F]">
                    {store.history.reduce((a, b) => a + b.totalVolumeKg, 0).toLocaleString('pt-BR')} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#56615C]">Recordes Pessoais Ativos:</span>
                  <span className="font-black text-[#161917]">{store.prs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#56615C]">Metas em Andamento:</span>
                  <span className="font-black text-[#161917]">{store.goals.length}</span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-[#161917] mb-2 uppercase text-[10px] tracking-wider">
                  Recordes Recentes (PRs)
                </h4>
                <ul className="space-y-1.5">
                  {store.prs.map((pr) => (
                    <li key={pr.id} className="flex justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="font-semibold text-[#161917]">{pr.exerciseName}</span>
                      <span className="font-black text-[#146C5F]">{pr.value} {pr.unit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#D9DED6]">
              <button
                onClick={() => setIsReportOpen(false)}
                className="bg-[#146C5F] text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
