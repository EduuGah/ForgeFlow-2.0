import {
  PROGRAMS,
  programExercises,
  unknownProgramExercises,
} from './programs';

describe('ready-made programs', () => {
  it('only uses exercises the catalog has', () => {
    expect(unknownProgramExercises()).toEqual([]);
  });

  it('suggests one weekday per routine at least', () => {
    for (const program of PROGRAMS) {
      expect(program.schedule.length).toBeGreaterThanOrEqual(
        program.routines.length,
      );
      expect(program.schedule.every((day) => day >= 0 && day <= 6)).toBe(true);
    }
  });

  it('turns lines into routine exercises with rep ranges', () => {
    const [first] = programExercises(PROGRAMS[0].routines[0]);
    expect(first).toMatchObject({
      exerciseName: 'Agachamento goblet',
      targetSets: 3,
      targetReps: 10,
      targetRepsMax: 12,
      restSeconds: 90,
    });
  });
});
