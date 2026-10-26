import { useState } from 'react';
import { Dumbbell, Folder, Send, Users } from 'lucide-react';
import { getState, useAppStore } from '../store';
import {
  buildFolderShare,
  buildRoutineShare,
  type ShareKind,
  type SharePayload,
} from '../lib/sharing';
import type { SocialProfile } from '../lib/friends';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { socialErrorMessage } from '../screens/SocialScreen';
import { Button } from '../ui/Button';
import { Avatar, EmptyState } from '../ui/Feedback';
import { Sheet, useToast } from '../ui/Overlay';
import { friendActions, useFriends } from './useFriends';

/** What is being sent: built on demand from the current routines. */
export interface ShareTarget {
  kind: ShareKind;
  title: string;
  build: () => SharePayload;
}

/**
 * The share for one routine or folder of this person. Reads the store when
 * called (a tap), so rows that offer sharing don't subscribe to all of it.
 */
export const shareTargets = {
  routine(templateId: string): ShareTarget | null {
    const template = getState().templates.find(
      (item) => item.id === templateId,
    );
    if (!template) return null;
    return {
      kind: 'routine',
      title: template.name,
      build: () => buildRoutineShare(template, getState().customExercises),
    };
  },
  folder(folderId: string): ShareTarget | null {
    const folder = getState().folders.find((item) => item.id === folderId);
    if (!folder) return null;
    return {
      kind: 'folder',
      title: folder.name,
      build: () => {
        const { folders, templates, customExercises } = getState();
        return buildFolderShare(folderId, folders, templates, customExercises);
      },
    };
  },
};

function useSend() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const send = async (
    friend: SocialProfile,
    target: ShareTarget,
    key: string,
  ): Promise<boolean> => {
    const payload = target.build();
    if (payload.routines.length === 0) {
      toast({
        tone: 'error',
        title: 'Nada para enviar',
        description: 'Essa pasta ainda não tem rotinas.',
      });
      return false;
    }
    setBusy(key);
    try {
      await friendActions.share(friend, target.kind, target.title, payload);
      haptic('success');
      toast({
        tone: 'success',
        title: `${target.kind === 'folder' ? 'Pasta enviada' : 'Rotina enviada'} para ${friend.name || `@${friend.username}`}`,
        description:
          'Aparece em Perfil › Amigos e ranking para a outra pessoa.',
      });
      return true;
    } catch (error) {
      toast({ tone: 'error', title: socialErrorMessage(error) });
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { send, busy };
}

/** Picks the friend to send a routine or folder to. */
export function SendToFriendSheet({
  target,
  onClose,
}: {
  target: ShareTarget | null;
  onClose: () => void;
}) {
  const { currentUser } = useAppStore();
  const friends = useFriends();
  const { push } = useNavigation();
  const { send, busy } = useSend();
  const list = friends.lists.friends;

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={
        target?.kind === 'folder' ? 'Enviar pasta para…' : 'Enviar rotina para…'
      }
      description={target ? `“${target.title}” vai como uma cópia.` : undefined}
    >
      {!currentUser || list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={currentUser ? 'Nenhum amigo ainda' : 'Entre com o Google'}
          message={
            currentUser
              ? 'Adicione amigos para mandar rotinas para eles.'
              : 'Compartilhar precisa de uma conta.'
          }
          action={
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                push({ name: 'social' });
              }}
            >
              Abrir amigos
            </Button>
          }
          className="py-6"
        />
      ) : (
        <ul className="-mx-1 divide-y divide-line">
          {list.map((link) => (
            <li key={link.id} className="flex items-center gap-3 px-1 py-2.5">
              <Avatar
                name={link.other.name || link.other.username}
                photoUrl={link.other.photoUrl}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="text-body block truncate font-medium">
                  {link.other.name || `@${link.other.username}`}
                </span>
                <span className="text-footnote block truncate text-ink-2">
                  @{link.other.username}
                </span>
              </span>
              <Button
                size="sm"
                icon={Send}
                loading={busy === link.other.userId}
                disabled={busy !== null}
                onClick={async () => {
                  if (
                    target &&
                    (await send(link.other, target, link.other.userId))
                  )
                    onClose();
                }}
              >
                Enviar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

/** From a friend's page: picks which routine or folder to send them. */
export function PickRoutineSheet({
  friend,
  open,
  onClose,
}: {
  friend: SocialProfile;
  open: boolean;
  onClose: () => void;
}) {
  const { templates, folders } = useAppStore();
  const { send, busy } = useSend();
  const sortedFolders = [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  );
  const sortedRoutines = [...templates].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  );

  const row = (key: string, target: ShareTarget | null, subtitle: string) =>
    target && (
      <li key={key}>
        <button
          type="button"
          disabled={busy !== null}
          onClick={async () => {
            if (await send(friend, target, key)) onClose();
          }}
          className="pressable flex w-full items-center gap-3 px-1 py-3 text-left disabled:opacity-60"
        >
          {target.kind === 'folder' ? (
            <Folder size={20} className="shrink-0 text-brand-ink" />
          ) : (
            <Dumbbell size={20} className="shrink-0 text-ink-2" />
          )}
          <span className="min-w-0 flex-1">
            <span className="text-body block truncate">{target.title}</span>
            <span className="text-footnote block text-ink-2">{subtitle}</span>
          </span>
          {busy === key ? (
            <span className="text-footnote text-ink-3">Enviando…</span>
          ) : (
            <Send size={18} className="shrink-0 text-ink-3" />
          )}
        </button>
      </li>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Enviar para ${friend.name || `@${friend.username}`}`}
      description="Escolha uma rotina ou uma pasta inteira. Vai uma cópia."
      size="tall"
    >
      {templates.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhuma rotina"
          message="Crie uma rotina na aba Rotinas para poder enviar."
          className="py-6"
        />
      ) : (
        <ul className="-mx-1 divide-y divide-line">
          {sortedFolders.map((folder) => {
            const inside = templates.filter(
              (item) => item.folderId === folder.id,
            ).length;
            return row(
              `folder-${folder.id}`,
              shareTargets.folder(folder.id),
              `Pasta · ${inside} ${inside === 1 ? 'rotina' : 'rotinas'}`,
            );
          })}
          {sortedRoutines.map((template) =>
            row(
              `routine-${template.id}`,
              shareTargets.routine(template.id),
              `${template.exercises.length} ${template.exercises.length === 1 ? 'exercício' : 'exercícios'}`,
            ),
          )}
        </ul>
      )}
    </Sheet>
  );
}
