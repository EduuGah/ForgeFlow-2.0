import { reconcileCollection, type SyncRow } from './sync';

interface Goal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
}

const goal = (id: string, currentValue = 0): Goal => ({
  id,
  title: `Meta ${id}`,
  currentValue,
  targetValue: 10,
});

const row = (item: Goal): SyncRow => ({
  id: item.id,
  data: { ...item, userId: 'u1' },
});

const none = new Set<string>();

describe('reconcileCollection', () => {
  it('takes the cloud version and uploads what only exists here', () => {
    const result = reconcileCollection(
      [row(goal('a', 5))],
      [goal('a', 1), goal('b')],
      none,
      none,
    );
    expect(result.merged.map((item) => [item.id, item.currentValue])).toEqual([
      ['a', 5],
      ['b', 0],
    ]);
    expect(result.upload.map((item) => item.id)).toEqual(['b']);
    expect(result.deleteAgain).toEqual([]);
  });

  it('keeps and re-uploads local changes the server never confirmed', () => {
    const result = reconcileCollection(
      [row(goal('a', 1))],
      [goal('a', 7)],
      none,
      new Set(['a']),
    );
    expect(result.merged).toEqual([goal('a', 7)]);
    expect(result.upload).toEqual([goal('a', 7)]);
  });

  it('keeps local deletions and sends them again', () => {
    const result = reconcileCollection(
      [row(goal('a')), row(goal('b'))],
      [goal('b')],
      new Set(['a']),
      none,
    );
    expect(result.merged.map((item) => item.id)).toEqual(['b']);
    expect(result.deleteAgain).toEqual(['a']);
    expect(result.upload).toEqual([]);
  });

  it('rebuilds documents a partial update overwrote, and repairs them', () => {
    // What older versions left after updating only the progress.
    const broken: SyncRow = {
      id: 'a',
      data: { currentValue: 9, status: 'active', userId: 'u1' },
    };
    const result = reconcileCollection([broken], [goal('a', 2)], none, none);
    expect(result.merged).toEqual([
      { ...goal('a', 9), status: 'active', userId: 'u1' },
    ]);
    expect(result.upload).toEqual(result.merged);
  });

  it('drops broken documents that cannot be rebuilt', () => {
    const broken: SyncRow = { id: 'a', data: { gymId: 'gym-1' } };
    const result = reconcileCollection<Goal>([broken], [], none, none);
    expect(result.merged).toEqual([]);
    expect(result.upload).toEqual([]);
  });
});
