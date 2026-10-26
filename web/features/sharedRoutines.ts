import { actions, findExercise, getState } from '../store';
import { planExercises } from '../lib/sharing';
import type { IncomingShare } from '../social';
import type { SocialProfile } from '../lib/friends';

/**
 * Turns what a friend sent into this person's own routines (and folders),
 * creating the custom exercises it needs. Returns how many routines.
 */
export function saveSharedRoutines(
  share: IncomingShare & { sender: SocialProfile | null },
): number {
  const { payload } = share;
  const senderName = share.sender
    ? share.sender.name || `@${share.sender.username}`
    : 'um amigo';

  const { reuse, create } = planExercises(
    payload,
    (id) => Boolean(findExercise(id)?.isSystem),
    getState().customExercises,
  );
  const exerciseIds = new Map(reuse);
  for (const exercise of create) {
    const created = actions.createCustomExercise({
      name: exercise.name,
      primaryMuscleGroup: exercise.primaryMuscleGroup,
      equipment: exercise.equipment ?? '',
      description: `Veio de uma rotina de ${senderName}.`,
    });
    exerciseIds.set(exercise.id, created.id);
  }

  // Parents come first in the payload, so each one exists before its children.
  const folderIds = new Map<string, string>();
  for (const folder of payload.folders) {
    const parent = folder.parentKey ? folderIds.get(folder.parentKey) : null;
    folderIds.set(
      folder.key,
      actions.createFolder(folder.name, parent ?? null),
    );
  }

  for (const routine of payload.routines) {
    const folderId = routine.folderKey
      ? folderIds.get(routine.folderKey)
      : undefined;
    actions.createTemplate({
      name: routine.name,
      description: routine.description || `Enviada por ${senderName}.`,
      exercises: routine.exercises.map((exercise) => ({
        ...exercise,
        exerciseId: exerciseIds.get(exercise.exerciseId) ?? exercise.exerciseId,
      })),
      ...(folderId ? { folderId } : {}),
    });
  }
  return payload.routines.length;
}
