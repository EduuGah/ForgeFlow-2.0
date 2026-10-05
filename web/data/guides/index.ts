import { BACK_GUIDES } from './back';
import { BICEPS_GUIDES } from './biceps';
import { CHEST_GUIDES } from './chest';
import { CORE_GUIDES } from './core';
import { LEG_GUIDES } from './legs';
import { SHOULDER_GUIDES } from './shoulders';
import { TRICEPS_GUIDES } from './triceps';
import type { ExerciseGuide, GuideMap } from './types';

export type { ExerciseGuide } from './types';

export const GUIDES: GuideMap = {
  ...BACK_GUIDES,
  ...BICEPS_GUIDES,
  ...CHEST_GUIDES,
  ...CORE_GUIDES,
  ...LEG_GUIDES,
  ...SHOULDER_GUIDES,
  ...TRICEPS_GUIDES,
};

const CATALOG_PREFIX = '00000000-0000-4000-8000-00000000';

/** Step-by-step guide of a catalog exercise; custom exercises have none. */
export function exerciseGuide(exerciseId: string): ExerciseGuide | null {
  if (!exerciseId.startsWith(CATALOG_PREFIX)) return null;
  return GUIDES[exerciseId.slice(CATALOG_PREFIX.length)] ?? null;
}
