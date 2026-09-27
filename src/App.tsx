import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppServicesProvider } from './composition/AppServicesProvider';
import { NotificationResponseHandler } from './presentation/components/NotificationResponseHandler';
import { AppNavigator } from './presentation/navigation/AppNavigator';
import type { RootTabParamList } from './presentation/navigation/types';
import { navigationTheme } from './presentation/theme/navigationTheme';

const linking = {
  config: {
    screens: {
      Goals: 'goals',
      Home: 'home',
      Nutrition: 'nutrition',
      Profile: 'profile',
      Progress: 'progress',
      Workouts: 'workouts',
    },
  },
  prefixes: ['forgeflow://'],
} satisfies import('@react-navigation/native').LinkingOptions<RootTabParamList>;

export default function App() {
  return (
    <AppServicesProvider>
      <SafeAreaProvider>
        <NavigationContainer linking={linking} theme={navigationTheme}>
          <StatusBar style="dark" />
          <NotificationResponseHandler />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppServicesProvider>
  );
}
