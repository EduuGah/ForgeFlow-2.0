import { systemExercises } from '../../src/data/seeds/systemExercises';
import {
  ImportError,
  guessMuscleGroup,
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
      { type: 'working', weightKg: 62.5, repetitions: 6 },
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
    expect(leg.exercises[0]).toMatchObject({
      sourceName: 'Treadmill',
      sets: [],
      distanceKm: 7,
      durationSeconds: 3600,
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
    expect(first.workouts[1].exercises[0]).toMatchObject({
      exerciseName: 'Treadmill',
      notes: '7 km · 60 min',
      setsCount: 0,
    });
    expect(first.newExercises.map((e) => e.name).sort()).toEqual([
      'Seated Dip Machine',
      'Treadmill',
    ]);
    expect(first.newExercises[0].ownerUserId).toBe('u1');
    expect(first.totalSets).toBe(5);

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
