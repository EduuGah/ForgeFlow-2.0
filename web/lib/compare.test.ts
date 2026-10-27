import { compareBests } from './friends';
import type { PersonalRecordItem } from './types';

const record = (
  exerciseId: string,
  value: number,
  type: PersonalRecordItem['type'] = 'weight',
): PersonalRecordItem => ({
  id: `pr-${exerciseId}-${type}-${value}`,
  exerciseId,
  exerciseName: `Exercício ${exerciseId}`,
  type,
  value,
  unit: 'kg',
  date: '2026-10-01',
});

describe('compareBests', () => {
  it('pairs the heaviest loads of exercises both have, top first', () => {
    const result = compareBests(
      [
        record('supino', 60),
        record('supino', 70),
        record('agacho', 100),
        record('rosca', 20),
        record('supino', 90, 'volume'),
      ],
      [record('supino', 80), record('agacho', 90), record('remada', 70)],
    );
    expect(result.map((row) => [row.exerciseId, row.mine, row.theirs])).toEqual(
      [
        ['agacho', 100, 90],
        ['supino', 70, 80],
      ],
    );
  });

  it('is empty when nothing is shared and respects the limit', () => {
    expect(compareBests([record('a', 10)], [record('b', 10)])).toEqual([]);
    const many = Array.from({ length: 12 }, (_, i) => record(`e${i}`, i + 1));
    expect(compareBests(many, many, 5)).toHaveLength(5);
  });
});
