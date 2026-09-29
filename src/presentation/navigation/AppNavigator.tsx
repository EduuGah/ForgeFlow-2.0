import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChartLine, Dumbbell, Home, Target, User } from 'lucide-react-native';

import { GoalsScreen } from '../screens/GoalsScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { HydrationScreen } from '../screens/HydrationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';
import { colors } from '../theme/tokens';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen
        component={HomeScreen}
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} strokeWidth={2.2} />
          ),
          title: 'Home',
        }}
      />
      <Tab.Screen
        component={ReportsScreen}
        name="Reports"
        options={{
          tabBarButton: () => null,
          title: 'Relatorios',
        }}
      />
      <Tab.Screen
        component={WorkoutsScreen}
        name="Workouts"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size} strokeWidth={2.2} />
          ),
          title: 'Treinos',
        }}
      />
      <Tab.Screen
        component={ProgressScreen}
        name="Progress"
        options={{
          tabBarIcon: ({ color, size }) => (
            <ChartLine color={color} size={size} strokeWidth={2.2} />
          ),
          title: 'Progresso',
        }}
      />
      <Tab.Screen
        component={GoalsScreen}
        name="Goals"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Target color={color} size={size} strokeWidth={2.2} />
          ),
          title: 'Metas',
        }}
      />
      <Tab.Screen
        component={ProfileScreen}
        name="Profile"
        options={{
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} strokeWidth={2.2} />
          ),
          title: 'Perfil',
        }}
      />
      <Tab.Screen
        component={FriendsScreen}
        name="Friends"
        options={{
          tabBarButton: () => null,
          title: 'Amigos',
        }}
      />
      <Tab.Screen
        component={HydrationScreen}
        name="Hydration"
        options={{
          tabBarButton: () => null,
          title: 'Hidratacao',
        }}
      />
      <Tab.Screen
        component={NutritionScreen}
        name="Nutrition"
        options={{
          tabBarButton: () => null,
          title: 'Nutricao',
        }}
      />
    </Tab.Navigator>
  );
}
