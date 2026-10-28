import {
  buildRanking,
  exerciseBoards,
  isLive,
  liveLabel,
  liveSnapshot,
  reactionCounts,
  type LiveWorkout,
  type WorkoutReaction,
} from './friends';
import type {
  ActiveWorkoutState,
  CompletedWorkout,
  PersonalRecordItem,
} from './types';

const workout = (
  completedAt: string,
  fields: Partial<CompletedWorkout> = {},
): CompletedWorkout => ({
  id: completedAt,
  name: 'Treino',
  startedAt: completedAt,
  completedAt,
  durationMinutes: 60,
  totalVolumeKg: 1000,
  totalSets: 10,
  exercises: [],
  prsAchieved: [],
  ...fields,
});

const person = (userId: string, history: CompletedWorkout[], me = false) => ({
  userId,
  name: userId,
  photoUrl: null,
  me,
  history,
});

describe('buildRanking metrics', () => {
  const since = new Date('2026-10-20T00:00:00.000Z');
  const people = [
    person(
      'me',
      [
        workout('2026-10-21T10:00:00.000Z', { totalVolumeKg: 5000 }),
        workout('2026-10-01T10:00:00.000Z', { totalVolumeKg: 99999 }),
      ],
      true,
    ),
    person('ana', [
      workout('2026-10-21T10:00:00.000Z', {
        durationMinutes: 50,
        prsAchieved: ['a', 'b'],
      }),
      workout('2026-10-22T10:00:00.000Z', { durationMinutes: 40 }),
    ]),
  ];

  it('sorts by the chosen metric, counting only the period', () => {
    expect(buildRanking(people, since).map((e) => e.userId)).toEqual([
      'me',
      'ana',
    ]);
    const byWorkouts = buildRanking(people, since, 'workouts');
    expect(byWorkouts.map((e) => e.userId)).toEqual(['ana', 'me']);
    expect(byWorkouts[0]).toMatchObject({
      workouts: 2,
      minutes: 90,
      sets: 20,
      records: 2,
    });
    expect(buildRanking(people, since, 'records')[0].userId).toBe('ana');
  });
});

describe('exerciseBoards', () => {
  const record = (
    exerciseId: string,
    value: number,
    type: PersonalRecordItem['type'] = 'weight',
  ): PersonalRecordItem => ({
    id: `${exerciseId}-${type}-${value}`,
    exerciseId,
    exerciseName: `Ex ${exerciseId}`,
    type,
    value,
    unit: 'kg',
    date: '2026-10-01',
  });

  it('keeps exercises at least two people did, heaviest first', () => {
    const boards = exerciseBoards([
      { userId: 'me', records: [record('supino', 80), record('remada', 60)] },
      {
        userId: 'ana',
        records: [record('supino', 90), record('supino', 200, 'volume')],
      },
    ]);
    expect(boards).toHaveLength(1);
    expect(boards[0].exerciseId).toBe('supino');
    expect(boards[0].entries).toEqual([
      { userId: 'ana', valueKg: 90 },
      { userId: 'me', valueKg: 80 },
    ]);
  });
});

describe('training now', () => {
  const now = Date.parse('2026-10-22T20:00:00.000Z');
  const live = (fields: Partial<LiveWorkout> = {}): LiveWorkout => ({
    userId: 'ana',
    name: 'Upper B',
    startedAt: '2026-10-22T19:26:00.000Z',
    doneSets: 5,
    totalSets: 12,
    currentExercise: 'Supino',
    endedAt: null,
    updatedAt: '2026-10-22T19:58:00.000Z',
    ...fields,
  });

  it('is live while recent and not ended', () => {
    expect(isLive(live(), now)).toBe(true);
    expect(isLive(live({ endedAt: '2026-10-22T19:59:00.000Z' }), now)).toBe(
      false,
    );
    // Quiet for two hours: the app was closed mid-workout.
    expect(isLive(live({ updatedAt: '2026-10-22T18:00:00.000Z' }), now)).toBe(
      false,
    );
    expect(
      isLive(
        live({
          startedAt: '2026-10-22T13:00:00.000Z',
          updatedAt: '2026-10-22T19:59:00.000Z',
        }),
        now,
      ),
    ).toBe(false);
  });

  it('describes progress and time', () => {
    expect(liveLabel(live(), now)).toBe('Upper B · 5/12 séries · 34 min');
  });

  it('snapshots the active workout', () => {
    const active: ActiveWorkoutState = {
      id: 'w',
      name: '  Pernas  ',
      startedAt: '2026-10-22T19:00:00.000Z',
      exercises: [
        {
          exerciseId: 'a',
          exerciseName: 'Agachamento',
          primaryMuscleGroup: 'quads',
          equipment: null,
          sets: [
            {
              id: '1',
              setNumber: 1,
              setType: 'working',
              weightKg: 100,
              repetitions: 5,
              completed: true,
            },
          ],
        },
        {
          exerciseId: 'b',
          exerciseName: 'Leg press',
          primaryMuscleGroup: 'quads',
          equipment: null,
          sets: [
            {
              id: '2',
              setNumber: 1,
              setType: 'working',
              weightKg: 200,
              repetitions: 10,
              completed: false,
            },
          ],
        },
      ],
    };
    expect(liveSnapshot(active)).toEqual({
      name: 'Pernas',
      startedAt: '2026-10-22T19:00:00.000Z',
      doneSets: 1,
      totalSets: 2,
      currentExercise: 'Leg press',
    });
  });
});

describe('reactionCounts', () => {
  it('counts each emoji in a fixed order', () => {
    const reaction = (userId: string, emoji: WorkoutReaction['emoji']) => ({
      id: 1,
      ownerId: 'me',
      workoutId: 'w',
      userId,
      emoji,
      createdAt: '2026-10-22T20:00:00.000Z',
    });
    expect(
      reactionCounts([
        reaction('a', '💪'),
        reaction('b', '🔥'),
        reaction('c', '💪'),
      ]),
    ).toEqual([
      { emoji: '🔥', count: 1 },
      { emoji: '💪', count: 2 },
    ]);
  });
});
