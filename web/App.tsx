import { useState } from 'react';
import { useAppStore, type FinishResult } from './store';
import {
  NavigationProvider,
  StackHost,
  useNavigation,
  type Route,
} from './navigation/Navigator';
import { BottomNav, DOCK_GAP, NAV_HEIGHT } from './navigation/BottomNav';
import { ConfirmProvider, ToastProvider } from './ui/Overlay';
import { ActiveWorkoutScreen } from './features/ActiveWorkout';
import { RestTimerWatcher } from './features/RestTimer';
import { SyncWatcher } from './features/StatusBits';
import { LoginErrorWatcher } from './features/GoogleSignIn';
import { WorkoutSummary } from './features/WorkoutSummary';
import { tutorial, useTutorialOpen } from './lib/tutorial';
import { SplashScreen } from './screens/SplashScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { HydrationScreen } from './screens/HydrationScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { SocialScreen } from './screens/SocialScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { EditProfileScreen } from './screens/EditProfileScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { GymDetailScreen, GymsScreen } from './screens/GymsScreen';
import { ExerciseDetailScreen } from './screens/ExerciseDetailScreen';
import { WorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { RoutineEditorScreen } from './screens/RoutineEditorScreen';
import { ImportScreen } from './screens/ImportScreen';
import { MeasurementsScreen } from './screens/MeasurementsScreen';

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
  const tutorialOpen = useTutorialOpen();
  if (isAuthLoading) return <SplashScreen />;
  if (!currentUser && !hasOnboarded)
    return (
      <>
        <WelcomeScreen />
        <LoginErrorWatcher />
      </>
    );
  return (
    <>
      <LoginErrorWatcher />
      <MainShell />
      {tutorialOpen && <TutorialScreen onDone={tutorial.finish} />}
    </>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
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
      return <HistoryScreen gymFilter={route.gymFilter} />;
    case 'gyms':
      return <GymsScreen />;
    case 'gym':
      return <GymDetailScreen gymId={route.gymId} />;
    case 'import':
      return <ImportScreen />;
    case 'measurements':
      return <MeasurementsScreen />;
    case 'exercise':
      return <ExerciseDetailScreen exerciseId={route.exerciseId} />;
    case 'workout':
      return <WorkoutDetailScreen workoutId={route.workoutId} />;
    case 'routine':
      return (
        <RoutineEditorScreen
          templateId={route.templateId}
          folderId={route.folderId}
        />
      );
  }
}

/** Room for the floating dock, so the last row of every screen stays reachable. */
const BOTTOM_INSET = `calc(${NAV_HEIGHT + DOCK_GAP + 24}px + env(safe-area-inset-bottom))`;

function MainShell() {
  const { tab, push } = useNavigation();
  const [summary, setSummary] = useState<FinishResult | null>(null);

  return (
    <div
      className="min-h-dvh animate-fade-in"
      style={{ paddingBottom: BOTTOM_INSET }}
    >
      <main>
        {tab === 'home' && <HomeScreen />}
        {tab === 'routines' && <RoutinesScreen />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      <StackHost render={renderRoute} bottomInset={BOTTOM_INSET} />
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
