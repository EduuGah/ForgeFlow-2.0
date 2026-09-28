import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppRuntime } from './composition/AppRuntime';
import { NotificationResponseHandler } from './presentation/components/NotificationResponseHandler';
import { AppNavigator } from './presentation/navigation/AppNavigator';
import type { RootTabParamList } from './presentation/navigation/types';
import { navigationTheme } from './presentation/theme/navigationTheme';

const linking = {
  config: {
    screens: {
      Goals: 'goals',
      Hydration: 'hydration',
      Home: 'home',
      Nutrition: 'nutrition',
      Profile: 'profile',
      Progress: 'progress',
      Reports: 'reports',
      Workouts: 'workouts',
    },
  },
  prefixes: ['forgeflow://'],
} satisfies import('@react-navigation/native').LinkingOptions<RootTabParamList>;

export default function App() {
  return (
    <AppRuntime>
      <AppContent />
    </AppRuntime>
  );
}

function AppContent() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <StatusBar style="dark" />
        <NotificationResponseHandler />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
