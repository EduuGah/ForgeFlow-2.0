import { useCallback } from 'react';
import { useNavigation } from '../navigation/Navigator';
import { targetOf } from './deepLink';

/** Opens what a notification points at (a screen or the active workout). */
export function useOpenLink() {
  const { push, openWorkout } = useNavigation();
  return useCallback(
    (link: string) => {
      const target = targetOf(link);
      if (!target) return;
      if (target.kind === 'workout') openWorkout();
      else push(target.route);
    },
    [push, openWorkout],
  );
}
