import { useState } from 'react';
import { useAppStore, type FinishResult } from './store';
import {
  NavigationProvider,
  StackHost,
  useNavigation,
  type Route,
} from './navigation/Navigator';
import { BottomNav, NAV_HEIGHT } from './navigation/BottomNav';
import { ConfirmProvider, ToastProvider } from './ui/Overlay';
import { ActiveWorkoutScreen } from './features/ActiveWorkout';
import { RestTimerWatcher } from './features/RestTimer';
import {
  MINI_PLAYER_HEIGHT,
  MiniPlayer,
  SyncWatcher,
} from './features/StatusBits';
import { WorkoutSummary } from './features/WorkoutSummary';
import { SplashScreen } from './screens/SplashScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TrainScreen } from './screens/TrainScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { StatsScreen } from './screens/StatsScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { HydrationScreen } from './screens/HydrationScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { SocialScreen } from './screens/SocialScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ExerciseDetailScreen } from './screens/ExerciseDetailScreen';
import { WorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { RoutineEditorScreen } from './screens/RoutineEditorScreen';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <NavigationProvider>
          <AppGate />
        </NavigationProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AppGate() {
  const { isAuthLoading, currentUser, hasOnboarded } = useAppStore();
  if (isAuthLoading) return <SplashScreen />;
  if (!currentUser && !hasOnboarded) return <WelcomeScreen />;
  return <MainShell />;
}

function renderRoute(route: Route) {
  switch (route.name) {
    case 'stats':
      return <StatsScreen />;
    case 'goals':
      return <GoalsScreen />;
    case 'hydration':
      return <HydrationScreen />;
    case 'nutrition':
      return <NutritionScreen />;
    case 'social':
      return <SocialScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'editProfile':
      return <EditProfileScreen />;
    case 'library':
      return <LibraryScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'exercise':
      return <ExerciseDetailScreen exerciseId={route.exerciseId} />;
    case 'workout':
      return <WorkoutDetailScreen workoutId={route.workoutId} />;
    case 'routine':
      return <RoutineEditorScreen templateId={route.templateId} />;
  }
}

function MainShell() {
  const { tab, push, workoutOpen } = useNavigation();
  const { activeWorkout } = useAppStore();
  const [summary, setSummary] = useState<FinishResult | null>(null);

  const miniPlayer = activeWorkout && !workoutOpen ? MINI_PLAYER_HEIGHT : 0;
  const bottomInset = `calc(${NAV_HEIGHT + miniPlayer + 24}px + env(safe-area-inset-bottom))`;

  return (
    <div
      className="min-h-dvh animate-fade-in"
      style={{ paddingBottom: bottomInset }}
    >
      <main>
        {tab === 'home' && <HomeScreen />}
        {tab === 'train' && <TrainScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      <StackHost render={renderRoute} bottomInset={bottomInset} />
      <MiniPlayer />
      <BottomNav />
      <ActiveWorkoutScreen onFinished={setSummary} />
      <WorkoutSummary
        result={summary}
        onClose={() => setSummary(null)}
        onOpenWorkout={(workoutId) => {
          setSummary(null);
          push({ name: 'workout', workoutId });
        }}
      />
      <RestTimerWatcher />
      <SyncWatcher />
    </div>
  );
}
