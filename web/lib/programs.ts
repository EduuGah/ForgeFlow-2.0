import { systemExercises } from '../../src/data/seeds/systemExercises';
import { searchKey } from './format';
import type { TemplateExercise } from './types';

/*
 * Ready-made programs: a few routines that work together, for people who
 * don't want to build their own. Exercises are named as in the catalog and
 * resolved to its ids when the program is added.
 */

type Line = [name: string, sets: number, reps: number, repsMax?: number];

export interface ProgramRoutine {
  name: string;
  /** Default rest for this routine, in seconds. */
  rest: number;
  exercises: Line[];
}

export interface Program {
  id: string;
  name: string;
  level: 'Iniciante' | 'Intermediário';
  daysPerWeek: number;
  place: 'Academia' | 'Em casa';
  description: string;
  /** Suggested weekdays (0 = domingo), in order: routine i on day i. */
  schedule: number[];
  routines: ProgramRoutine[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'full-body-iniciante',
    name: 'Primeiros passos: corpo todo',
    level: 'Iniciante',
    daysPerWeek: 3,
    place: 'Academia',
    description:
      'Dois treinos de corpo todo alternados (A, B, A…). Aprenda os movimentos com cargas leves e suba aos poucos.',
    schedule: [1, 3, 5],
    routines: [
      {
        name: 'Corpo todo A',
        rest: 90,
        exercises: [
          ['Agachamento goblet', 3, 10, 12],
          ['Supino reto com halteres', 3, 8, 12],
          ['Puxada alta', 3, 10, 12],
          ['Desenvolvimento com halteres', 2, 10, 12],
          ['Prancha', 3, 30],
        ],
      },
      {
        name: 'Corpo todo B',
        rest: 90,
        exercises: [
          ['Leg press', 3, 10, 12],
          ['Remada baixa no cabo', 3, 10, 12],
          ['Supino inclinado com halteres', 3, 10, 12],
          ['Mesa flexora', 3, 10, 12],
          ['Elevacao lateral com halteres', 2, 12, 15],
          ['Abdominal crunch', 3, 12, 15],
        ],
      },
    ],
  },
  {
    id: 'casa-iniciante',
    name: 'Em casa, sem equipamento',
    level: 'Iniciante',
    daysPerWeek: 3,
    place: 'Em casa',
    description:
      'Só com o peso do corpo, uma cadeira e o chão. Bom para começar ou para dias sem academia.',
    schedule: [1, 3, 5],
    routines: [
      {
        name: 'Corpo todo em casa',
        rest: 60,
        exercises: [
          ['Flexao de bracos', 3, 8, 12],
          ['Avanco caminhando', 3, 10, 12],
          ['Ponte de gluteos', 3, 12, 15],
          ['Mergulho no banco', 3, 8, 12],
          ['Prancha', 3, 30],
          ['Abdominal bicicleta', 3, 15],
          ['Escalador', 3, 20],
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    name: 'Superior e inferior',
    level: 'Intermediário',
    daysPerWeek: 4,
    place: 'Academia',
    description:
      'Quatro dias: parte de cima e parte de baixo duas vezes cada. Cada músculo treina 2x por semana.',
    schedule: [1, 2, 4, 5],
    routines: [
      {
        name: 'Superior A',
        rest: 120,
        exercises: [
          ['Supino reto com barra', 4, 6, 8],
          ['Remada curvada com barra', 4, 6, 8],
          ['Desenvolvimento com halteres', 3, 8, 10],
          ['Puxada alta', 3, 8, 10],
          ['Rosca direta com barra', 2, 10, 12],
          ['Triceps corda', 2, 10, 12],
        ],
      },
      {
        name: 'Inferior A',
        rest: 120,
        exercises: [
          ['Agachamento com barra', 4, 6, 8],
          ['Levantamento terra romeno', 3, 8, 10],
          ['Leg press', 3, 10, 12],
          ['Mesa flexora', 3, 10, 12],
          ['Panturrilha em pe', 4, 10, 15],
        ],
      },
      {
        name: 'Superior B',
        rest: 120,
        exercises: [
          ['Supino inclinado com halteres', 4, 8, 10],
          ['Barra fixa', 4, 6, 10],
          ['Elevacao lateral com halteres', 3, 12, 15],
          ['Remada unilateral com halter', 3, 10, 12],
          ['Rosca martelo', 2, 10, 12],
          ['Triceps testa deitado', 2, 10, 12],
        ],
      },
      {
        name: 'Inferior B',
        rest: 120,
        exercises: [
          ['Levantamento terra', 3, 5],
          ['Agachamento bulgaro', 3, 8, 10],
          ['Cadeira extensora', 3, 12, 15],
          ['Cadeira flexora', 3, 12, 15],
          ['Panturrilha sentada', 4, 12, 15],
          ['Elevacao de pernas suspenso', 3, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push, Pull, Legs',
    level: 'Intermediário',
    daysPerWeek: 3,
    place: 'Academia',
    description:
      'Empurrar, puxar e pernas. Faça 3x por semana ou repita o ciclo para 6x.',
    schedule: [1, 3, 5],
    routines: [
      {
        name: 'Push',
        rest: 120,
        exercises: [
          ['Supino reto com barra', 4, 6, 10],
          ['Supino inclinado com halteres', 3, 8, 12],
          ['Desenvolvimento com halteres', 3, 8, 12],
          ['Elevacao lateral com halteres', 3, 12, 15],
          ['Triceps corda', 3, 10, 12],
          ['Triceps acima da cabeca no cabo', 2, 10, 12],
        ],
      },
      {
        name: 'Pull',
        rest: 120,
        exercises: [
          ['Barra fixa', 4, 6, 10],
          ['Remada curvada com barra', 3, 8, 10],
          ['Puxada alta pegada fechada', 3, 10, 12],
          ['Face pull', 3, 12, 15],
          ['Rosca direta com barra', 3, 8, 12],
          ['Rosca martelo', 2, 10, 12],
        ],
      },
      {
        name: 'Legs',
        rest: 150,
        exercises: [
          ['Agachamento com barra', 4, 6, 10],
          ['Levantamento terra romeno', 3, 8, 10],
          ['Leg press', 3, 10, 12],
          ['Cadeira extensora', 3, 12, 15],
          ['Mesa flexora', 3, 12, 15],
          ['Panturrilha em pe', 4, 10, 15],
        ],
      },
    ],
  },
  {
    id: 'forca-5x5',
    name: 'Força 5x5',
    level: 'Intermediário',
    daysPerWeek: 3,
    place: 'Academia',
    description:
      'Poucos exercícios básicos, 5 séries de 5 com carga pesada. Alterne A e B e suba a carga quando completar tudo.',
    schedule: [1, 3, 5],
    routines: [
      {
        name: '5x5 A',
        rest: 180,
        exercises: [
          ['Agachamento com barra', 5, 5],
          ['Supino reto com barra', 5, 5],
          ['Remada curvada com barra', 5, 5],
        ],
      },
      {
        name: '5x5 B',
        rest: 180,
        exercises: [
          ['Agachamento com barra', 5, 5],
          ['Desenvolvimento com barra', 5, 5],
          ['Levantamento terra', 1, 5],
        ],
      },
    ],
  },
  {
    id: 'gluteos-pernas',
    name: 'Glúteos e pernas',
    level: 'Iniciante',
    daysPerWeek: 2,
    place: 'Academia',
    description:
      'Dois treinos de membros inferiores: um com foco em glúteos e posterior, outro em quadríceps.',
    schedule: [2, 5],
    routines: [
      {
        name: 'Glúteos e posterior',
        rest: 90,
        exercises: [
          ['Elevacao pelvica', 4, 8, 12],
          ['Levantamento terra romeno', 3, 8, 12],
          ['Agachamento bulgaro', 3, 8, 12],
          ['Pull through no cabo', 3, 12, 15],
          ['Ponte de gluteos', 2, 12, 15],
        ],
      },
      {
        name: 'Quadríceps e panturrilha',
        rest: 90,
        exercises: [
          ['Agachamento com barra', 4, 8, 10],
          ['Leg press', 3, 10, 12],
          ['Hack squat', 3, 10, 12],
          ['Cadeira extensora', 3, 12, 15],
          ['Panturrilha em pe', 4, 10, 15],
        ],
      },
    ],
  },
];

const byName = new Map(
  systemExercises.map((exercise) => [searchKey(exercise.name), exercise]),
);

/** A routine's exercises with catalog ids; unknown names are left out. */
export function programExercises(routine: ProgramRoutine): TemplateExercise[] {
  const exercises: TemplateExercise[] = [];
  for (const [name, sets, reps, repsMax] of routine.exercises) {
    const exercise = byName.get(searchKey(name));
    if (!exercise) continue;
    exercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetSets: sets,
      targetReps: reps,
      ...(repsMax ? { targetRepsMax: repsMax } : {}),
      restSeconds: routine.rest,
    });
  }
  return exercises;
}

/** Names that the catalog doesn't know (for tests). */
export function unknownProgramExercises(): string[] {
  return PROGRAMS.flatMap((program) =>
    program.routines.flatMap((routine) =>
      routine.exercises
        .map(([name]) => name)
        .filter((name) => !byName.has(searchKey(name))),
    ),
  );
}
