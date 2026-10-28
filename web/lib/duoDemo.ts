import type { LiveDetail, LiveWorkout, SocialProfile } from './friends';

/*
 * The test partner for "Treinar junto": a made-up friend who finishes a set
 * every few seconds, so the feature can be tried without a second account.
 */

export const DEMO_PARTNER: SocialProfile = {
  userId: 'demo',
  username: 'parceiro.teste',
  name: 'Parceiro de teste',
  photoUrl: null,
  shareStats: true,
};

const DEMO_PLAN = [
  { n: 'Supino reto com barra', w: 70, r: 8 },
  { n: 'Remada curvada com barra', w: 60, r: 10 },
  { n: 'Desenvolvimento com halteres', w: 24, r: 10 },
  { n: 'Tríceps corda', w: 30, r: 12 },
];
const DEMO_SETS_EACH = 3;
/** The test partner finishes a set this often. */
export const DEMO_SET_MS = 10_000;

/** The simulated partner's workout `elapsed` ms after starting. */
export function demoLive(startedAt: number, now: number): LiveWorkout {
  const total = DEMO_PLAN.length * DEMO_SETS_EACH;
  const done = Math.min(total, Math.floor((now - startedAt) / DEMO_SET_MS));
  const detail: LiveDetail = {
    e: DEMO_PLAN.map((exercise, index) => {
      const sets = Math.max(
        0,
        Math.min(DEMO_SETS_EACH, done - index * DEMO_SETS_EACH),
      );
      return {
        n: exercise.n,
        s: Array.from({ length: sets }, (_, set): [number, number] => [
          exercise.w + (set === 2 ? 2.5 : 0),
          exercise.r - (set === 2 ? 1 : 0),
        ]),
        t: DEMO_SETS_EACH,
      };
    }),
  };
  const current = detail.e.find((exercise) => exercise.s.length < exercise.t);
  return {
    userId: DEMO_PARTNER.userId,
    name: 'Push (teste)',
    startedAt: new Date(startedAt).toISOString(),
    doneSets: done,
    totalSets: total,
    currentExercise: current?.n ?? null,
    detail,
    endedAt: null,
    updatedAt: new Date(now).toISOString(),
  };
}
