import { useMemo } from 'react';
import { History } from 'lucide-react';
import { useAppStore } from '../store';
import type { CompletedWorkout } from '../lib/types';
import { formatDurationMinutes, formatWeight, pluralize } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import { WorkoutCard } from '../features/WorkoutCard';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { StackHeader } from '../ui/Layout';

export function HistoryScreen() {
  const { history } = useAppStore();
  const { pop, push, selectTab } = useNavigation();

  const months = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      workouts: { workout: CompletedWorkout; ordinal: number }[];
    }[] = [];
    history.forEach((workout, index) => {
      const date = new Date(workout.completedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      let group = groups.at(-1);
      if (!group || group.key !== key) {
        group = {
          key,
          label: date.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
          }),
          workouts: [],
        };
        groups.push(group);
      }
      group.workouts.push({ workout, ordinal: history.length - index });
    });
    return groups;
  }, [history]);

  return (
    <>
      <StackHeader title="Diário de treinos" onBack={pop} />
      <div className="app-column">
        {history.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhum treino concluído"
            message="Seus treinos aparecem aqui assim que você concluir o primeiro. Para trazer treinos de outro app, use Configurações › Importar histórico."
            action={
              <Button onClick={() => selectTab('routines')}>Ver rotinas</Button>
            }
            className="pt-20"
          />
        ) : (
          months.map((month) => {
            const minutes = month.workouts.reduce(
              (total, { workout }) => total + workout.durationMinutes,
              0,
            );
            const volume = month.workouts.reduce(
              (total, { workout }) => total + workout.totalVolumeKg,
              0,
            );
            return (
              <section key={month.key} aria-label={month.label}>
                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-baseline justify-between gap-3 bg-canvas/95 px-4 pt-5 pb-2 backdrop-blur-md">
                  <h2 className="text-headline font-semibold first-letter:uppercase">
                    {month.label}
                  </h2>
                  <p className="text-footnote text-ink-2 tabular">
                    {pluralize(month.workouts.length, 'treino', 'treinos')} ·{' '}
                    {formatDurationMinutes(minutes)} · {formatWeight(volume)} kg
                  </p>
                </div>
                <ul className="space-y-2 px-4" role="list">
                  {month.workouts.map(({ workout, ordinal }) => (
                    <li key={workout.id}>
                      <WorkoutCard
                        workout={workout}
                        ordinal={ordinal}
                        onOpen={() =>
                          push({ name: 'workout', workoutId: workout.id })
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
