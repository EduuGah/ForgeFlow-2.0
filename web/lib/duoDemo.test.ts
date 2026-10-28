import { DEMO_SET_MS, demoLive } from './duoDemo';

describe('demo partner', () => {
  it('finishes one set every few seconds, in order', () => {
    const start = 1_000_000;
    expect(demoLive(start, start).doneSets).toBe(0);
    const later = demoLive(start, start + DEMO_SET_MS * 4 + 10);
    expect(later.doneSets).toBe(4);
    expect(later.detail?.e[0].s).toHaveLength(3);
    expect(later.detail?.e[1].s).toHaveLength(1);
    expect(later.currentExercise).toBe('Remada curvada com barra');
  });

  it('stops when every set is done', () => {
    const done = demoLive(0, DEMO_SET_MS * 100);
    expect(done.doneSets).toBe(done.totalSets);
    expect(done.currentExercise).toBeNull();
  });
});
