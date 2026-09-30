import { useState } from 'react';
import { Plus, Search, Star } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { useNavigation } from '../navigation/Navigator';
import {
  CustomExerciseSheet,
  ExerciseRow,
  ExerciseSearchBar,
  useExerciseFilter,
} from '../features/ExercisePicker';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import { StackHeader } from '../ui/Layout';
import { cx } from '../ui/core';

export function LibraryScreen() {
  const { allExercises, favorites } = useAppStore();
  const { pop, push } = useNavigation();
  const { query, setQuery, filter, setFilter, filtered } = useExerciseFilter(
    allExercises,
    favorites,
  );
  const [creating, setCreating] = useState(false);

  return (
    <>
      <StackHeader
        title="Exercícios"
        onBack={pop}
        right={
          <IconButton
            icon={Plus}
            label="Criar exercício"
            onClick={() => setCreating(true)}
          />
        }
      />
      <div className="app-column">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 border-b border-line bg-canvas/95 px-4 pt-3 pb-3 backdrop-blur-md">
          <ExerciseSearchBar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
          />
        </div>
        <p className="text-footnote px-4 pt-3 text-ink-3" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'exercício' : 'exercícios'}
        </p>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum exercício encontrado"
            message="Tente outro termo ou crie um exercício personalizado."
            action={
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() => setCreating(true)}
              >
                Criar exercício
              </Button>
            }
          />
        ) : (
          <ul className="px-2 pt-1" role="list">
            {filtered.map((exercise) => {
              const favorite = favorites.includes(exercise.id);
              return (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  onPress={() =>
                    push({ name: 'exercise', exerciseId: exercise.id })
                  }
                  trailing={
                    <IconButton
                      icon={Star}
                      label={
                        favorite
                          ? `Remover ${exercise.name} dos favoritos`
                          : `Favoritar ${exercise.name}`
                      }
                      aria-pressed={favorite}
                      onClick={() => actions.toggleFavorite(exercise.id)}
                      className={cx(
                        favorite
                          ? '[&_svg]:fill-record [&_svg]:text-record'
                          : 'text-ink-3',
                      )}
                    />
                  }
                />
              );
            })}
          </ul>
        )}
      </div>
      <CustomExerciseSheet
        open={creating}
        initialName={query}
        onClose={() => setCreating(false)}
        onCreated={(exercise) =>
          push({ name: 'exercise', exerciseId: exercise.id })
        }
      />
    </>
  );
}
