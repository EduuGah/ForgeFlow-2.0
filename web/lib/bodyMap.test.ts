import { SYNERGIST_GLOW, exerciseIntensity } from './bodyMap';

describe('exerciseIntensity', () => {
  it('lights the main muscle fully and the synergists softly', () => {
    expect(exerciseIntensity('Peito', ['Triceps', 'Ombros'])).toEqual({
      chest: 1,
      triceps: SYNERGIST_GLOW,
      delts: SYNERGIST_GLOW,
    });
  });

  it('never dims the main muscle because a synergist repeats it', () => {
    const intensity = exerciseIntensity('Costas', ['Trapezio', 'Biceps']);
    expect(intensity.lats).toBe(1);
    expect(intensity.traps).toBe(SYNERGIST_GLOW);
    expect(intensity.biceps).toBe(SYNERGIST_GLOW);
  });

  it('leaves cardio off the map', () => {
    expect(exerciseIntensity('Cardio', [])).toEqual({});
  });
});
