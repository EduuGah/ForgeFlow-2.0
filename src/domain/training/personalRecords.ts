import type {
  PersonalRecord,
  PersonalRecordType,
  TrainingSet,
} from './entities';
import { calculateSetVolume, isCompletedWorkingSet } from './metrics';

export type PersonalRecordCandidate = {
  contextWeightKg: number | null;
  recordType: PersonalRecordType;
  value: number;
};

export function calculateEstimatedOneRepMax(
  set: Pick<TrainingSet, 'repetitions' | 'weightKg'>,
) {
  if (set.repetitions <= 0 || set.weightKg < 0) {
    return 0;
  }

  if (set.repetitions === 1) {
    return set.weightKg;
  }

  return roundMetric(set.weightKg * (1 + set.repetitions / 30));
}

export function getPersonalRecordCandidates(
  set: TrainingSet,
): PersonalRecordCandidate[] {
  if (!isCompletedWorkingSet(set)) {
    return [];
  }

  return [
    { contextWeightKg: null, recordType: 'weight', value: set.weightKg },
    {
      contextWeightKg: null,
      recordType: 'volume',
      value: calculateSetVolume(set),
    },
    {
      contextWeightKg: set.weightKg,
      recordType: 'repetitions',
      value: set.repetitions,
    },
    {
      contextWeightKg: null,
      recordType: 'estimated_1rm',
      value: calculateEstimatedOneRepMax(set),
    },
  ];
}

export function isNewPersonalRecord(
  candidate: PersonalRecordCandidate,
  records: readonly PersonalRecord[],
) {
  const previousBest = records
    .filter(
      (record) =>
        record.recordType === candidate.recordType &&
        record.contextWeightKg === candidate.contextWeightKg,
    )
    .reduce((best, record) => Math.max(best, record.value), -Infinity);

  return candidate.value > previousBest;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
