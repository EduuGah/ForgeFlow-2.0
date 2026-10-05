/** How to perform an exercise, written for the gym floor (pt-BR). */
export interface ExerciseGuide {
  /** Muscles worked, in plain words. */
  muscles: string;
  /** Machine, bench and grip setup before the first rep. */
  setup: string[];
  /** One repetition, step by step. */
  steps: string[];
  breathing: string;
  tips: string[];
  mistakes: string[];
}

/** Guides keyed by the last four digits of the catalog id. */
export type GuideMap = Record<string, ExerciseGuide>;
