import type { BodyMeasurement, MeasurementSite } from './types';

export type MeasurementField = 'weightKg' | 'fatPercent' | MeasurementSite;

export const MEASUREMENT_LABELS: Record<MeasurementField, string> = {
  weightKg: 'Peso',
  fatPercent: 'Gordura corporal',
  neckCm: 'Pescoço',
  shoulderCm: 'Ombros',
  chestCm: 'Peito',
  leftBicepCm: 'Bíceps esquerdo',
  rightBicepCm: 'Bíceps direito',
  leftForearmCm: 'Antebraço esquerdo',
  rightForearmCm: 'Antebraço direito',
  abdomenCm: 'Abdômen',
  waistCm: 'Cintura',
  hipsCm: 'Quadril',
  leftThighCm: 'Coxa esquerda',
  rightThighCm: 'Coxa direita',
  leftCalfCm: 'Panturrilha esquerda',
  rightCalfCm: 'Panturrilha direita',
};

export function measurementUnit(field: MeasurementField): string {
  if (field === 'weightKg') return 'kg';
  if (field === 'fatPercent') return '%';
  return 'cm';
}

/** Form and list order, grouped by body region. */
export const MEASUREMENT_GROUPS: {
  title: string;
  fields: MeasurementField[];
}[] = [
  { title: 'Composição', fields: ['weightKg', 'fatPercent'] },
  {
    title: 'Tronco',
    fields: [
      'neckCm',
      'shoulderCm',
      'chestCm',
      'abdomenCm',
      'waistCm',
      'hipsCm',
    ],
  },
  {
    title: 'Braços',
    fields: ['leftBicepCm', 'rightBicepCm', 'leftForearmCm', 'rightForearmCm'],
  },
  {
    title: 'Pernas',
    fields: ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'],
  },
];

export const MEASUREMENT_FIELDS: MeasurementField[] =
  MEASUREMENT_GROUPS.flatMap((group) => group.fields);

/** Points of one field, oldest first (input is newest first). */
export function measurementSeries(
  measurements: BodyMeasurement[],
  field: MeasurementField,
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  for (let i = measurements.length - 1; i >= 0; i -= 1) {
    const value = measurements[i][field];
    if (typeof value === 'number' && value > 0)
      points.push({ date: measurements[i].measuredAt, value });
  }
  return points;
}

export interface FieldSummary {
  field: MeasurementField;
  latest: number;
  latestAt: string;
  /** Change since the previous value of this field, if any. */
  change?: number;
  /** Change since the first value of this field, if any. */
  sinceStart?: number;
  count: number;
}

/** Latest value and changes for every field that has at least one value. */
export function summarizeMeasurements(
  measurements: BodyMeasurement[],
): FieldSummary[] {
  const summaries: FieldSummary[] = [];
  for (const field of MEASUREMENT_FIELDS) {
    const series = measurementSeries(measurements, field);
    if (series.length === 0) continue;
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const first = series[0];
    summaries.push({
      field,
      latest: latest.value,
      latestAt: latest.date,
      change: previous ? round(latest.value - previous.value) : undefined,
      sinceStart:
        series.length > 1 ? round(latest.value - first.value) : undefined,
      count: series.length,
    });
  }
  return summaries;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
