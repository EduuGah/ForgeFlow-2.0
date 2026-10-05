import { systemExercises } from '../../src/data/seeds/systemExercises';
import {
  ImportError,
  guessMuscleGroup,
  isMeasurementCsv,
  planMeasurementImport,
  readMeasurementCsv,
  matchExercises,
  normalizeExerciseName,
  parseCsv,
  parseDurationMinutes,
  parseImportDate,
  planImport,
  readWorkoutCsv,
} from './importCsv';
import { replayRecords } from './training';
import type { CompletedWorkout } from './types';

const HEVY_HEADER =
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';

const HEVY_SAMPLE = [
  HEVY_HEADER,
  '"Upper A","21 de set. de 2026, 21:22","21 de set. de 2026, 23:01","","Bench Press (Barbell)",,"",0,"warmup",40,10,,,',
  '"Upper A","21 de set. de 2026, 21:22","21 de set. de 2026, 23:01","","Bench Press (Barbell)",,"",1,"normal",60,8,,,',
  '"Upper A","21 de set. de 2026, 21:22","21 de set. de 2026, 23:01","","Bench Press (Barbell)",,"",2,"failure",62.5,6,,,',
  '"Upper A","21 de set. de 2026, 21:22","21 de set. de 2026, 23:01","","Seated Dip Machine",,"Nao consegui a 6rep com 30kg',
  'Fiz 5 com ajuda",0,"normal",30,5,,,',
  '"Upper A","21 de set. de 2026, 21:22","21 de set. de 2026, 23:01","","Crunch",,"",0,"normal",,25,,,',
  '"Leg","14 de ago. de 2026, 07:05","14 de ago. de 2026, 08:15","","Treadmill",,"",0,"normal",,,7,3600,',
  '"Leg","14 de ago. de 2026, 07:05","14 de ago. de 2026, 08:15","","Squat (Barbell)",,"",0,"normal",80,5,,,',
  '"Leg","14 de ago. de 2026, 07:05","14 de ago. de 2026, 08:15","","Squat (Barbell)",,"",1,"normal",80,0,,,',
].join('\n');

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, empty fields and embedded newlines', () => {
    const rows = parseCsv(
      'a,"b, c","say ""hi""",,"line 1\nline 2"\r\nx,y,z,,w\n',
    );
    expect(rows).toEqual([
      ['a', 'b, c', 'say "hi"', '', 'line 1\nline 2'],
      ['x', 'y', 'z', '', 'w'],
    ]);
  });

  it('detects semicolon separated files and strips the BOM', () => {
    expect(parseCsv('﻿Date;Reps\n2026-01-01;5')).toEqual([
      ['Date', 'Reps'],
      ['2026-01-01', '5'],
    ]);
  });
});

describe('parseImportDate', () => {
  it('reads the pt-BR Hevy format as local time', () => {
    const date = parseImportDate('21 de set. de 2026, 21:22')!;
    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2026, 8, 21, 21, 22]);
  });

  it('reads English, month-first with AM/PM and ISO-like dates', () => {
    expect(parseImportDate('21 Sep 2026, 21:22')?.getHours()).toBe(21);
    const us = parseImportDate('Sep 21, 2026, 9:22 PM')!;
    expect([us.getMonth(), us.getDate(), us.getHours()]).toEqual([8, 21, 21]);
    expect(parseImportDate('Feb 3, 2026, 12:05 AM')?.getHours()).toBe(0);
    const iso = parseImportDate('2026-02-03 07:30:00')!;
    expect([
      iso.getMonth(),
      iso.getDate(),
      iso.getHours(),
      iso.getMinutes(),
    ]).toEqual([1, 3, 7, 30]);
    expect(parseImportDate('28 de fev. de 2026, 17:05')?.getMonth()).toBe(1);
  });

  it('rejects unknown text', () => {
    expect(parseImportDate('ontem')).toBeNull();
    expect(parseImportDate('')).toBeNull();
    expect(parseImportDate('3 de xyz. de 2026, 10:00')).toBeNull();
  });
});

describe('parseDurationMinutes', () => {
  it('reads Strong durations', () => {
    expect(parseDurationMinutes('1h 5m')).toBe(65);
    expect(parseDurationMinutes('45m')).toBe(45);
    expect(parseDurationMinutes('1:05:00')).toBe(65);
    expect(parseDurationMinutes('')).toBeNull();
  });
});

describe('readWorkoutCsv', () => {
  it('groups Hevy rows into workouts and consecutive exercises', () => {
    const parsed = readWorkoutCsv(HEVY_SAMPLE);
    expect(parsed.format).toBe('hevy');
    expect(parsed.workouts.map((w) => w.title)).toEqual(['Leg', 'Upper A']);

    const upper = parsed.workouts[1];
    expect(upper.exercises.map((e) => e.sourceName)).toEqual([
      'Bench Press (Barbell)',
      'Seated Dip Machine',
      'Crunch',
    ]);
    expect(upper.exercises[0].sets).toEqual([
      { type: 'warmup', weightKg: 40, repetitions: 10 },
      { type: 'working', weightKg: 60, repetitions: 8 },
      { type: 'working', weightKg: 62.5, repetitions: 6, tag: 'failure' },
    ]);
    expect(upper.exercises[1].notes).toBe(
      'Nao consegui a 6rep com 30kg\nFiz 5 com ajuda',
    );
    expect(upper.exercises[2].sets).toEqual([
      { type: 'working', weightKg: 0, repetitions: 25 },
    ]);
    expect(upper.endedAt.getTime() - upper.startedAt.getTime()).toBe(
      99 * 60000,
    );

    const leg = parsed.workouts[0];
    expect(leg.exercises[0]).toEqual({
      sourceName: 'Treadmill',
      sets: [
        {
          type: 'working',
          weightKg: 0,
          repetitions: 0,
          distanceKm: 7,
          durationSeconds: 3600,
        },
      ],
    });
    // The 0-rep squat row is dropped, the valid one kept.
    expect(leg.exercises[1].sets).toHaveLength(1);
  });

  it('reads Strong exports with warm-up markers and durations', () => {
    const csv = [
      'Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Reps;Distance;Seconds;Notes;Workout Notes;RPE',
      '2026-03-01 10:00:00;Push;1h 10m;Bench Press (Barbell);W;40;10;0;0;;;',
      '2026-03-01 10:00:00;Push;1h 10m;Bench Press (Barbell);1;70;5;0;0;;;',
    ].join('\n');
    const parsed = readWorkoutCsv(csv);
    expect(parsed.format).toBe('strong');
    expect(parsed.workouts).toHaveLength(1);
    expect(parsed.workouts[0].exercises[0].sets.map((s) => s.type)).toEqual([
      'warmup',
      'working',
    ]);
    expect(
      parsed.workouts[0].endedAt.getTime() -
        parsed.workouts[0].startedAt.getTime(),
    ).toBe(70 * 60000);
  });

  it('keeps failed attempts, RPE, supersets and the workout description', () => {
    const csv = [
      HEVY_HEADER,
      '"Lower B","4 de set. de 2026, 20:20","4 de set. de 2026, 21:30","Dia pesado","Deadlift (Barbell)",,"",0,"failure",140,0,,,',
      '"Lower B","4 de set. de 2026, 20:20","4 de set. de 2026, 21:30","Dia pesado","Deadlift (Barbell)",,"",1,"normal",130,3,,,8.5',
      '"Lower B","4 de set. de 2026, 20:20","4 de set. de 2026, 21:30","Dia pesado","Leg Extension (Machine)",0,"",0,"dropset",50,10,,,',
      '"Lower B","4 de set. de 2026, 20:20","4 de set. de 2026, 21:30","Dia pesado","Seated Leg Curl (Machine)",0,"",0,"normal",40,12,,,',
      '"Lower B","4 de set. de 2026, 20:20","4 de set. de 2026, 21:30","Dia pesado","Plank",,"",0,"normal",,,,60,',
    ].join('\n');
    const parsed = readWorkoutCsv(csv);
    const workout = parsed.workouts[0];
    expect(workout.description).toBe('Dia pesado');
    expect(workout.exercises[0].sets).toEqual([
      { type: 'working', weightKg: 140, repetitions: 0, tag: 'failure' },
      { type: 'working', weightKg: 130, repetitions: 3, rpe: 8.5 },
    ]);
    expect(workout.exercises[1]).toMatchObject({
      supersetId: '0',
      sets: [{ tag: 'dropset' }],
    });
    expect(workout.exercises[2].supersetId).toBe('0');
    expect(workout.exercises[3].sets).toEqual([
      { type: 'working', weightKg: 0, repetitions: 0, durationSeconds: 60 },
    ]);

    const plan = planImport(parsed, {
      catalog: systemExercises,
      history: [],
      ownerUserId: 'u',
      now: new Date(),
    });
    const deadlift = plan.workouts[0].exercises[0];
    // The failed attempt counts as a set but adds no volume nor best load.
    expect(deadlift).toMatchObject({
      setsCount: 2,
      bestWeightKg: 130,
      totalVolumeKg: 390,
    });
    expect(plan.workouts[0].notes).toBe('Dia pesado');
    expect(plan.extras).toMatchObject({
      failures: 1,
      dropsets: 1,
      rpe: 1,
      supersets: 1,
      cardio: 1,
      workoutNotes: 1,
    });
  });

  it('reads Strong failure and drop-set markers', () => {
    const csv = [
      'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
      '2026-03-01 10:00:00,Push,1h,Bench Press (Barbell),F,80,4,0,0,,Bom dia,9',
      '2026-03-01 10:00:00,Push,1h,Bench Press (Barbell),D,60,8,0,0,,Bom dia,',
    ].join('\n');
    const workout = readWorkoutCsv(csv).workouts[0];
    expect(workout.description).toBe('Bom dia');
    expect(workout.exercises[0].sets).toEqual([
      { type: 'working', weightKg: 80, repetitions: 4, tag: 'failure', rpe: 9 },
      { type: 'working', weightKg: 60, repetitions: 8, tag: 'dropset' },
    ]);
  });

  it('converts pounds and miles', () => {
    const csv = [
      'title,start_time,end_time,exercise_title,set_type,weight_lbs,reps,distance_miles,duration_seconds',
      'A,2026-01-01 10:00,2026-01-01 11:00,Squat (Barbell),normal,225,5,,',
    ].join('\n');
    expect(
      readWorkoutCsv(csv).workouts[0].exercises[0].sets[0].weightKg,
    ).toBeCloseTo(102.06, 2);
  });

  it('refuses files that are not a workout export', () => {
    expect(() => readWorkoutCsv('nome,valor\na,1')).toThrow(ImportError);
    expect(() => readWorkoutCsv('')).toThrow(ImportError);
  });
});

describe('exercise matching', () => {
  it('normalizes names', () => {
    expect(normalizeExerciseName('Lat Pulldown - Close Grip (Cable)')).toBe(
      'lat pulldown close grip cable',
    );
    expect(normalizeExerciseName('Crucifixo Inclinado (máquina)')).toBe(
      'crucifixo inclinado maquina',
    );
  });

  it('maps known English names to the catalog and keeps the rest as custom', () => {
    const matches = matchExercises(
      [
        'Bench Press (Barbell)',
        'Lat Pulldown (Cable)',
        'Seated Dip Machine',
        'Supino reto com barra',
        'extensora KikosPro',
      ],
      systemExercises,
    );
    expect(matches[0]).toMatchObject({
      exerciseName: 'Supino reto com barra',
      recognized: true,
      primaryMuscleGroup: 'Peito',
    });
    expect(matches[1]).toMatchObject({
      exerciseName: 'Puxada alta',
      recognized: true,
    });
    expect(matches[2]).toMatchObject({
      exerciseId: 'custom-import-seated-dip-machine',
      recognized: false,
      primaryMuscleGroup: 'Triceps',
    });
    expect(matches[3]).toMatchObject({
      exerciseName: 'Supino reto com barra',
      recognized: true,
    });
    expect(matches[4]).toMatchObject({
      recognized: false,
      primaryMuscleGroup: 'Pernas',
    });
  });

  it('guesses muscle groups without being fooled by shared words', () => {
    expect(guessMuscleGroup('Rear Delt Reverse Fly (Cable)')).toBe('Ombros');
    expect(guessMuscleGroup('Seated Leg Curl (Machine)')).toBe('Pernas');
    expect(guessMuscleGroup('Iso-Lateral High Row (Machine)')).toBe('Costas');
    expect(guessMuscleGroup('Crucifixo Inclinado (máquina)')).toBe('Peito');
    expect(guessMuscleGroup('Crunch (Machine)')).toBe('Core');
    expect(guessMuscleGroup('Treadmill')).toBe('Cardio');
    expect(guessMuscleGroup('Shrug (Smith Machine)')).toBe('Costas');
    expect(guessMuscleGroup('Mystery move')).toBe('Geral');
  });
});

describe('planImport', () => {
  const now = new Date('2026-09-30T12:00:00Z');

  it('builds workouts, skips duplicates and lists new custom exercises', () => {
    const parsed = readWorkoutCsv(HEVY_SAMPLE);
    const first = planImport(parsed, {
      catalog: systemExercises,
      history: [],
      ownerUserId: 'u1',
      now,
    });
    expect(first.workouts).toHaveLength(2);
    expect(first.workouts[0].name).toBe('Upper A'); // newest first
    const upper = first.workouts[0];
    expect(upper.totalSets).toBe(4); // warm-up excluded
    expect(upper.totalVolumeKg).toBe(60 * 8 + 62.5 * 6 + 30 * 5);
    expect(upper.durationMinutes).toBe(99);
    expect(upper.exercises[0]).toMatchObject({
      exerciseName: 'Supino reto com barra',
      bestWeightKg: 62.5,
      setsCount: 2,
    });
    // Cardio is a set (distance and time kept), without volume.
    expect(first.workouts[1].exercises[0]).toMatchObject({
      exerciseName: 'Treadmill',
      setsCount: 1,
      totalVolumeKg: 0,
    });
    expect(first.workouts[1].exercises[0].notes).toBeUndefined();
    expect(first.newExercises.map((e) => e.name).sort()).toEqual([
      'Seated Dip Machine',
      'Treadmill',
    ]);
    expect(first.newExercises[0].ownerUserId).toBe('u1');
    expect(first.totalSets).toBe(6);
    expect(first.extras).toEqual({
      warmups: 1,
      failures: 1,
      dropsets: 0,
      cardio: 1,
      rpe: 0,
      supersets: 0,
      exerciseNotes: 1,
      workoutNotes: 0,
    });

    const again = planImport(parsed, {
      catalog: [...systemExercises, ...first.newExercises],
      history: first.workouts,
      ownerUserId: 'u1',
      now,
    });
    expect(again.workouts).toHaveLength(0);
    expect(again.duplicates).toBe(2);
    expect(again.newExercises).toHaveLength(0);
  });

  it('produces workouts whose records can be replayed in order', () => {
    const csv = [
      HEVY_HEADER,
      '"A","1 Feb 2026, 10:00","1 Feb 2026, 11:00","","Squat (Barbell)",,"",0,"normal",100,5,,,',
      '"B","8 Feb 2026, 10:00","8 Feb 2026, 11:00","","Squat (Barbell)",,"",0,"normal",90,5,,,',
      '"C","15 Feb 2026, 10:00","15 Feb 2026, 11:00","","Squat (Barbell)",,"",0,"normal",110,3,,,',
    ].join('\n');
    const plan = planImport(readWorkoutCsv(csv), {
      catalog: systemExercises,
      history: [],
      ownerUserId: 'u',
      now,
    });
    const { records, achievedByWorkout } = replayRecords(
      plan.workouts as CompletedWorkout[],
    );
    const weight = records.find((r) => r.type === 'weight');
    expect(weight?.value).toBe(110);
    const byName = new Map(plan.workouts.map((w) => [w.name, w.id]));
    expect(achievedByWorkout.get(byName.get('A')!)?.length).toBe(3);
    expect(achievedByWorkout.get(byName.get('B')!)).toEqual([]);
    expect(achievedByWorkout.get(byName.get('C')!)?.map((r) => r.type)).toEqual(
      ['weight', 'estimated_1rm'],
    );
  });
});

describe('body measurements (Hevy measurement_data.csv)', () => {
  const HEADER =
    '"date","weight_kg","fat_percent","neck_cm","shoulder_cm","chest_cm","left_bicep_cm","right_bicep_cm","left_forearm_cm","right_forearm_cm","abdomen_cm","waist_cm","hips_cm","left_thigh_cm","right_thigh_cm","left_calf_cm","right_calf_cm"';
  const CSV = [
    HEADER,
    '"28 jan 2026, 00:00",75,,,,,,,,,,,,,,,',
    '"3 fev 2026, 00:00",76.2,18.5,,,101,35.5,36,,,,82,,,,,',
    '"9 mar 2026, 00:00",75.05,,,,,,,,,,,,,,,',
    '"sem data",80,,,,,,,,,,,,,,,',
    '"10 mar 2026, 00:00",,,,,,,,,,,,,,,,',
  ].join('\n');

  it('is told apart from a workout export', () => {
    expect(isMeasurementCsv(parseCsv(CSV))).toBe(true);
    expect(isMeasurementCsv(parseCsv(HEVY_SAMPLE))).toBe(false);
    expect(() => readWorkoutCsv(CSV)).toThrow(/medidas/);
  });

  it('reads weight, body fat and circumferences, skipping empty rows', () => {
    const parsed = readMeasurementCsv(CSV);
    expect(parsed.skippedRows).toBe(2);
    expect(parsed.rows).toHaveLength(3);
    const feb = parsed.rows[1];
    expect(new Date(feb.measuredAt).getMonth()).toBe(1);
    expect(feb).toMatchObject({
      weightKg: 76.2,
      fatPercent: 18.5,
      chestCm: 101,
      leftBicepCm: 35.5,
      rightBicepCm: 36,
      waistCm: 82,
    });
    expect(parsed.rows[2].weightKg).toBe(75.05);
  });

  it('converts pounds and inches', () => {
    const parsed = readMeasurementCsv(
      'date,weight_lbs,waist_in\n2026-01-01,165.3,32',
    );
    expect(parsed.rows[0].weightKg).toBeCloseTo(74.98, 2);
    expect(parsed.rows[0].waistCm).toBeCloseTo(81.3, 1);
  });

  it('plans one measurement per day and skips days already recorded', () => {
    const parsed = readMeasurementCsv(CSV);
    const first = planMeasurementImport(parsed, []);
    expect(first.measurements).toHaveLength(3);
    expect(new Date(first.measurements[0].measuredAt).getMonth()).toBe(2); // newest first
    expect(first.fields).toEqual(
      expect.arrayContaining(['weightKg', 'fatPercent', 'chestCm', 'waistCm']),
    );
    const again = planMeasurementImport(parsed, first.measurements);
    expect(again.measurements).toHaveLength(0);
    expect(again.duplicates).toBe(3);
  });
});
