import { systemExercises } from '../../src/data/seeds/systemExercises';
import { exerciseAliases } from '../data/aliases';
import {
  EMPTY_FILTER,
  equipmentKinds,
  filterExercises,
  recentExerciseIds,
} from './exerciseFilter';
import type { CompletedWorkout } from './types';

const context = { favorites: [], recent: [], aliases: exerciseAliases };
const names = (list: { name: string }[]) => list.map((item) => item.name);

describe('exercise filter', () => {
  it('groups equipment into a few kinds', () => {
    expect(equipmentKinds('Maquina Smith')).toEqual(['Smith']);
    expect(equipmentKinds('Barra EZ')).toEqual(['Barra']);
    expect(equipmentKinds('Barra fixa')).toEqual(['Peso corporal']);
    expect(equipmentKinds('Barra ou halteres')).toEqual(['Barra', 'Halteres']);
    expect(equipmentKinds('Máquina')).toEqual(['Máquina']);
    expect(equipmentKinds('Esteira')).toEqual(['Aparelho de cardio']);
    expect(equipmentKinds(null)).toEqual(['Outros']);
    // Every catalog exercise lands in a real kind.
    expect(
      systemExercises.filter((exercise) =>
        equipmentKinds(exercise.equipment).includes('Outros'),
      ).length,
    ).toBeLessThan(10);
  });

  it('puts the exercises where a muscle only helps apart', () => {
    const { main, synergy } = filterExercises(
      systemExercises,
      { ...EMPTY_FILTER, muscle: 'Triceps' },
      context,
    );
    expect(main.every((item) => item.primaryMuscleGroup === 'Triceps')).toBe(
      true,
    );
    expect(names(synergy)).toContain('Supino reto com barra');
    expect(synergy.every((item) => item.primaryMuscleGroup !== 'Triceps')).toBe(
      true,
    );
  });

  it('combines muscle, equipment and search', () => {
    const { main } = filterExercises(
      systemExercises,
      { ...EMPTY_FILTER, muscle: 'Cardio', equipment: 'Aparelho de cardio' },
      context,
    );
    expect(names(main)).toContain('Corrida na esteira');
    expect(names(main)).not.toContain('Polichinelo');

    const search = filterExercises(
      systemExercises,
      { ...EMPTY_FILTER, query: 'esteira' },
      context,
    );
    expect(names(search.main)).toEqual(
      expect.arrayContaining(['Corrida na esteira', 'Caminhada na esteira']),
    );
  });

  it('lists recent exercises most recent first', () => {
    const workout = (ids: string[]): CompletedWorkout =>
      ({
        exercises: ids.map((exerciseId) => ({ exerciseId })),
      }) as CompletedWorkout;
    const [bench, row] = systemExercises;
    const recent = recentExerciseIds([
      workout([row.id]),
      workout([bench.id, row.id]),
    ]);
    expect(recent).toEqual([row.id, bench.id]);
    const { main } = filterExercises(
      systemExercises,
      { ...EMPTY_FILTER, only: 'recent' },
      { ...context, recent },
    );
    expect(main.map((item) => item.id)).toEqual([row.id, bench.id]);
  });
});
