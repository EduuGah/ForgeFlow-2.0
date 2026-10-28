import { useMemo } from 'react';
import { useAppStore } from '../store';
import { totalXp } from '../lib/achievements';
import { formatNumber } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import { LevelCard, MedalWall } from '../features/Medals';
import { Card, StackHeader } from '../ui/Layout';

/** Level, how XP is earned and every medal by category. */
export function AchievementsScreen() {
  const { pop } = useNavigation();
  const { history, goals } = useAppStore();
  const xp = useMemo(() => totalXp(history, goals), [history, goals]);
  return (
    <>
      <StackHeader title="Conquistas" onBack={pop} />
      <div className="app-column space-y-4 px-4 pt-4 pb-8">
        <Card className="space-y-3 p-4">
          <LevelCard />
          <p className="text-footnote text-ink-2">
            {formatNumber(xp, 0)} XP no total. Cada treino vale 50 XP, mais 2
            por série e 30 por recorde; cada meta concluída, 100.
          </p>
        </Card>
        <Card className="p-4">
          <MedalWall />
        </Card>
      </div>
    </>
  );
}
