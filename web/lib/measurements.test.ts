import {
  MEASUREMENT_FIELDS,
  measurementSeries,
  summarizeMeasurements,
} from './measurements';
import { MEASUREMENT_SITES, type BodyMeasurement } from './types';

const DATA: BodyMeasurement[] = [
  { id: 'c', measuredAt: '2026-03-09T03:00:00.000Z', weightKg: 75.05 },
  {
    id: 'b',
    measuredAt: '2026-02-03T03:00:00.000Z',
    weightKg: 76.2,
    waistCm: 82,
  },
  { id: 'a', measuredAt: '2026-01-28T03:00:00.000Z', weightKg: 75 },
];

describe('body measurements', () => {
  it('covers every circumference Hevy exports', () => {
    for (const site of MEASUREMENT_SITES)
      expect(MEASUREMENT_FIELDS).toContain(site);
  });

  it('builds a series oldest first, skipping missing values', () => {
    expect(measurementSeries(DATA, 'weightKg').map((p) => p.value)).toEqual([
      75, 76.2, 75.05,
    ]);
    expect(measurementSeries(DATA, 'waistCm')).toHaveLength(1);
  });

  it('summarizes latest values and changes per field', () => {
    const [weight, waist] = summarizeMeasurements(DATA);
    expect(weight).toMatchObject({
      field: 'weightKg',
      latest: 75.05,
      change: -1.15,
      sinceStart: 0.05,
      count: 3,
    });
    expect(waist).toMatchObject({ field: 'waistCm', latest: 82, count: 1 });
    expect(waist.change).toBeUndefined();
  });
});
