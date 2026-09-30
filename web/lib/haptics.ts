type Pattern = 'tap' | 'success' | 'warning' | 'celebrate';

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  success: [12, 40, 18],
  warning: [30, 60, 30],
  celebrate: [20, 50, 20, 50, 40],
};

/** Short vibration where supported (Android browsers); silently ignored elsewhere. */
export function haptic(pattern: Pattern = 'tap'): void {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // Vibration is best-effort feedback only.
  }
}
