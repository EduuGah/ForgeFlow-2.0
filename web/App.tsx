import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ActiveWorkoutModal } from './components/ActiveWorkoutModal';
import { HomeScreen } from './screens/HomeScreen';
import { WorkoutsScreen } from './screens/WorkoutsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { HydrationScreen } from './screens/HydrationScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { SocialScreen } from './screens/SocialScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { useAppStore } from './store';

export default function App() {
  const store = useAppStore();
  const [currentTab, setCurrentTab] = useState('home');
  const [isActiveWorkoutOpen, setIsActiveWorkoutOpen] = useState(false);

  // Background rest timer ticker
  useEffect(() => {
    const interval = setInterval(() => {
      store.tickRestTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [store]);

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#161917] flex flex-col font-sans selection:bg-[#146C5F] selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenActiveWorkout={() => setIsActiveWorkoutOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <HomeScreen
            onNavigate={setCurrentTab}
            onOpenActiveWorkout={() => setIsActiveWorkoutOpen(true)}
          />
        )}
        {currentTab === 'workouts' && (
          <WorkoutsScreen
            onOpenActiveWorkout={() => setIsActiveWorkoutOpen(true)}
          />
        )}
        {currentTab === 'progress' && <ProgressScreen />}
        {currentTab === 'goals' && <GoalsScreen />}
        {currentTab === 'hydration' && <HydrationScreen />}
        {currentTab === 'nutrition' && <NutritionScreen />}
        {currentTab === 'social' && <SocialScreen />}
        {currentTab === 'profile' && <ProfileScreen />}
      </main>

      {/* Active Workout Drawer/Modal */}
      <ActiveWorkoutModal
        isOpen={isActiveWorkoutOpen}
        onClose={() => setIsActiveWorkoutOpen(false)}
      />
    </div>
  );
}
