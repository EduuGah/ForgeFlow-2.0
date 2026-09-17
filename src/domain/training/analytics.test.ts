import type { PersonalRecord, TrainingSet } from './entities';
import { calculateTrainingAnalytics } from './analytics';

const currentDate = '2026-09-10T12:00:00.000Z';
const previousDate = '2026-08-24T12:00:00.000Z';

describe('training analytics', () => {
  it('calculates current metrics, exercise series and equal-length comparison', () => {
    const result = calculateTrainingAnalytics({
      period: {
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-14T23:59:59.999Z',
      },
      personalRecords: [
        record('record-weight', 'weight', currentDate),
        record('record-volume', 'volume', currentDate),
      ],
      sessions: [
        { completedAt: currentDate, durationSeconds: 3_600, id: 'current' },
        { completedAt: previousDate, durationSeconds: 3_000, id: 'previous' },
      ],
      sets: [
        entry(trainingSet('current-working', 'working', 100, 5), currentDate),
        entry(trainingSet('current-warmup', 'warmup', 50, 10), currentDate),
        entry(trainingSet('previous-working', 'working', 80, 5), previousDate),
      ],
    });

    expect(result.summary).toEqual({
      durationSeconds: 3_600,
      frequencyPerWeek: 0.5,
      personalRecordCount: 2,
      repetitions: 5,
      volume: 500,
      workingSetCount: 1,
      workoutCount: 1,
    });
    expect(result.comparisons.volume).toEqual({
      current: 500,
      percentageChange: 25,
      previous: 400,
    });
    expect(result.exercises[0]).toMatchObject({
      exerciseId: 'bench',
      maxRepetitions: 5,
      maxWeightKg: 100,
      personalRecordCount: 2,
      volume: 500,
      workingSetCount: 1,
    });
    expect(result.timeline).toEqual([
      {
        date: '2026-09-10',
        durationSeconds: 3_600,
        repetitions: 5,
        volume: 500,
        workoutCount: 1,
      },
    ]);
  });

  it('rejects invalid periods and leaves zero-baseline percentages undefined', () => {
    expect(() =>
      calculateTrainingAnalytics({
        period: { from: currentDate, to: previousDate },
        personalRecords: [],
        sessions: [],
        sets: [],
      }),
    ).toThrow('valid ordered dates');

    const result = calculateTrainingAnalytics({
      period: { from: currentDate, to: currentDate },
      personalRecords: [],
      sessions: [
        { completedAt: currentDate, durationSeconds: 10, id: 'session' },
      ],
      sets: [],
    });
    expect(result.comparisons.workoutCount.percentageChange).toBeNull();
  });
});

function entry(set: TrainingSet, performedAt: string) {
  return {
    exerciseId: 'bench',
    exerciseName: 'Supino reto',
    performedAt,
    set,
  };
}

function trainingSet(
  id: string,
  setType: TrainingSet['setType'],
  weightKg: number,
  repetitions: number,
): TrainingSet {
  return {
    completedAt: currentDate,
    createdAt: currentDate,
    deletedAt: null,
    id,
    notes: null,
    repetitions,
    restSeconds: 90,
    sessionExerciseId: 'session-exercise',
    setNumber: 1,
    setType,
    updatedAt: currentDate,
    weightKg,
  };
}

function record(
  id: string,
  recordType: PersonalRecord['recordType'],
  achievedAt: string,
) {
  return {
    achievedAt,
    contextWeightKg: null,
    createdAt: achievedAt,
    exerciseId: 'bench',
    id,
    recordType,
    sourceSetId: 'current-working',
    updatedAt: achievedAt,
    userId: 'user-1',
    value: 1,
  } satisfies PersonalRecord;
}
