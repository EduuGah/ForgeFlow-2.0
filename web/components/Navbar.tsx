import React, { useState } from 'react';
import {
  Home,
  Dumbbell,
  TrendingUp,
  Target,
  Droplet,
  Utensils,
  Users,
  User,
  Timer,
  Play,
  Pause,
  X,
  LogOut,
  Cloud,
} from 'lucide-react';
import { useAppStore } from '../store';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenActiveWorkout: () => void;
}

export function Navbar({ currentTab, onSelectTab, onOpenActiveWorkout }: NavbarProps) {
  const store = useAppStore();
  const { activeWorkout, restTimer, currentUser, isSyncingWithFirestore } = store;
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navItems = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'workouts', label: 'Treinos', icon: Dumbbell },
    { id: 'progress', label: 'Progresso', icon: TrendingUp },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'hydration', label: 'Hidratação', icon: Droplet },
    { id: 'nutrition', label: 'Nutrição', icon: Utensils },
    { id: 'social', label: 'Comunidade', icon: Users },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#D9DED6] shadow-xs">
      {/* Top Banner if Active Workout exists */}
      {activeWorkout && (
        <div className="bg-[#146C5F] text-white px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
            <span className="font-semibold">Treino em Andamento:</span>
            <span className="truncate max-w-xs">{activeWorkout.name}</span>
          </div>
          <button
            onClick={onOpenActiveWorkout}
            className="bg-white text-[#146C5F] hover:bg-emerald-50 px-3 py-1 rounded-md text-xs font-bold transition shadow-xs"
          >
            Continuar Treino →
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onSelectTab('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-[#146C5F] flex items-center justify-center text-white shadow-xs">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-[#161917] flex items-center gap-1.5">
                ForgeFlow <span className="text-xs bg-[#146C5F] text-white px-1.5 py-0.5 rounded font-bold">2.0</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-[#56615C] font-medium leading-none">
                <span>Local-first</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-[#146C5F] font-bold">
                  <Cloud className="w-3 h-3" />
                  Firebase
                </span>
                {isSyncingWithFirestore && (
                  <span className="text-[10px] text-amber-600 animate-pulse font-semibold">(sincronizando...)</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[#146C5F] text-white shadow-xs'
                      : 'text-[#56615C] hover:text-[#161917] hover:bg-[#F7F7F2]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action / Rest Timer Pill / Auth Button */}
          <div className="flex items-center gap-3">
            {restTimer.isActive && (
              <div className="flex items-center gap-2 bg-[#E7F5EC] border border-[#8BC6A3] text-[#146C45] px-3 py-1.5 rounded-full text-xs font-bold">
                <Timer className="w-3.5 h-3.5 animate-spin" />
                <span>Descanso: {formatTimer(restTimer.remainingSeconds)}</span>
                <button
                  onClick={store.pauseResumeRestTimer}
                  title={restTimer.isPaused ? 'Continuar' : 'Pausar'}
                  className="hover:opacity-75 p-0.5"
                >
                  {restTimer.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => store.addRestTime(30)}
                  title="+30 segundos"
                  className="hover:opacity-75 text-[10px] bg-white border border-[#8BC6A3] px-1 py-0.5 rounded"
                >
                  +30s
                </button>
                <button
                  onClick={store.stopRestTimer}
                  title="Fechar cronômetro"
                  className="hover:opacity-75 p-0.5 text-gray-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Google Authentication Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectTab('profile')}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition"
                  title="Ver perfil"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Usuário'}
                      className="w-8 h-8 rounded-full border border-[#D9DED6] object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#146C5F] text-white flex items-center justify-center font-bold text-xs">
                      {(currentUser.displayName || 'U').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#161917] hidden sm:inline max-w-[100px] truncate">
                    {currentUser.displayName || 'Conectado'}
                  </span>
                </button>
                <button
                  onClick={store.logout}
                  title="Sair da conta"
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#161917] border border-[#D9DED6] px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
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
                <span>{isLoggingIn ? 'Entrando...' : 'Entrar com Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#D9DED6] py-2 px-3 flex justify-around items-center shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
                isActive ? 'text-[#146C5F]' : 'text-[#56615C]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
            currentTab === 'profile' || currentTab === 'social' ? 'text-[#146C5F]' : 'text-[#56615C]'
          }`}
        >
          <User className="w-5 h-5" />
          Mais
        </button>
      </div>
    </header>
  );
}
