import { systemExercises } from '../../src/data/seeds/systemExercises';
import { GUIDES, exerciseGuide } from './guides';
import { MEDIA_FOLDERS, exerciseMedia } from './exerciseMedia';
import { exerciseAliases } from './aliases';

describe('exercise guides and media', () => {
  it('cover every catalog exercise', () => {
    const missingGuide = systemExercises.filter((e) => !exerciseGuide(e.id));
    const missingMedia = systemExercises.filter((e) => !exerciseMedia(e.id));
    expect(missingGuide.map((e) => e.name)).toEqual([]);
    expect(missingMedia.map((e) => e.name)).toEqual([]);
    expect(Object.keys(GUIDES)).toHaveLength(systemExercises.length);
  });

  it('have complete guides', () => {
    for (const [id, guide] of Object.entries(GUIDES)) {
      expect([id, guide.muscles.length > 0]).toEqual([id, true]);
      expect([id, guide.setup.length > 0, guide.steps.length >= 2]).toEqual([
        id,
        true,
        true,
      ]);
      expect([id, guide.tips.length > 0, guide.mistakes.length > 0]).toEqual([
        id,
        true,
        true,
      ]);
    }
  });

  it('point at photos that exist in public/exercises', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    for (const folder of MEDIA_FOLDERS)
      for (const frame of ['0', '1'])
        expect([
          folder,
          fs.existsSync(`public/exercises/${folder}/${frame}.webp`),
        ]).toEqual([folder, true]);
  });

  it('ignores custom exercises', () => {
    expect(exerciseGuide('custom-import-x')).toBeNull();
    expect(exerciseMedia('custom-import-x')).toBeNull();
  });
});

describe('forearm exercises', () => {
  const byName = (name: string) =>
    systemExercises.find((exercise) => exercise.name === name)!;

  it('are named the way gyms call them', () => {
    for (const name of [
      'Flexao de punho com barra',
      'Flexao de punho com halteres',
      'Extensao de punho com barra',
      'Extensao de punho com halteres',
    ])
      expect([name, byName(name)?.primaryMuscleGroup]).toEqual([
        name,
        'Antebracos',
      ]);
  });

  it('can still be found by other names', () => {
    const flexion = byName('Flexao de punho com barra');
    expect(exerciseAliases(flexion.id)).toContain('rosca de punho');
    expect(exerciseAliases(flexion.id)).toContain('wrist curl');
    expect(exerciseAliases('custom-x')).toEqual([]);
  });

  it('show the end of a wrist curl in thumbnails (the start looks like an extension)', () => {
    const flexion = exerciseMedia(byName('Flexao de punho com barra').id)!;
    expect(flexion.thumb).toBe(flexion.end);
    const pullUp = exerciseMedia(byName('Barra fixa').id)!;
    expect(pullUp.thumb).toBe(pullUp.start);
  });
});
