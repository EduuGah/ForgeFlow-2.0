import { systemExercises } from '../../src/data/seeds/systemExercises';
import { GUIDES, exerciseGuide } from './guides';
import { MEDIA_FOLDERS, exerciseMedia } from './exerciseMedia';

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
