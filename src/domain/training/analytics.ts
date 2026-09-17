import type { EntityId, ISODateTimeString } from '../shared/types';
import type { PersonalRecordType, TrainingSet } from './entities';
import { calculateSetVolume, isCompletedWorkingSet } from './metrics';

export type AnalyticsPeriod = {
  from: ISODateTimeString;
  to: ISODateTimeString;
};

export type AnalyticsSession = {
  completedAt: ISODateTimeString;
  durationSeconds: number;
  id: EntityId;
};

export type AnalyticsSet = {
  exerciseId: EntityId;
  exerciseName: string;
  performedAt: ISODateTimeString;
  set: TrainingSet;
};

export type AnalyticsRecord = {
  achievedAt: ISODateTimeString;
  exerciseId: EntityId;
  recordType: PersonalRecordType;
};

export type AnalyticsSummary = {
  durationSeconds: number;
  frequencyPerWeek: number;
  personalRecordCount: number;
  repetitions: number;
  volume: number;
  workingSetCount: number;
  workoutCount: number;
};

export type AnalyticsComparison = {
  current: number;
  percentageChange: number | null;
  previous: number;
};

export type TrainingAnalytics = {
  comparisons: {
    durationSeconds: AnalyticsComparison;
    repetitions: AnalyticsComparison;
    volume: AnalyticsComparison;
    workoutCount: AnalyticsComparison;
  };
  exercises: {
    exerciseId: EntityId;
    exerciseName: string;
    maxRepetitions: number;
    maxWeightKg: number;
    personalRecordCount: number;
    points: {
      date: string;
      maxRepetitions: number;
      maxWeightKg: number;
      volume: number;
    }[];
    volume: number;
    workingSetCount: number;
  }[];
  period: AnalyticsPeriod;
  personalRecords: Record<PersonalRecordType, number>;
  previousPeriod: AnalyticsPeriod;
  summary: AnalyticsSummary;
  timeline: {
    date: string;
    durationSeconds: number;
    repetitions: number;
    volume: number;
    workoutCount: number;
  }[];
};

type CalculateTrainingAnalyticsInput = {
  period: AnalyticsPeriod;
  personalRecords: readonly AnalyticsRecord[];
  sessions: readonly AnalyticsSession[];
  sets: readonly AnalyticsSet[];
};

export function calculateTrainingAnalytics({
  period,
  personalRecords,
  sessions,
  sets,
}: CalculateTrainingAnalyticsInput): TrainingAnalytics {
  const normalizedPeriod = normalizePeriod(period);
  const previousPeriod = getPreviousPeriod(normalizedPeriod);
  const current = calculatePeriodMetrics(
    normalizedPeriod,
    sessions,
    sets,
    personalRecords,
  );
  const previous = calculatePeriodMetrics(
    previousPeriod,
    sessions,
    sets,
    personalRecords,
  );

  return {
    comparisons: {
      durationSeconds: compare(
        current.summary.durationSeconds,
        previous.summary.durationSeconds,
      ),
      repetitions: compare(
        current.summary.repetitions,
        previous.summary.repetitions,
      ),
      volume: compare(current.summary.volume, previous.summary.volume),
      workoutCount: compare(
        current.summary.workoutCount,
        previous.summary.workoutCount,
      ),
    },
    exercises: current.exercises,
    period: normalizedPeriod,
    personalRecords: current.personalRecords,
    previousPeriod,
    summary: current.summary,
    timeline: current.timeline,
  };
}

function calculatePeriodMetrics(
  period: AnalyticsPeriod,
  sessions: readonly AnalyticsSession[],
  sets: readonly AnalyticsSet[],
  records: readonly AnalyticsRecord[],
) {
  const periodSessions = sessions.filter((session) =>
    isWithinPeriod(session.completedAt, period),
  );
  const periodSets = sets.filter(
    (entry) =>
      isWithinPeriod(entry.performedAt, period) &&
      isCompletedWorkingSet(entry.set),
  );
  const periodRecords = records.filter((record) =>
    isWithinPeriod(record.achievedAt, period),
  );
  const durationSeconds = periodSessions.reduce(
    (total, session) => total + Math.max(0, session.durationSeconds),
    0,
  );
  const volume = periodSets.reduce(
    (total, entry) => total + calculateSetVolume(entry.set),
    0,
  );
  const repetitions = periodSets.reduce(
    (total, entry) => total + entry.set.repetitions,
    0,
  );
  const periodDays = getPeriodDays(period);

  return {
    exercises: getExerciseMetrics(periodSets, periodRecords),
    personalRecords: getRecordBreakdown(periodRecords),
    summary: {
      durationSeconds,
      frequencyPerWeek: roundMetric(
        periodSessions.length / Math.max(1, periodDays / 7),
      ),
      personalRecordCount: periodRecords.length,
      repetitions,
      volume: roundMetric(volume),
      workingSetCount: periodSets.length,
      workoutCount: periodSessions.length,
    },
    timeline: getTimeline(periodSessions, periodSets),
  };
}

function getExerciseMetrics(
  sets: readonly AnalyticsSet[],
  records: readonly AnalyticsRecord[],
) {
  const grouped = new Map<EntityId, AnalyticsSet[]>();

  for (const entry of sets) {
    grouped.set(entry.exerciseId, [
      ...(grouped.get(entry.exerciseId) ?? []),
      entry,
    ]);
  }

  return [...grouped.entries()]
    .map(([exerciseId, entries]) => {
      const points = new Map<
        string,
        { maxRepetitions: number; maxWeightKg: number; volume: number }
      >();

      for (const entry of entries) {
        const date = toDateKey(entry.performedAt);
        const point = points.get(date) ?? {
          maxRepetitions: 0,
          maxWeightKg: 0,
          volume: 0,
        };
        point.maxRepetitions = Math.max(
          point.maxRepetitions,
          entry.set.repetitions,
        );
        point.maxWeightKg = Math.max(point.maxWeightKg, entry.set.weightKg);
        point.volume += calculateSetVolume(entry.set);
        points.set(date, point);
      }

      return {
        exerciseId,
        exerciseName: entries[0].exerciseName,
        maxRepetitions: Math.max(
          ...entries.map((entry) => entry.set.repetitions),
        ),
        maxWeightKg: Math.max(...entries.map((entry) => entry.set.weightKg)),
        personalRecordCount: records.filter(
          (record) => record.exerciseId === exerciseId,
        ).length,
        points: [...points.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([date, point]) => ({
            date,
            maxRepetitions: point.maxRepetitions,
            maxWeightKg: point.maxWeightKg,
            volume: roundMetric(point.volume),
          })),
        volume: roundMetric(
          entries.reduce(
            (total, entry) => total + calculateSetVolume(entry.set),
            0,
          ),
        ),
        workingSetCount: entries.length,
      };
    })
    .sort(
      (left, right) =>
        right.volume - left.volume ||
        left.exerciseName.localeCompare(right.exerciseName),
    );
}

function getTimeline(
  sessions: readonly AnalyticsSession[],
  sets: readonly AnalyticsSet[],
) {
  const points = new Map<
    string,
    {
      durationSeconds: number;
      repetitions: number;
      volume: number;
      workoutCount: number;
    }
  >();

  for (const session of sessions) {
    const date = toDateKey(session.completedAt);
    const point = points.get(date) ?? emptyTimelinePoint();
    point.durationSeconds += Math.max(0, session.durationSeconds);
    point.workoutCount += 1;
    points.set(date, point);
  }

  for (const entry of sets) {
    const date = toDateKey(entry.performedAt);
    const point = points.get(date) ?? emptyTimelinePoint();
    point.repetitions += entry.set.repetitions;
    point.volume += calculateSetVolume(entry.set);
    points.set(date, point);
  }

  return [...points.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, point]) => ({
      ...point,
      date,
      volume: roundMetric(point.volume),
    }));
}

function emptyTimelinePoint() {
  return {
    durationSeconds: 0,
    repetitions: 0,
    volume: 0,
    workoutCount: 0,
  };
}

function getRecordBreakdown(records: readonly AnalyticsRecord[]) {
  const breakdown: Record<PersonalRecordType, number> = {
    estimated_1rm: 0,
    repetitions: 0,
    volume: 0,
    weight: 0,
  };

  for (const record of records) breakdown[record.recordType] += 1;
  return breakdown;
}

function compare(current: number, previous: number): AnalyticsComparison {
  return {
    current,
    percentageChange:
      previous === 0
        ? null
        : roundMetric(((current - previous) / previous) * 100),
    previous,
  };
}

function normalizePeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  const from = Date.parse(period.from);
  const to = Date.parse(period.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw new Error('Analytics period must contain valid ordered dates.');
  }
  return period;
}

function getPreviousPeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  const from = Date.parse(period.from);
  const to = Date.parse(period.to);
  const duration = to - from;
  const previousTo = from - 1;
  return {
    from: new Date(previousTo - duration).toISOString(),
    to: new Date(previousTo).toISOString(),
  };
}

function getPeriodDays(period: AnalyticsPeriod) {
  return Math.max(
    1,
    (Date.parse(period.to) - Date.parse(period.from) + 1) / 86_400_000,
  );
}

function isWithinPeriod(value: ISODateTimeString, period: AnalyticsPeriod) {
  const timestamp = Date.parse(value);
  return (
    timestamp >= Date.parse(period.from) && timestamp <= Date.parse(period.to)
  );
}

function toDateKey(value: ISODateTimeString) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
