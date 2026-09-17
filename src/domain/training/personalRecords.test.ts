import type { PersonalRecord, TrainingSet } from './entities';
import {
  calculateEstimatedOneRepMax,
  getPersonalRecordCandidates,
  isNewPersonalRecord,
} from './personalRecords';

const now = '2026-09-16T12:00:00.000Z';
const set: TrainingSet = {
  completedAt: now,
  createdAt: now,
  deletedAt: null,
  id: 'set-1',
  notes: null,
  repetitions: 8,
  restSeconds: null,
  sessionExerciseId: 'session-exercise-1',
  setNumber: 1,
  setType: 'working',
  updatedAt: now,
  weightKg: 100,
};

describe('personal record metrics', () => {
  it('uses the centralized Epley estimate and labels one repetition as exact load', () => {
    expect(calculateEstimatedOneRepMax(set)).toBe(126.67);
    expect(calculateEstimatedOneRepMax({ repetitions: 1, weightKg: 120 })).toBe(
      120,
    );
  });

  it('creates candidates only for valid completed working sets', () => {
    expect(getPersonalRecordCandidates(set)).toEqual([
      { contextWeightKg: null, recordType: 'weight', value: 100 },
      { contextWeightKg: null, recordType: 'volume', value: 800 },
      { contextWeightKg: 100, recordType: 'repetitions', value: 8 },
      { contextWeightKg: null, recordType: 'estimated_1rm', value: 126.67 },
    ]);
    expect(getPersonalRecordCandidates({ ...set, setType: 'warmup' })).toEqual(
      [],
    );
    expect(getPersonalRecordCandidates({ ...set, completedAt: null })).toEqual(
      [],
    );
  });

  it('requires a strict improvement and compares repetitions at the same load', () => {
    const record: PersonalRecord = {
      achievedAt: now,
      contextWeightKg: 100,
      createdAt: now,
      exerciseId: 'exercise-1',
      id: 'record-1',
      recordType: 'repetitions',
      sourceSetId: set.id,
      updatedAt: now,
      userId: 'user-1',
      value: 8,
    };
    expect(
      isNewPersonalRecord(
        { contextWeightKg: 100, recordType: 'repetitions', value: 8 },
        [record],
      ),
    ).toBe(false);
    expect(
      isNewPersonalRecord(
        { contextWeightKg: 100, recordType: 'repetitions', value: 9 },
        [record],
      ),
    ).toBe(true);
    expect(
      isNewPersonalRecord(
        { contextWeightKg: 90, recordType: 'repetitions', value: 7 },
        [record],
      ),
    ).toBe(true);
  });
});
