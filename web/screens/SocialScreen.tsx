import React, { useState } from 'react';
import { Users, Trophy, Check, UserCheck } from 'lucide-react';
import { useAppStore } from '../store';

export function SocialScreen() {
  const store = useAppStore();
  const [subTab, setSubTab] = useState<'rankings' | 'challenges' | 'friends'>('rankings');

  // Challenges state
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>([
    'ch-volume',
  ]);

  // Friends state
  const [friends, setFriends] = useState([
    { id: 'f-1', name: 'Marina Costa', username: 'marina.costa', status: 'friend', volumeKg: 42300, workouts: 14 },
    { id: 'f-2', name: 'Rafael Santos', username: 'rafa.santos', status: 'friend', volumeKg: 58900, workouts: 18 },
    { id: 'f-3', name: 'Beatriz Lima', username: 'bia.lima', status: 'friend', volumeKg: 31200, workouts: 12 },
    { id: 'f-4', name: 'Lucas Almeida', username: 'lucas.almeida', status: 'pending', volumeKg: 19800, workouts: 8 },
  ]);

  const rankings = [
    { rank: 1, name: 'Rafael Santos', username: 'rafa.santos', volumeKg: 58900, workouts: 18, isCurrentUser: false },
    { rank: 2, name: store.userProfile.name, username: store.userProfile.username, volumeKg: 48500, workouts: 16, isCurrentUser: true },
    { rank: 3, name: 'Marina Costa', username: 'marina.costa', volumeKg: 42300, workouts: 14, isCurrentUser: false },
    { rank: 4, name: 'Beatriz Lima', username: 'bia.lima', volumeKg: 31200, workouts: 12, isCurrentUser: false },
    { rank: 5, name: 'Lucas Almeida', username: 'lucas.almeida', volumeKg: 19800, workouts: 8, isCurrentUser: false },
  ];

  const challenges = [
    {
      id: 'ch-volume',
      title: '30 Dias de Volume',
      desc: 'Acumule o máximo de volume total em 30 dias de treinos consistentes.',
      participantsCount: 142,
      metric: 'Volume Total (kg)',
      endsIn: '18 dias restantes',
    },
    {
      id: 'ch-consistency',
      title: 'Meta 20 Treinos no Mês',
      desc: 'Complete 20 treinos válidos dentro do mês corrente.',
      participantsCount: 98,
      metric: 'Frequência de Treinos',
      endsIn: '22 dias restantes',
    },
    {
      id: 'ch-squat',
      title: 'Desafio do Agachamento Pesado',
      desc: 'Aumente sua carga de trabalho no agachamento livre com segurança.',
      participantsCount: 65,
      metric: 'Carga Máxima (kg)',
      endsIn: '12 dias restantes',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#161917] tracking-tight">
            Comunidade & Desafios
          </h1>
          <p className="text-sm text-[#56615C]">
            Compare seu progresso no ranking, participe de desafios e acompanhe amigos.
          </p>
        </div>

        <div className="flex bg-[#D9DED6]/40 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSubTab('rankings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'rankings'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setSubTab('challenges')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'challenges'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Desafios ({challenges.length})
          </button>
          <button
            onClick={() => setSubTab('friends')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              subTab === 'friends'
                ? 'bg-white text-[#146C5F] shadow-xs'
                : 'text-[#56615C] hover:text-[#161917]'
            }`}
          >
            Amigos ({friends.length})
          </button>
        </div>
      </div>

      {/* ----------------- 1. RANKINGS ----------------- */}
      {subTab === 'rankings' && (
        <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#161917] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking Geral do Mês
              </h2>
              <p className="text-xs text-[#56615C]">Classificação ordenada por volume total levantado</p>
            </div>
            <span className="text-[11px] font-bold text-[#146C5F] bg-[#E7F5EC] px-2.5 py-1 rounded-full">
              Temporada Ativa
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9DED6] text-[10px] font-extrabold uppercase text-[#56615C]">
                  <th className="py-2.5 px-3 w-12 text-center">Pos.</th>
                  <th className="py-2.5 px-3">Atleta</th>
                  <th className="py-2.5 px-3 text-center">Treinos</th>
                  <th className="py-2.5 px-3 text-right">Volume Levantado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rankings.map((athlete) => (
                  <tr
                    key={athlete.rank}
                    className={`transition ${
                      athlete.isCurrentUser
                        ? 'bg-[#E7F5EC]/60 font-bold'
                        : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-black text-sm">
                      {athlete.rank === 1 ? '🥇' : athlete.rank === 2 ? '🥈' : athlete.rank === 3 ? '🥉' : `#${athlete.rank}`}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#146C5F]/10 flex items-center justify-center font-bold text-[#146C5F] text-[10px]">
                          {athlete.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#161917] flex items-center gap-1.5">
                            {athlete.name}
                            {athlete.isCurrentUser && (
                              <span className="text-[10px] bg-[#146C5F] text-white px-1.5 py-0.2 rounded font-semibold">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#56615C]">@{athlete.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-[#161917]">
                      {athlete.workouts}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm text-[#146C5F]">
                      {athlete.volumeKg.toLocaleString('pt-BR')} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- 2. CHALLENGES ----------------- */}
      {subTab === 'challenges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {challenges.map((ch) => {
            const isJoined = joinedChallenges.includes(ch.id);
            return (
              <div
                key={ch.id}
                className="bg-white rounded-2xl p-5 border border-[#D9DED6] shadow-xs flex flex-col justify-between hover:border-[#146C5F]/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      {ch.metric}
                    </span>
                    <span className="text-[11px] text-[#56615C] font-semibold">{ch.endsIn}</span>
                  </div>

                  <h3 className="font-extrabold text-base text-[#161917] mb-1">{ch.title}</h3>
                  <p className="text-xs text-[#56615C] mb-4">{ch.desc}</p>

                  <div className="text-xs text-[#56615C] font-medium mb-4 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#146C5F]" />
                    <span>{ch.participantsCount} atletas participando</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#D9DED6] flex justify-end">
                  <button
                    onClick={() => {
                      if (isJoined) {
                        setJoinedChallenges((prev) => prev.filter((id) => id !== ch.id));
                      } else {
                        setJoinedChallenges((prev) => [...prev, ch.id]);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isJoined
                        ? 'bg-emerald-50 text-[#146C45] border border-[#8BC6A3]'
                        : 'bg-[#146C5F] hover:bg-[#0f5449] text-white shadow-xs'
                    }`}
                  >
                    {isJoined ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Inscrito
                      </>
                    ) : (
                      'Participar do Desafio'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- 3. FRIENDS ----------------- */}
      {subTab === 'friends' && (
        <div className="bg-white rounded-2xl p-6 border border-[#D9DED6] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-[#161917]">Círculo de Amigos</h2>
              <p className="text-xs text-[#56615C]">Conecte-se com parceiros de treino e acompanhe a evolução mútua</p>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {friends.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#146C5F]/10 flex items-center justify-center font-bold text-[#146C5F] text-xs">
                    {f.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#161917]">{f.name}</h3>
                    <p className="text-xs text-[#56615C]">
                      @{f.username} • {f.volumeKg.toLocaleString('pt-BR')} kg levantados
                    </p>
                  </div>
                </div>

                <div>
                  {f.status === 'friend' ? (
                    <span className="text-xs font-bold text-[#146C45] bg-[#E7F5EC] px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Amigo
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setFriends((prev) =>
                          prev.map((item) => (item.id === f.id ? { ...item, status: 'friend' } : item))
                        );
                      }}
                      className="text-xs font-bold bg-[#146C5F] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f5449] transition"
                    >
                      Aceitar Solicitação
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
