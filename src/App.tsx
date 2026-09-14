import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppServicesProvider } from './composition/AppServicesProvider';
import { AppNavigator } from './presentation/navigation/AppNavigator';
import { navigationTheme } from './presentation/theme/navigationTheme';

export default function App() {
  return (
    <AppServicesProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppServicesProvider>
  );
}
