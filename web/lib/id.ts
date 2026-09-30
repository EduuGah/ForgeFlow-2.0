let counter = 0;

/** Collision-safe local id: time + per-session counter + randomness. */
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${random}`;
}
