import type { Exercise } from '../../src/domain/training/entities';
import type {
  CompletedExercise,
  CompletedSet,
  CompletedWorkout,
  SetType,
} from './types';
import { setVolume } from './training';

/*
 * Workout history import from CSV exports of other training apps.
 *
 * Supported layouts (detected from the header row):
 * - Hevy: title, start_time, end_time, exercise_title, set_type, weight_kg |
 *   weight_lbs, reps, distance_km | distance_miles, duration_seconds, …
 *   Dates come localized ("21 de set. de 2026, 21:22", "21 Sep 2026, 21:22").
 * - Strong: Date, Workout Name, Duration, Exercise Name, Set Order, Weight,
 *   Reps, Distance, Seconds, Notes, … (comma or semicolon separated).
 *
 * Everything here is pure so it can be unit tested; the store applies the plan.
 */

export class ImportError extends Error {}

/* ------------------------------------------------------------------ */
/* CSV parsing                                                         */
/* ------------------------------------------------------------------ */

function detectDelimiter(text: string): ',' | ';' {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char === '\n') break;
    else if (!inQuotes && char === ',') commas += 1;
    else if (!inQuotes && char === ';') semicolons += 1;
  }
  return semicolons > commas ? ';' : ',';
}

/** RFC 4180: quoted fields may hold delimiters, doubled quotes and newlines. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const MONTHS: Record<string, number> = {
  jan: 0,
  ene: 0,
  fev: 1,
  feb: 1,
  mar: 2,
  abr: 3,
  apr: 3,
  mai: 4,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  aug: 7,
  set: 8,
  sep: 8,
  out: 9,
  oct: 9,
  nov: 10,
  dez: 11,
  dec: 11,
  dic: 11,
};

function monthIndex(name: string): number | undefined {
  return MONTHS[stripAccents(name).toLowerCase().slice(0, 3)];
}

function to24h(hour: number, meridiem?: string): number {
  if (!meridiem) return hour;
  const pm = meridiem.toLowerCase().startsWith('p');
  if (hour === 12) return pm ? 12 : 0;
  return pm ? hour + 12 : hour;
}

function localDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date | null {
  const date = new Date(year, month, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Accepts the localized Hevy formats ("21 de set. de 2026, 21:22",
 * "21 Sep 2026, 21:22", "Sep 21, 2026, 9:22 PM") and ISO-like
 * "2026-09-21 21:22:00" (Strong). Times are local, as the apps export them.
 */
export function parseImportDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (iso) {
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
      const date = new Date(value.replace(' ', 'T'));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return localDate(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4] ?? 0),
      Number(iso[5] ?? 0),
      Number(iso[6] ?? 0),
    );
  }

  const dayFirst = value.match(
    /^(\d{1,2})(?:\s+de)?\s+([A-Za-zÀ-ÿ]+)\.?(?:\s+de)?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?/,
  );
  if (dayFirst) {
    const month = monthIndex(dayFirst[2]);
    if (month === undefined) return null;
    return localDate(
      Number(dayFirst[3]),
      month,
      Number(dayFirst[1]),
      to24h(Number(dayFirst[4]), dayFirst[6]),
      Number(dayFirst[5]),
    );
  }

  const monthFirst = value.match(
    /^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?/,
  );
  if (monthFirst) {
    const month = monthIndex(monthFirst[1]);
    if (month === undefined) return null;
    return localDate(
      Number(monthFirst[3]),
      month,
      Number(monthFirst[2]),
      to24h(Number(monthFirst[4]), monthFirst[6]),
      Number(monthFirst[5]),
    );
  }

  const slashed = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/,
  );
  if (slashed) {
    return localDate(
      Number(slashed[3]),
      Number(slashed[2]) - 1,
      Number(slashed[1]),
      Number(slashed[4] ?? 0),
      Number(slashed[5] ?? 0),
    );
  }
  return null;
}

/** "1h 5m", "45m", "1:05:00" or seconds → minutes. */
export function parseDurationMinutes(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const clock = value.match(/^(\d+):(\d{2})(?::(\d{2}))?$/);
  if (clock) {
    return clock[3] !== undefined
      ? Number(clock[1]) * 60 + Number(clock[2])
      : Number(clock[1]) + Number(clock[2]) / 60;
  }
  const hours = value.match(/(\d+)\s*h/);
  const minutes = value.match(/(\d+)\s*m(?!s)/);
  if (hours || minutes)
    return Number(hours?.[1] ?? 0) * 60 + Number(minutes?.[1] ?? 0);
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds / 60 : null;
}

/* ------------------------------------------------------------------ */
/* Rows → workouts                                                     */
/* ------------------------------------------------------------------ */

export type ImportFormat = 'hevy' | 'strong';

export interface ParsedExercise {
  sourceName: string;
  notes?: string;
  sets: CompletedSet[];
  distanceKm: number;
  durationSeconds: number;
}

export interface ParsedWorkout {
  title: string;
  startedAt: Date;
  endedAt: Date;
  exercises: ParsedExercise[];
}

export interface ParsedFile {
  format: ImportFormat;
  workouts: ParsedWorkout[];
  /** Rows without a usable date. */
  skippedRows: number;
}

const LB_TO_KG = 0.45359237;
const MILE_TO_KM = 1.609344;

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const value = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

interface Row {
  title: string;
  start: string;
  end: string;
  durationMinutes: number | null;
  exercise: string;
  notes: string;
  setType: SetType;
  weightKg: number;
  reps: number;
  distanceKm: number;
  seconds: number;
}

function headerIndex(header: string[]) {
  const normalized = header.map((name) => name.trim().toLowerCase());
  return (...names: string[]) => {
    for (const name of names) {
      const index = normalized.indexOf(name);
      if (index !== -1) return index;
    }
    return -1;
  };
}

function readRows(table: string[][]): { format: ImportFormat; rows: Row[] } {
  const [header, ...body] = table;
  if (!header) throw new ImportError('O arquivo está vazio.');
  const col = headerIndex(header);
  const at = (row: string[], index: number) =>
    index === -1 ? '' : (row[index] ?? '').trim();

  if (col('exercise_title') !== -1 && col('start_time') !== -1) {
    const i = {
      title: col('title'),
      start: col('start_time'),
      end: col('end_time'),
      exercise: col('exercise_title'),
      notes: col('exercise_notes'),
      type: col('set_type'),
      kg: col('weight_kg'),
      lbs: col('weight_lbs'),
      reps: col('reps'),
      km: col('distance_km'),
      miles: col('distance_miles'),
      seconds: col('duration_seconds'),
    };
    return {
      format: 'hevy',
      rows: body.map((row) => ({
        title: at(row, i.title),
        start: at(row, i.start),
        end: at(row, i.end),
        durationMinutes: null,
        exercise: at(row, i.exercise),
        notes: at(row, i.notes),
        setType:
          at(row, i.type).toLowerCase() === 'warmup' ? 'warmup' : 'working',
        weightKg:
          i.kg !== -1
            ? toNumber(at(row, i.kg))
            : toNumber(at(row, i.lbs)) * LB_TO_KG,
        reps: toNumber(at(row, i.reps)),
        distanceKm:
          i.km !== -1
            ? toNumber(at(row, i.km))
            : toNumber(at(row, i.miles)) * MILE_TO_KM,
        seconds: toNumber(at(row, i.seconds)),
      })),
    };
  }

  if (col('exercise name') !== -1 && col('date') !== -1) {
    const i = {
      date: col('date'),
      title: col('workout name'),
      duration: col('duration', 'workout duration'),
      exercise: col('exercise name'),
      order: col('set order'),
      weight: col('weight', 'weight (kg)'),
      reps: col('reps'),
      distance: col('distance', 'distance (km)'),
      seconds: col('seconds'),
      notes: col('notes'),
    };
    return {
      format: 'strong',
      rows: body.map((row) => ({
        title: at(row, i.title),
        start: at(row, i.date),
        end: '',
        durationMinutes: parseDurationMinutes(at(row, i.duration)),
        exercise: at(row, i.exercise),
        notes: at(row, i.notes),
        setType: /^w/i.test(at(row, i.order)) ? 'warmup' : 'working',
        weightKg: toNumber(at(row, i.weight)),
        reps: toNumber(at(row, i.reps)),
        distanceKm: toNumber(at(row, i.distance)),
        seconds: toNumber(at(row, i.seconds)),
      })),
    };
  }

  throw new ImportError(
    'Formato não reconhecido. Use o CSV exportado pelo Hevy ou pelo Strong.',
  );
}

/** Groups set rows into workouts and consecutive rows into exercises. */
export function readWorkoutCsv(text: string): ParsedFile {
  const { format, rows } = readRows(parseCsv(text));
  const workouts = new Map<string, ParsedWorkout>();
  let skippedRows = 0;

  for (const row of rows) {
    const startedAt = parseImportDate(row.start);
    if (!startedAt || !row.exercise) {
      skippedRows += 1;
      continue;
    }
    const key = `${row.title}|${startedAt.getTime()}`;
    let workout = workouts.get(key);
    if (!workout) {
      const parsedEnd = parseImportDate(row.end);
      const fallbackMinutes = row.durationMinutes ?? 60;
      const endedAt =
        parsedEnd && parsedEnd.getTime() > startedAt.getTime()
          ? parsedEnd
          : new Date(startedAt.getTime() + fallbackMinutes * 60000);
      workout = {
        title: row.title || 'Treino importado',
        startedAt,
        endedAt,
        exercises: [],
      };
      workouts.set(key, workout);
    }

    let exercise = workout.exercises.at(-1);
    if (!exercise || exercise.sourceName !== row.exercise) {
      exercise = {
        sourceName: row.exercise,
        sets: [],
        distanceKm: 0,
        durationSeconds: 0,
      };
      workout.exercises.push(exercise);
    }
    if (!exercise.notes && row.notes) exercise.notes = row.notes;
    exercise.distanceKm += row.distanceKm;
    exercise.durationSeconds += row.seconds;
    if (row.reps > 0) {
      exercise.sets.push({
        type: row.setType,
        weightKg: round(Math.max(0, row.weightKg)),
        repetitions: Math.round(row.reps),
      });
    }
  }

  const list = [...workouts.values()]
    .map((workout) => ({
      ...workout,
      exercises: workout.exercises.filter(
        (exercise) =>
          exercise.sets.length > 0 ||
          exercise.distanceKm > 0 ||
          exercise.durationSeconds > 0,
      ),
    }))
    .filter((workout) => workout.exercises.length > 0)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  return { format, workouts: list, skippedRows };
}

/* ------------------------------------------------------------------ */
/* Exercise matching                                                   */
/* ------------------------------------------------------------------ */

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** "Lat Pulldown - Close Grip (Cable)" → "lat pulldown close grip cable". */
export function normalizeExerciseName(name: string): string {
  return stripAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const catalogId = (n: number) =>
  `00000000-0000-4000-8000-00000000${String(n).padStart(4, '0')}`;

/**
 * English names used by Hevy/Strong → ForgeFlow catalog. Only unambiguous
 * equivalents: a different machine or grip becomes its own exercise, so its
 * loads never mix with another exercise's records.
 */
const KNOWN_NAMES: Record<string, number> = {
  // Back
  'pull up': 1001,
  'chin up': 1002,
  'lat pulldown cable': 1003,
  'lat pulldown': 1003,
  'lat pulldown close grip cable': 1004,
  'close grip lat pulldown': 1004,
  'seated cable row v grip cable': 1005,
  'seated cable row': 1005,
  'seated row cable': 1005,
  'bent over row barbell': 1006,
  'bent over row': 1006,
  'dumbbell row': 1007,
  'single arm dumbbell row': 1007,
  't bar row': 1008,
  'deadlift barbell': 1009,
  deadlift: 1009,
  'rack pull': 1010,
  'rope straight arm pulldown': 1011,
  'straight arm pulldown cable': 1011,
  'back extension hyperextension': 1012,
  'back extension': 1012,
  'wide pull up': 1013,
  'assisted pull up': 1014,
  'pull up assisted': 1014,
  'reverse grip lat pulldown cable': 1015,
  'single arm cable row': 1016,
  'iso lateral row machine': 1017,
  'seated row machine': 1017,
  'inverted row': 1018,
  'shrug barbell': 1019,
  'shrug dumbbell': 1020,
  // Biceps
  'bicep curl barbell': 1021,
  'barbell curl': 1021,
  'ez bar biceps curl': 1022,
  'bicep curl dumbbell': 1023,
  'dumbbell curl': 1023,
  'seated incline curl dumbbell': 1024,
  'incline curl dumbbell': 1024,
  'hammer curl dumbbell': 1025,
  'hammer curl': 1025,
  'concentration curl': 1026,
  'preacher curl barbell': 1027,
  'bicep curl cable': 1028,
  'cable curl': 1028,
  'reverse curl barbell': 1029,
  'zottman curl': 1030,
  'spider curl barbell': 1031,
  'drag curl': 1032,
  'cross body hammer curl': 1033,
  'hammer curl cable': 1034,
  'preacher curl machine': 1035,
  'single arm curl cable': 1036,
  // Chest
  'bench press barbell': 1037,
  'bench press': 1037,
  'incline bench press barbell': 1038,
  'decline bench press barbell': 1039,
  'bench press dumbbell': 1040,
  'incline bench press dumbbell': 1041,
  'decline bench press dumbbell': 1042,
  'push up': 1043,
  'incline push ups': 1044,
  'decline push up': 1045,
  'chest fly dumbbell': 1046,
  'incline chest fly dumbbell': 1047,
  'cable fly crossovers': 1048,
  'cable crossover': 1048,
  'low cable fly crossovers': 1049,
  'chest fly machine': 1050,
  'chest dip': 1051,
  'wide grip push up': 1052,
  'diamond push up': 1053,
  'chest dip weighted': 1054,
  'chest press machine': 1056,
  'butterfly pec deck': 1057,
  'pec deck': 1057,
  // Core
  crunch: 1058,
  'sit up': 1059,
  'lying leg raise': 1060,
  'hanging leg raise': 1061,
  'russian twist': 1062,
  plank: 1063,
  'side plank': 1064,
  'mountain climber': 1065,
  'bicycle crunch': 1066,
  'cable crunch': 1067,
  'reverse crunch': 1068,
  'ab wheel': 1069,
  'hanging knee raise': 1071,
  'flutter kicks': 1072,
  'dead bug': 1073,
  'v up': 1074,
  // Legs
  'squat barbell': 1076,
  squat: 1076,
  'front squat': 1077,
  'leg press machine': 1078,
  'leg press': 1078,
  'leg extension machine': 1079,
  'leg extension': 1079,
  'lying leg curl machine': 1080,
  'romanian deadlift barbell': 1081,
  'romanian deadlift': 1081,
  'straight leg deadlift': 1082,
  'stiff leg deadlift': 1082,
  'walking lunge': 1083,
  'bulgarian split squat': 1084,
  'hip thrust barbell': 1085,
  'hip thrust': 1085,
  'standing calf raise machine': 1086,
  'standing calf raise': 1086,
  'seated calf raise': 1087,
  'seated calf raise machine': 1087,
  'goblet squat': 1088,
  'hack squat machine': 1089,
  'hack squat': 1089,
  'sumo deadlift': 1090,
  'good morning barbell': 1091,
  'glute bridge': 1092,
  'cable pull through': 1093,
  'seated leg curl machine': 1094,
  'seated leg curl': 1094,
  'standing leg curl': 1095,
  'squat smith machine': 1096,
  'smith machine squat': 1096,
  'calf extension machine': 1097,
  'calf press on leg press': 1097,
  // Shoulders
  'overhead press barbell': 1098,
  'overhead press': 1098,
  'military press': 1098,
  'overhead press dumbbell': 1099,
  'shoulder press dumbbell': 1099,
  'arnold press dumbbell': 1100,
  'arnold press': 1100,
  'lateral raise dumbbell': 1101,
  'lateral raise': 1101,
  'lateral raise cable': 1102,
  'front raise dumbbell': 1103,
  'rear delt reverse fly dumbbell': 1104,
  'reverse fly dumbbell': 1104,
  'face pull': 1105,
  'upright row barbell': 1106,
  'seated overhead press barbell': 1108,
  'seated overhead press dumbbell': 1109,
  'seated shoulder press machine': 1110,
  'shoulder press machine': 1110,
  'front raise cable': 1111,
  'plate front raise': 1112,
  'rear delt reverse fly machine': 1113,
  'reverse fly machine': 1113,
  'front raise barbell': 1114,
  // Triceps
  'triceps pushdown': 1115,
  'tricep pushdown': 1115,
  'triceps rope pushdown': 1116,
  'overhead triceps extension cable': 1117,
  'skullcrusher barbell': 1118,
  'lying triceps extension barbell': 1118,
  'skullcrusher ez bar': 1127,
  'close grip bench press': 1120,
  'bench dip': 1121,
  'triceps dip': 1122,
  'triceps kickback dumbbell': 1123,
  'single arm triceps extension dumbbell': 1124,
  'single arm triceps pushdown cable': 1125,
  'overhead triceps extension dumbbell': 1126,
  'triceps extension dumbbell': 1126,
  'reverse grip triceps pushdown': 1128,
  'triceps extension machine': 1130,
};

const GROUP_KEYWORDS: [group: string, keywords: string[]][] = [
  [
    'Cardio',
    [
      'treadmill',
      'esteira',
      'bike',
      'cycling',
      'bicicleta',
      'running',
      'corrida',
      'elliptical',
      'eliptico',
      'rowing machine',
      'remo ergometro',
      'cardio',
      'walking',
      'caminhada',
      'jump rope',
      'corda',
      'stair',
      'escada',
      'spinning',
    ],
  ],
  [
    'Core',
    [
      'crunch',
      'abdominal',
      'plank',
      'prancha',
      'sit up',
      'leg raise',
      'knee raise',
      'oblique',
      'obliquo',
      ' ab ',
      'core',
    ],
  ],
  [
    'Pernas',
    [
      'squat',
      'agachamento',
      'leg press',
      'leg extension',
      'leg curl',
      'extensora',
      'flexora',
      'calf',
      'panturrilha',
      'lunge',
      'avanco',
      'afundo',
      'hip thrust',
      'elevacao pelvica',
      'glute',
      'gluteo',
      'romanian',
      'stiff',
      'straight leg',
      'hack',
      'adductor',
      'adutora',
      'abductor',
      'abdutora',
      'perna',
      'leg',
    ],
  ],
  [
    'Triceps',
    [
      'tricep',
      'pushdown',
      'skull',
      'frances',
      'dip',
      'mergulho',
      'kickback',
      'coice',
    ],
  ],
  [
    'Ombros',
    [
      'shoulder',
      'ombro',
      'lateral raise',
      'elevacao lateral',
      'front raise',
      'elevacao frontal',
      'overhead press',
      'military',
      'desenvolvimento',
      'delt',
      'face pull',
      'arnold',
      'upright row',
      'remada alta',
      'reverse fly',
      'crucifixo inverso',
    ],
  ],
  [
    'Costas',
    [
      'row',
      'remada',
      'pulldown',
      'puxada',
      'pull up',
      'chin up',
      'barra fixa',
      'deadlift',
      'terra',
      'shrug',
      'encolhimento',
      'lat ',
      'pullover',
      'back',
      'costas',
      'lombar',
    ],
  ],
  ['Biceps', ['curl', 'rosca', 'bicep']],
  [
    'Peito',
    [
      'bench',
      'supino',
      'chest',
      'peito',
      'fly',
      'crucifixo',
      'crossover',
      'pec',
      'push up',
      'flexao',
      'voador',
    ],
  ],
];

/** Best guess of the primary muscle group from the exercise name. */
export function guessMuscleGroup(name: string): string {
  const text = ` ${normalizeExerciseName(name)} `;
  for (const [group, keywords] of GROUP_KEYWORDS) {
    if (keywords.some((keyword) => text.includes(keyword))) return group;
  }
  return 'Geral';
}

const EQUIPMENT: [pattern: RegExp, label: string][] = [
  [/smith/i, 'Maquina Smith'],
  [/barbell|barra(?! fixa)/i, 'Barra'],
  [/dumbbell|halter/i, 'Halteres'],
  [/cable|cabo|polia|rope|corda/i, 'Cabo'],
  [/machine|maquina|máquina/i, 'Maquina'],
  [/bodyweight|peso corporal/i, 'Peso corporal'],
  [/kettlebell/i, 'Kettlebell'],
  [/band|elastic/i, 'Elástico'],
];

export function guessEquipment(name: string): string | null {
  return EQUIPMENT.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

type CatalogEntry = Pick<Exercise, 'id' | 'name' | 'primaryMuscleGroup'>;

export interface ExerciseMatch {
  sourceName: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscleGroup: string;
  /** false when a new custom exercise will be created for it. */
  recognized: boolean;
}

/**
 * Resolves each source name to a catalog exercise, an existing custom
 * exercise with the same name, or a new custom exercise (stable id, so
 * importing the same file twice never duplicates it).
 */
export function matchExercises(
  sourceNames: string[],
  catalog: CatalogEntry[],
): ExerciseMatch[] {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const byName = new Map(
    catalog.map((exercise) => [normalizeExerciseName(exercise.name), exercise]),
  );
  return [...new Set(sourceNames)].map((sourceName) => {
    const key = normalizeExerciseName(sourceName);
    const known = KNOWN_NAMES[key];
    const found =
      (known !== undefined ? byId.get(catalogId(known)) : undefined) ??
      byName.get(key);
    if (found) {
      return {
        sourceName,
        exerciseId: found.id,
        exerciseName: found.name,
        primaryMuscleGroup: found.primaryMuscleGroup,
        recognized: true,
      };
    }
    return {
      sourceName,
      exerciseId: `custom-import-${key.replace(/ /g, '-') || 'exercicio'}`,
      exerciseName: sourceName.trim(),
      primaryMuscleGroup: guessMuscleGroup(sourceName),
      recognized: false,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Import plan                                                         */
/* ------------------------------------------------------------------ */

export interface ImportPlan {
  format: ImportFormat;
  /** New workouts, newest first, ready to store. */
  workouts: CompletedWorkout[];
  /** Custom exercises to create (not in the catalog nor already custom). */
  newExercises: Exercise[];
  matches: ExerciseMatch[];
  duplicates: number;
  skippedRows: number;
  totalSets: number;
  firstDate: string | null;
  lastDate: string | null;
}

/** Workouts are the same when they start in the same minute. */
function minuteKey(iso: string | Date): number {
  return Math.floor(new Date(iso).getTime() / 60000);
}

function describeCardio(exercise: ParsedExercise): string | undefined {
  const parts: string[] = [];
  if (exercise.distanceKm > 0)
    parts.push(`${String(round(exercise.distanceKm)).replace('.', ',')} km`);
  if (exercise.durationSeconds > 0)
    parts.push(`${Math.round(exercise.durationSeconds / 60)} min`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function planImport(
  parsed: ParsedFile,
  options: {
    catalog: CatalogEntry[];
    history: CompletedWorkout[];
    ownerUserId: string;
    now: Date;
  },
): ImportPlan {
  const matches = matchExercises(
    parsed.workouts.flatMap((workout) =>
      workout.exercises.map((exercise) => exercise.sourceName),
    ),
    options.catalog,
  );
  const matchOf = new Map(matches.map((match) => [match.sourceName, match]));
  const existing = new Set(
    options.history.map((workout) => minuteKey(workout.startedAt)),
  );

  let duplicates = 0;
  let totalSets = 0;
  const workouts: CompletedWorkout[] = [];

  for (const source of parsed.workouts) {
    const key = minuteKey(source.startedAt);
    if (existing.has(key)) {
      duplicates += 1;
      continue;
    }
    existing.add(key);

    let volume = 0;
    let sets = 0;
    let reps = 0;
    const exercises: CompletedExercise[] = source.exercises.map((exercise) => {
      const match = matchOf.get(exercise.sourceName)!;
      const working = exercise.sets.filter((set) => set.type === 'working');
      const exerciseVolume = working.reduce(
        (sum, set) => sum + setVolume(set),
        0,
      );
      volume += exerciseVolume;
      sets += working.length;
      reps += working.reduce((sum, set) => sum + set.repetitions, 0);
      const notes = [describeCardio(exercise), exercise.notes?.trim()]
        .filter(Boolean)
        .join('\n');
      const completed: CompletedExercise = {
        exerciseId: match.exerciseId,
        exerciseName: match.exerciseName,
        primaryMuscleGroup: match.primaryMuscleGroup,
        setsCount: working.length,
        bestWeightKg: working.reduce(
          (best, set) => Math.max(best, set.weightKg),
          0,
        ),
        totalVolumeKg: round(exerciseVolume),
        sets: exercise.sets,
      };
      if (notes) completed.notes = notes;
      return completed;
    });

    totalSets += sets;
    workouts.push({
      id: `import-${source.startedAt.getTime().toString(36)}`,
      name: source.title,
      startedAt: source.startedAt.toISOString(),
      completedAt: source.endedAt.toISOString(),
      durationMinutes: Math.max(
        1,
        Math.round(
          (source.endedAt.getTime() - source.startedAt.getTime()) / 60000,
        ),
      ),
      totalVolumeKg: round(volume),
      totalSets: sets,
      totalReps: reps,
      exercises,
      prsAchieved: [],
    });
  }

  const used = new Set(
    workouts.flatMap((workout) =>
      workout.exercises.map((exercise) => exercise.exerciseId),
    ),
  );
  const timestamp = options.now.toISOString();
  const newExercises: Exercise[] = matches
    .filter((match) => !match.recognized && used.has(match.exerciseId))
    .map((match) => ({
      id: match.exerciseId,
      name: match.exerciseName,
      primaryMuscleGroup: match.primaryMuscleGroup,
      secondaryMuscleGroups: [],
      equipment: guessEquipment(match.sourceName),
      description: 'Importado de outro app.',
      isSystem: false,
      ownerUserId: options.ownerUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }));

  workouts.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  return {
    format: parsed.format,
    workouts,
    newExercises,
    matches,
    duplicates,
    skippedRows: parsed.skippedRows,
    totalSets,
    firstDate: workouts.at(-1)?.startedAt ?? null,
    lastDate: workouts[0]?.startedAt ?? null,
  };
}
