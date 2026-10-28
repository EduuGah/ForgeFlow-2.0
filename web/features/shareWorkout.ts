import { workoutShareText } from '../lib/shareText';
import type { CompletedWorkout } from '../lib/types';

/**
 * Opens the phone's share sheet with the workout as text (WhatsApp, notes…),
 * or copies it where sharing isn't available.
 */
export async function shareWorkout(
  workout: CompletedWorkout,
): Promise<'shared' | 'copied' | 'failed'> {
  const text = workoutShareText(workout, window.location.origin);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (error) {
      // Closing the share sheet is not a failure.
      if ((error as Error)?.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
