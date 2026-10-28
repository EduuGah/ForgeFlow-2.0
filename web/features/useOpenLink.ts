import { useCallback } from 'react';
import { useNavigation } from '../navigation/Navigator';
import { getState } from '../store';
import { targetOf } from './deepLink';

/**
 * Opens what a notification or an icon shortcut points at (a screen, a tab
 * or the active workout).
 */
export function useOpenLink() {
  const { push, openWorkout, selectTab } = useNavigation();
  return useCallback(
    (link: string) => {
      const target = targetOf(link);
      if (!target) return;
      if (target.kind === 'workout') openWorkout();
      else if (target.kind === 'tab') selectTab(target.tab);
      else if (target.kind === 'train') {
        if (getState().activeWorkout) openWorkout();
        else selectTab('routines');
      } else push(target.route);
    },
    [push, openWorkout, selectTab],
  );
}
