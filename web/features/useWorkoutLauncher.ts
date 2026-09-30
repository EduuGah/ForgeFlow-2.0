import { AlertTriangle } from 'lucide-react';
import { actions, getState } from '../store';
import { useNavigation } from '../navigation/Navigator';
import { useConfirm } from '../ui/Overlay';
import { haptic } from '../lib/haptics';

/**
 * Starting a workout used to overwrite an unfinished session silently; every
 * entry point now asks before replacing it.
 */
export function useWorkoutLauncher() {
  const confirm = useConfirm();
  const { openWorkout } = useNavigation();

  const canReplaceActive = async () => {
    const active = getState().activeWorkout;
    if (!active) return true;
    return confirm({
      title: 'Você já tem um treino em andamento',
      message: `Começar outro descarta "${active.name}" e as séries registradas nele.`,
      confirmLabel: 'Descartar e começar',
      cancelLabel: 'Manter treino atual',
      tone: 'danger',
      icon: AlertTriangle,
    });
  };

  return {
    startRoutine: async (templateId: string) => {
      if (!(await canReplaceActive())) return;
      if (actions.startWorkoutFromTemplate(templateId)) {
        haptic('success');
        openWorkout();
      }
    },
    startEmpty: async () => {
      if (!(await canReplaceActive())) return;
      actions.startEmptyWorkout();
      haptic('success');
      openWorkout();
    },
    resume: () => {
      haptic('tap');
      openWorkout();
    },
  };
}
