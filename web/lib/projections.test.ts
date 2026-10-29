import {
  goalInsight,
  goalSuggestions,
  linearTrend,
  monthForecast,
  strengthTrend,
  volumeZone,
  weeklySetsByMuscle,
  weightTrend,
} from './projections';
import { goalGoesDown, goalProgress, goalReached } from './training';
import type { CompletedWorkout, GoalItem, PersonalRecordItem } from './types';

const DAY = 86_400_000;
const now = new Date('2026-10-22T12:00:00');

/** A workout `daysAgo` days before `now` with one bench press entry. */
const bench = (
  daysAgo: number,
  weightKg: number,
  reps = 5,
): CompletedWorkout => {
  const completedAt = new Date(now.getTime() - daysAgo * DAY).toISOString();
  return {
    id: `w-${daysAgo}`,
    name: 'Peito',
    startedAt: completedAt,
    completedAt,
    durationMinutes: 60,
    totalVolumeKg: weightKg * reps * 3,
    totalSets: 3,
    prsAchieved: [],
    exercises: [
      {
        exerciseId: 'supino',
        exerciseName: 'Supino',
        primaryMuscleGroup: 'chest',
        setsCount: 3,
        bestWeightKg: weightKg,
        totalVolumeKg: weightKg * reps * 3,
        sets: [{ type: 'working', weightKg, repetitions: reps }],
      },
    ],
  };
};

const goal = (fields: Partial<GoalItem>): GoalItem => ({
  id: 'g',
  title: 'Meta',
  type: 'custom',
  currentValue: 0,
  targetValue: 10,
  unit: '',
  status: 'active',
  ...fields,
});

describe('linearTrend', () => {
  it('fits a line and reports the fit', () => {
    const trend = linearTrend([
      { time: 0, value: 10 },
      { time: DAY, value: 12 },
      { time: 2 * DAY, value: 14 },
    ]);
    expect(trend?.slopePerDay).toBeCloseTo(2);
    expect(trend?.r2).toBeCloseTo(1);
    expect(linearTrend([{ time: 0, value: 1 }])).toBeNull();
    expect(
      linearTrend([
        { time: 5, value: 1 },
        { time: 5, value: 2 },
      ]),
    ).toBeNull();
  });
});

describe('strengthTrend', () => {
  it('projects a rising lift and needs 3 sessions for a pace', () => {
    const history = [bench(1, 90), bench(15, 85), bench(29, 80)];
    const trend = strengthTrend(history, 'supino', 'Supino', now);
    expect(trend?.sessions.map((s) => s.value)).toEqual([93.3, 99.2, 105]);
    expect(trend?.perMonthKg).toBeGreaterThan(10);
    expect(trend?.direction).toBe('up');
    expect(trend?.projections.map((p) => p.weeks)).toEqual([4, 12]);
    expect(trend?.projections[0].value).toBeGreaterThan(105);

    const two = strengthTrend(history.slice(0, 2), 'supino', 'Supino', now);
    expect(two?.perMonthKg).toBeNull();
    expect(two?.projections).toEqual([]);
  });

  it('has no projection when going down', () => {
    const history = [bench(1, 80), bench(15, 85), bench(29, 90)];
    const trend = strengthTrend(history, 'supino', 'Supino', now);
    expect(trend?.projections).toEqual([]);
    expect(trend?.direction).toBe('down');
  });

  it('calls a tiny change steady, with no projection below today', () => {
    // 1RM up and down around the same mark: the line is flat.
    const history = [
      bench(1, 15),
      bench(8, 15.1),
      bench(15, 15),
      bench(22, 15.1),
    ];
    const trend = strengthTrend(history, 'supino', 'Supino', now);
    expect(trend?.direction).toBe('flat');
    expect(trend?.projections).toEqual([]);
  });

  it('follows the heaviest load or the volume when asked', () => {
    const history = [bench(1, 90), bench(15, 85), bench(29, 80)];
    const weight = strengthTrend(
      history,
      'supino',
      'Supino',
      now,
      180,
      'weight',
    );
    expect(weight?.sessions.map((s) => s.value)).toEqual([80, 85, 90]);
    const volume = strengthTrend(
      history,
      'supino',
      'Supino',
      now,
      180,
      'volume',
    );
    expect(volume?.latest).toBe(90 * 5 * 3);
    // Volume shows the trend but never a strength projection.
    expect(volume?.direction).toBe('up');
    expect(volume?.projections).toEqual([]);
  });
});

describe('monthForecast', () => {
  it('extends the month so far at the same pace', () => {
    const history = [bench(1, 100), bench(3, 100), bench(40, 100)];
    const forecast = monthForecast(history, now);
    expect(forecast.dayOfMonth).toBe(22);
    expect(forecast.daysInMonth).toBe(31);
    expect(forecast.soFar.workouts).toBe(2);
    expect(forecast.projectedWorkouts).toBe(3);
    expect(forecast.lastMonth.workouts).toBe(1);
  });
});

describe('weekly sets per muscle', () => {
  it('averages the weeks and flags the zone', () => {
    const history = [bench(1, 100), bench(8, 100), bench(40, 100)];
    expect(weeklySetsByMuscle(history, 4, () => undefined, now)).toEqual([
      { group: 'chest', weeklySets: 1.5, zone: 'low' },
    ]);
    expect(volumeZone(12)).toBe('ok');
    expect(volumeZone(25)).toBe('high');
  });
});

describe('weightTrend', () => {
  it('reports kg per week from 3 or more weigh-ins', () => {
    const series = [21, 14, 7, 0].map((daysAgo, index) => ({
      date: new Date(now.getTime() - daysAgo * DAY).toISOString(),
      value: 90 - index * 0.5,
    }));
    const trend = weightTrend(series, now);
    expect(trend?.perWeekKg).toBeCloseTo(-0.5);
    expect(trend?.in4Weeks).toBeCloseTo(86.5);
    expect(weightTrend(series.slice(0, 2), now)).toBeNull();
  });
});

describe('goals that go down', () => {
  it('knows a weight-loss goal is not done at the start', () => {
    const loss = goal({
      type: 'weight',
      currentValue: 90,
      startValue: 90,
      targetValue: 80,
    });
    expect(goalGoesDown(loss)).toBe(true);
    expect(goalReached(loss, 90)).toBe(false);
    expect(goalProgress(loss, 85)).toBe(50);
    expect(goalReached(loss, 79.5)).toBe(true);
    const gain = goal({ type: 'weight', startValue: 70, targetValue: 75 });
    expect(goalGoesDown(gain)).toBe(false);
    expect(goalReached(gain, 76)).toBe(true);
  });
});

describe('goalInsight', () => {
  it('counts what is left of the week for frequency goals', () => {
    const insight = goalInsight(
      goal({ type: 'frequency', targetValue: 4 }),
      1,
      { history: [], bodyWeights: [] },
      now, // a Thursday: 4 days left with today
    );
    expect(insight?.text).toContain('Faltam 3 treinos em 4 dias');
  });

  it('dates a load goal from the trend and checks the deadline', () => {
    const history = [bench(1, 90), bench(15, 85), bench(29, 80)];
    const loadGoal = goal({
      type: 'exercise_weight',
      exerciseId: 'supino',
      targetValue: 95,
      unit: 'kg',
    });
    const free = goalInsight(loadGoal, 90, { history, bodyWeights: [] }, now);
    expect(free?.tone).toBe('good');
    expect(free?.text).toContain('No ritmo atual');
    const tight = goalInsight(
      { ...loadGoal, deadline: '2026-10-25' },
      90,
      { history, bodyWeights: [] },
      now,
    );
    expect(tight?.tone).toBe('warn');
    expect(tight?.text).toContain('depois do prazo');
  });

  it('tells the weekly pace a deadline needs without a trend', () => {
    const insight = goalInsight(
      goal({ targetValue: 20, unit: 'km', deadline: '2026-11-04' }),
      10,
      { history: [], bodyWeights: [] },
      now,
    );
    expect(insight?.text).toBe('Para chegar no prazo: 5,2 km por semana.');
  });

  it('says nothing once reached', () => {
    expect(
      goalInsight(goal({ targetValue: 5 }), 6, {
        history: [],
        bodyWeights: [],
      }),
    ).toBeNull();
  });
});

describe('goalSuggestions', () => {
  it('suggests one more workout a week and more load on main lifts', () => {
    const history = [bench(1, 90), bench(8, 85), bench(15, 85), bench(22, 80)];
    const records: PersonalRecordItem[] = [
      {
        id: 'r',
        exerciseId: 'supino',
        exerciseName: 'Supino',
        type: 'weight',
        value: 90,
        unit: 'kg',
        date: '2026-10-21',
      },
    ];
    const suggestions = goalSuggestions(history, records, [], now);
    expect(suggestions.map((s) => s.title)).toEqual([
      'Treinar 2 vezes por semana',
      'Supino com 95 kg',
    ]);
    const covered = goalSuggestions(
      history,
      records,
      [
        goal({ type: 'frequency' }),
        goal({ type: 'exercise_weight', exerciseId: 'supino' }),
      ],
      now,
    );
    expect(covered).toEqual([]);
  });
});
