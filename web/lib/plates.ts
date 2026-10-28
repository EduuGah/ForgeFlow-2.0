import { searchKey } from './format';

/*
 * Which plates go on each side of the bar for a given load. Greedy from the
 * heaviest plate, which is exact for the usual gym sets (25 … 1.25 kg).
 */

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export const BARS: {
  value: string;
  label: string;
  short: string;
  kg: number;
}[] = [
  { value: '20', label: 'Barra olímpica 20 kg', short: '20 kg', kg: 20 },
  { value: '15', label: 'Barra 15 kg', short: '15 kg', kg: 15 },
  { value: '10', label: 'Barra W/EZ 10 kg', short: '10 kg', kg: 10 },
  { value: '0', label: 'Sem barra', short: 'Nenhuma', kg: 0 },
];

/** Olympic plate colours, so the drawing reads like a real bar. */
export const PLATE_COLORS: Record<number, string> = {
  25: '#d64545',
  20: '#2f6fd6',
  15: '#e8c31c',
  10: '#2fa65a',
  5: '#e9edf2',
  2.5: '#3a3f47',
  1.25: '#aab3bf',
};

export interface PlateLoad {
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** What the bar really weighs with these plates. */
  totalKg: number;
  /** Left over that the plates can't make (per bar, not per side). */
  missingKg: number;
}

export function platesFor(
  targetKg: number,
  barKg = 20,
  available: readonly number[] = PLATES_KG,
): PlateLoad {
  const perSide: number[] = [];
  let side = Math.max(0, (targetKg - barKg) / 2);
  // Work in grams so 2.5 and 1.25 never drift with floating point.
  let grams = Math.round(side * 1000);
  for (const plate of [...available].sort((a, b) => b - a)) {
    const plateGrams = Math.round(plate * 1000);
    while (grams >= plateGrams) {
      perSide.push(plate);
      grams -= plateGrams;
    }
  }
  side = perSide.reduce((sum, plate) => sum + plate, 0);
  const totalKg = Math.round((barKg + side * 2) * 100) / 100;
  return {
    perSide,
    totalKg,
    missingKg: Math.max(0, Math.round((targetKg - totalKg) * 100) / 100),
  };
}

/* ------------------------------------------------------------------ */
/* Timed exercises                                                     */
/* ------------------------------------------------------------------ */

const TIMED_WORDS = [
  'prancha',
  'isometr',
  'segurar',
  'sustent',
  'fazendeiro',
  'hold',
  'plank',
  'parede',
  'hollow',
  'l-sit',
];

/** Holds and carries, where the timer is the main tool. */
export function isTimedExercise(name: string): boolean {
  const key = searchKey(name);
  return TIMED_WORDS.some((word) => key.includes(word));
}
