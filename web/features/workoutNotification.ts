import { getState } from '../store';
import { closeSystemNotification, showSystemNotification } from '../lib/notify';
import { workoutProgressNotice } from '../lib/workoutProgress';

const TAG = 'workout';

/**
 * Keeps the "workout in progress" notification in step: shown (or updated)
 * while the app is in the background with a workout running, gone otherwise.
 */
export function refreshWorkoutNotification() {
  const { activeWorkout, restTimer, notificationPrefs } = getState();
  const show =
    document.visibilityState === 'hidden' &&
    activeWorkout !== null &&
    notificationPrefs.workoutProgress !== false;
  if (!show || !activeWorkout) {
    void closeSystemNotification(TAG);
    return;
  }
  void showSystemNotification({
    ...workoutProgressNotice(activeWorkout, restTimer, Date.now()),
    tag: TAG,
    link: 'workout',
    // Updating it must not buzz every time.
    silent: true,
    requireInteraction: true,
  });
}

/** When the rest ends with the app in the background. */
export function notifyRestEnded() {
  const { notificationPrefs } = getState();
  if (
    document.visibilityState !== 'hidden' ||
    notificationPrefs.restTimerAlerts === false
  )
    return;
  void showSystemNotification({
    title: 'Descanso concluído',
    body: 'Hora da próxima série.',
    tag: 'rest',
    link: 'workout',
    renotify: true,
  });
}
