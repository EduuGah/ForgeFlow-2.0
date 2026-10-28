import { useEffect, useState } from 'react';
import { useAppStore, type FinishResult } from './store';
import {
  NavigationProvider,
  StackHost,
  useNavigation,
  type Route,
} from './navigation/Navigator';
import { BottomNav, DOCK_GAP, NAV_HEIGHT } from './navigation/BottomNav';
import { ConfirmProvider, ToastProvider, useToast } from './ui/Overlay';
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
import { FriendScreen } from './screens/FriendScreen';
import { ChatScreen } from './screens/ChatScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { takeDeepLink, useDeepLink } from './features/deepLink';
import { useOpenLink } from './features/useOpenLink';
import { notify } from './features/notificationFeed';
import { refreshPushRegistration } from './features/pushRegistration';
import { refreshWorkoutNotification } from './features/workoutNotification';
import { useLiveWorkoutPublisher } from './features/liveWorkouts';
import { describeRecord } from './lib/training';
import { clearInvite, peekInvite } from './features/invite';
import {
  chatOpenWith,
  friendById,
  onIncomingMessage,
  resumeFriends,
} from './features/useFriends';
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
      return <SocialScreen invite={route.invite} />;
    case 'friend':
      return <FriendScreen userId={route.userId} />;
    case 'chat':
      return <ChatScreen userId={route.userId} />;
    case 'notifications':
      return <NotificationsScreen />;
    case 'messages':
      return <MessagesScreen />;
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
      <ActiveWorkoutScreen
        onFinished={(result) => {
          notifyWorkoutResult(result);
          setSummary(result);
        }}
      />
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
      <InviteWatcher />
      <MessageWatcher />
      <DeepLinkWatcher />
      <WorkoutNotifier />
      <LivePublisher />
    </div>
  );
}

/** The invite already opened on this page load (guests keep theirs stored). */
let openedInvite: string | null = null;

/**
 * Opens the Community screen for an invite link (/?amigo=...). Without an
 * account it only shows the sign-in prompt and keeps the invite for after the
 * Google redirect.
 */
function InviteWatcher() {
  const { currentUser } = useAppStore();
  const { push } = useNavigation();
  useEffect(() => {
    const invite = peekInvite();
    if (!invite) return;
    if (currentUser) clearInvite();
    else if (openedInvite === invite) return;
    openedInvite = invite;
    push({ name: 'social', invite });
  }, [currentUser, push]);
  return null;
}

/**
 * Signed in: loads friends (which starts listening for chat messages) and
 * announces messages whose conversation is not on screen.
 */
function MessageWatcher() {
  const { currentUser } = useAppStore();
  const { push } = useNavigation();
  const toast = useToast();
  useEffect(() => {
    if (!currentUser) return;
    void resumeFriends();
    refreshPushRegistration();
    return onIncomingMessage((message) => {
      if (chatOpenWith() === message.senderId) return;
      const sender = friendById(message.senderId);
      toast({
        title: `Mensagem de ${sender ? sender.name || `@${sender.username}` : 'um amigo'}`,
        description:
          message.body.length > 90
            ? `${message.body.slice(0, 90)}…`
            : message.body,
        action: {
          label: 'Abrir',
          onPress: () => push({ name: 'chat', userId: message.senderId }),
        },
      });
    });
  }, [currentUser, push, toast]);
  return null;
}

/** Opens what a tapped notification points at (from startup or the worker). */
function DeepLinkWatcher() {
  const link = useDeepLink();
  const open = useOpenLink();
  useEffect(() => {
    if (!link) return;
    // Taken, not just read: the effect may run twice for the same link.
    const next = takeDeepLink();
    if (next) open(next);
  }, [link, open]);
  return null;
}

/** The "workout in progress" notification follows the app going to the background. */
function WorkoutNotifier() {
  const { activeWorkout } = useAppStore();
  useEffect(() => {
    document.addEventListener('visibilitychange', refreshWorkoutNotification);
    return () =>
      document.removeEventListener(
        'visibilitychange',
        refreshWorkoutNotification,
      );
  }, []);
  // Finished or discarded: the notification goes too.
  useEffect(() => {
    if (!activeWorkout) refreshWorkoutNotification();
  }, [activeWorkout]);
  return null;
}

/** Friends see the workout in progress ("Treinando agora"). */
function LivePublisher() {
  useLiveWorkoutPublisher();
  return null;
}

/** Records and goals of a finished workout also go to the bell. */
function notifyWorkoutResult(result: FinishResult) {
  notify([
    ...result.records.map((record) => ({
      id: `record-${record.id}-${result.workout.id}`,
      kind: 'record' as const,
      title: 'Novo recorde pessoal',
      body: describeRecord(record),
    })),
    ...result.goalsReached.map((goal) => ({
      id: `goal-${goal.id}`,
      kind: 'goal' as const,
      title: 'Meta atingida',
      body: goal.title,
    })),
  ]);
}
