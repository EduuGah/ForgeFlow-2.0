/*
 * Which parts of the body a workout (or a week) worked, for the body map.
 * Primary muscles count each set fully; secondary ones count half.
 */

export type BodyRegion =
  | 'chest'
  | 'delts'
  | 'biceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'quads'
  | 'shins'
  | 'traps'
  | 'rearDelts'
  | 'lats'
  | 'midBack'
  | 'lowerBack'
  | 'triceps'
  | 'glutes'
  | 'hamstrings'
  | 'calves';

export const REGION_LABELS: Record<BodyRegion, string> = {
  chest: 'Peito',
  delts: 'Ombros',
  biceps: 'Bíceps',
  forearms: 'Antebraços',
  abs: 'Abdômen',
  obliques: 'Oblíquos',
  quads: 'Quadríceps',
  shins: 'Canelas',
  traps: 'Trapézio',
  rearDelts: 'Ombro posterior',
  lats: 'Dorsais',
  midBack: 'Meio das costas',
  lowerBack: 'Lombar',
  triceps: 'Tríceps',
  glutes: 'Glúteos',
  hamstrings: 'Posterior de coxa',
  calves: 'Panturrilhas',
};

/** A muscle name (primary group or a catalog secondary) → regions, weight. */
const NAMES: Record<string, [BodyRegion, number][]> = {
  peito: [['chest', 1]],
  peitoral: [['chest', 1]],
  'peitoral superior': [['chest', 1]],
  costas: [
    ['lats', 1],
    ['midBack', 1],
    ['traps', 0.5],
    ['lowerBack', 0.5],
  ],
  dorsal: [['lats', 1]],
  romboides: [['midBack', 1]],
  trapezio: [['traps', 1]],
  lombar: [['lowerBack', 1]],
  pernas: [
    ['quads', 1],
    ['glutes', 1],
    ['hamstrings', 1],
    ['calves', 0.5],
    ['shins', 0.5],
  ],
  quadriceps: [['quads', 1]],
  adutores: [['quads', 0.5]],
  'flexores do quadril': [['quads', 0.5]],
  gluteos: [['glutes', 1]],
  'posterior de coxa': [['hamstrings', 1]],
  panturrilhas: [
    ['calves', 1],
    ['shins', 0.5],
  ],
  ombros: [
    ['delts', 1],
    ['rearDelts', 1],
  ],
  biceps: [['biceps', 1]],
  triceps: [['triceps', 1]],
  antebracos: [['forearms', 1]],
  braquiorradial: [['forearms', 1]],
  core: [
    ['abs', 1],
    ['obliques', 1],
  ],
  abdomen: [['abs', 1]],
  obliquos: [['obliques', 1]],
};

function key(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

export function regionsOf(
  name: string | null | undefined,
): [BodyRegion, number][] {
  return name ? (NAMES[key(name)] ?? []) : [];
}

/**
 * As a helper muscle, "Ombros" is the front of the shoulder (bench, dips,
 * push-ups); rows and face pulls name the back ones themselves.
 */
const SECONDARY: Record<string, [BodyRegion, number][]> = {
  ombros: [['delts', 1]],
};

function secondaryRegions(name: string): [BodyRegion, number][] {
  return SECONDARY[key(name)] ?? regionsOf(name);
}

export interface MuscleWork {
  primary?: string | null;
  secondary?: string[];
  /** Working sets done. */
  sets: number;
}

/** Sets per region: primary muscles count fully, secondary ones half. */
export function regionLoad(
  work: MuscleWork[],
): Partial<Record<BodyRegion, number>> {
  const load: Partial<Record<BodyRegion, number>> = {};
  const add = (
    regions: [BodyRegion, number][],
    factor: number,
    sets: number,
  ) => {
    for (const [region, weight] of regions) {
      load[region] = (load[region] ?? 0) + sets * weight * factor;
    }
  };
  for (const item of work) {
    if (!(item.sets > 0)) continue;
    const primary = regionsOf(item.primary);
    add(primary, 1, item.sets);
    const primaryRegions = new Set(primary.map(([region]) => region));
    // A secondary already covered by the primary does not count twice.
    for (const name of item.secondary ?? []) {
      const regions = secondaryRegions(name);
      if (regions.every(([region]) => primaryRegions.has(region))) continue;
      add(regions, 0.5, item.sets);
    }
  }
  return load;
}

/** 0..1 glow per region: `full` sets light a region completely. */
export function regionIntensity(
  load: Partial<Record<BodyRegion, number>>,
  full: number,
): Partial<Record<BodyRegion, number>> {
  const intensity: Partial<Record<BodyRegion, number>> = {};
  for (const [region, sets] of Object.entries(load) as [BodyRegion, number][]) {
    if (sets > 0) intensity[region] = Math.min(1, 0.3 + (0.7 * sets) / full);
  }
  return intensity;
}

/** The most worked regions, most first. */
export function topRegions(
  load: Partial<Record<BodyRegion, number>>,
  limit = 4,
): { region: BodyRegion; label: string; sets: number }[] {
  return (Object.entries(load) as [BodyRegion, number][])
    .filter(([, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([region, sets]) => ({
      region,
      label: REGION_LABELS[region],
      sets: Math.round(sets * 10) / 10,
    }));
}

/** How strongly the map lights the muscles that only help (synergists). */
export const SYNERGIST_GLOW = 0.4;

/**
 * One exercise on the map: its main muscle fully lit, the ones that help
 * (synergists) lit softly.
 */
export function exerciseIntensity(
  primary: string | null | undefined,
  secondary: string[],
): Partial<Record<BodyRegion, number>> {
  const intensity: Partial<Record<BodyRegion, number>> = {};
  const light = (region: BodyRegion, value: number) => {
    intensity[region] = Math.max(intensity[region] ?? 0, value);
  };
  for (const name of secondary)
    for (const [region] of secondaryRegions(name))
      light(region, SYNERGIST_GLOW);
  for (const [region, weight] of regionsOf(primary))
    light(region, weight >= 1 ? 1 : SYNERGIST_GLOW);
  return intensity;
}
