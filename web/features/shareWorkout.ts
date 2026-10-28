import {
  formatDurationMinutes,
  formatNumber,
  formatWeight,
} from '../lib/format';
import { shareDate, workoutShareText } from '../lib/shareText';
import { shareStory, type StoryContent } from '../lib/storyImage';
import type { CompletedWorkout } from '../lib/types';

/**
 * Opens the phone's share sheet with some text (WhatsApp, notes…), or
 * copies it where sharing isn't available.
 */
export async function shareText(
  text: string,
): Promise<'shared' | 'copied' | 'failed'> {
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

export function shareWorkout(workout: CompletedWorkout) {
  return shareText(workoutShareText(workout, window.location.origin));
}

/** The workout as a stories picture: numbers and each exercise's best set. */
export function workoutStory(workout: CompletedWorkout): StoryContent {
  return {
    eyebrow: shareDate(workout.startedAt || workout.completedAt),
    title: workout.name,
    subtitle: `${workout.exercises.length} ${workout.exercises.length === 1 ? 'exercício' : 'exercícios'}`,
    stats: [
      {
        label: 'Duração',
        value: formatDurationMinutes(workout.durationMinutes),
      },
      { label: 'Volume', value: `${formatWeight(workout.totalVolumeKg)} kg` },
      { label: 'Séries', value: formatNumber(workout.totalSets, 0) },
      { label: 'Recordes', value: formatNumber(workout.prsAchieved.length, 0) },
    ],
    rows: workout.exercises.map((exercise) => [
      exercise.exerciseName,
      exercise.bestWeightKg > 0
        ? `${exercise.setsCount} × ${formatWeight(exercise.bestWeightKg)} kg`
        : `${exercise.setsCount} ${exercise.setsCount === 1 ? 'série' : 'séries'}`,
    ]),
    footer: '@forgeflow',
  };
}

export function shareWorkoutImage(workout: CompletedWorkout) {
  return shareStory(workoutStory(workout), 'forgeflow-treino.png');
}
