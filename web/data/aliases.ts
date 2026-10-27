/*
 * Other names people search catalog exercises by (gym slang, English names
 * from Hevy/Strong). Keyed by the last 4 digits of the catalog id.
 */
const ALIASES: Record<string, string[]> = {
  '1131': ['rosca de punho', 'wrist curl'],
  '1132': ['rosca de punho inversa', 'reverse wrist curl'],
  '1133': ['rosca de punho', 'wrist curl'],
  '1134': ['rosca de punho inversa', 'reverse wrist curl'],
  '1135': ['rosca de punho', 'behind the back wrist curl'],
  '1136': ['rosca de punho', 'cable wrist curl'],
  '1137': ['wrist roller'],
  '1138': ['farmer walk', 'farmers walk'],
  '1139': ['plate pinch', 'pegada'],
  '1140': ['rosca de dedos', 'finger curl'],
};

const CATALOG_PREFIX = '00000000-0000-4000-8000-00000000';

export function exerciseAliases(exerciseId: string): string[] {
  if (!exerciseId.startsWith(CATALOG_PREFIX)) return [];
  return ALIASES[exerciseId.slice(CATALOG_PREFIX.length)] ?? [];
}
