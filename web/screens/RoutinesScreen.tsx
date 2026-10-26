import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ClipboardList,
  Copy,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderTree,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import type { RoutineFolder, WorkoutTemplateItem } from '../lib/types';
import { formatRelativeDay, pluralize } from '../lib/format';
import {
  LOOSE,
  canMoveFolder,
  childFolders,
  flattenFolders,
  folderContents,
  folderLabel,
  folderParents,
  groupKeyOf,
  groupRoutines,
  type RoutineGroup,
} from '../lib/folders';
import { muscleCode } from '../lib/training';
import { useNavigation } from '../navigation/Navigator';
import { useWorkoutLauncher } from '../features/useWorkoutLauncher';
import { OfflineNotice } from '../features/StatusBits';
import { NameSheet } from '../features/NameSheet';
import {
  SendToFriendSheet,
  shareTargets,
  type ShareTarget,
} from '../features/ShareSheets';
import { refreshFriendsIfStale } from '../features/useFriends';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import {
  Card,
  ListGroup,
  ListRow,
  SectionHeader,
  TabHeader,
} from '../ui/Layout';
import {
  ActionSheet,
  useConfirm,
  useToast,
  type SheetAction,
} from '../ui/Overlay';
import { cx } from '../ui/core';
import {
  AUTO_SCROLL,
  DragHandle,
  DragPreview,
  DropSlot,
  PRESS_TO_DRAG,
  dropAnnouncements,
  previewOffset,
  slotCollision,
  stepKeyboardCoordinates,
  useDragRow,
  useDragSensors,
  useFoldWhileDragging,
  type DragHandleProps,
  type DropData,
} from '../ui/Sortable';
import { haptic } from '../lib/haptics';
import {
  DndContext,
  MeasuringStrategy,
  useDroppable,
  type CollisionDetection,
} from '@dnd-kit/core';
import { getEventCoordinates, type Coordinates } from '@dnd-kit/utilities';

const COLLAPSED_KEY = 'forgeflow_v2_collapsed_folders';

/** Folders the person folded away, remembered on this device only. */
function useCollapsedFolders() {
  const [collapsed, setCollapsed] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]');
      return Array.isArray(saved)
        ? saved.filter((id) => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  });
  const update = (change: (current: string[]) => string[]) =>
    setCollapsed((current) => {
      const next = change(current);
      if (next === current) return current;
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the choice lasts for this visit only.
      }
      return next;
    });
  const toggle = (id: string) =>
    update((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const expand = (id: string) =>
    update((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : current,
    );
  return { collapsed, toggle, expand };
}

/**
 * Name sheet for a new or renamed folder; `templateId` moves a routine into
 * a new one, `parentId` creates it as a subfolder.
 */
type FolderSheetState =
  | { mode: 'create'; templateId?: string; parentId?: string }
  | { mode: 'rename'; folder: RoutineFolder };

export function RoutinesScreen() {
  const { templates, folders, activeWorkout, history } = useAppStore();
  const { push } = useNavigation();
  const launcher = useWorkoutLauncher();
  const toast = useToast();
  const { collapsed, toggle, expand } = useCollapsedFolders();
  const [folderSheet, setFolderSheet] = useState<FolderSheetState | null>(null);
  const groups = useMemo(
    () => groupRoutines(templates, folders),
    [templates, folders],
  );
  const hasFolders = folders.length > 0;

  const lastDoneAt = (template: WorkoutTemplateItem) =>
    history.find(
      (workout) =>
        workout.templateId === template.id || workout.name === template.name,
    )?.completedAt;

  const renderCard = (
    template: WorkoutTemplateItem,
    handle?: DragHandleProps,
  ) => (
    <RoutineCard
      template={template}
      folders={folders}
      handle={handle}
      lastDoneAt={lastDoneAt(template)}
      onStart={() => launcher.startRoutine(template.id)}
      onNewFolder={() =>
        setFolderSheet({ mode: 'create', templateId: template.id })
      }
    />
  );

  const saveFolder = (name: string) => {
    if (!folderSheet) return;
    if (folderSheet.mode === 'rename') {
      actions.renameFolder(folderSheet.folder.id, name);
      toast({ tone: 'success', title: 'Pasta renomeada', description: name });
      return;
    }
    const { parentId, templateId } = folderSheet;
    const id = actions.createFolder(name, parentId ?? null);
    // Open the parent so the new subfolder is in sight.
    if (parentId) expand(parentId);
    if (templateId) {
      actions.moveTemplateToFolder(templateId, id);
      toast({ tone: 'success', title: 'Rotina movida', description: name });
    } else {
      toast({
        tone: 'success',
        title: parentId ? 'Subpasta criada' : 'Pasta criada',
        description: parentId ? folderLabel(folders, parentId) : name,
      });
    }
  };

  return (
    <>
      <TabHeader
        title="Rotinas"
        actions={
          <IconButton
            icon={Plus}
            label="Nova rotina"
            onClick={() => push({ name: 'routine' })}
          />
        }
      />
      <div className="app-column space-y-6 px-4 pt-2">
        <OfflineNotice />

        {activeWorkout ? (
          <button
            type="button"
            onClick={launcher.resume}
            className="ember-edge pressable flex w-full items-center gap-3 rounded-lg bg-surface p-4 text-left"
          >
            <span
              className="size-2.5 animate-pulse-dot rounded-full bg-brand"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="text-body block font-semibold">
                Treino em andamento
              </span>
              <span className="text-footnote block truncate text-ink-2">
                {activeWorkout.name}
              </span>
            </span>
            <ArrowRight
              size={20}
              className="text-brand-ink"
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <QuickTile
              icon={Zap}
              title="Treino livre"
              subtitle="Monte na hora"
              onClick={launcher.startEmpty}
              accent
            />
            <QuickTile
              icon={Search}
              title="Exercícios"
              subtitle="Biblioteca"
              onClick={() => push({ name: 'library' })}
            />
          </div>
        )}

        <section aria-labelledby="routines-title">
          <SectionHeader
            id="routines-title"
            title={`Suas rotinas (${templates.length})`}
            action={
              <span className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={FolderPlus}
                  onClick={() => setFolderSheet({ mode: 'create' })}
                >
                  Pasta
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => push({ name: 'routine' })}
                >
                  Nova
                </Button>
              </span>
            }
          />

          {templates.length === 0 && !hasFolders ? (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma rotina ainda"
                message="Monte uma rotina com seus exercícios, séries e cargas para começar o treino com um toque. Use pastas para separar por academia ou fase."
                action={
                  <span className="flex flex-col items-center gap-2">
                    <Button
                      icon={Plus}
                      onClick={() => push({ name: 'routine' })}
                    >
                      Criar rotina
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={FolderPlus}
                      onClick={() => setFolderSheet({ mode: 'create' })}
                    >
                      Criar pasta
                    </Button>
                  </span>
                }
              />
            </Card>
          ) : (
            <RoutineBoard
              groups={groups}
              folders={folders}
              collapsed={collapsed}
              onToggle={toggle}
              onExpand={expand}
              onRename={(folder) => setFolderSheet({ mode: 'rename', folder })}
              onCreateSubfolder={(folder) =>
                setFolderSheet({ mode: 'create', parentId: folder.id })
              }
              renderCard={renderCard}
            />
          )}
        </section>

        <ListGroup className="mx-0">
          <ListRow
            icon={History}
            title="Diário de treinos"
            value={history.length > 0 ? String(history.length) : undefined}
            onClick={() => push({ name: 'history' })}
          />
        </ListGroup>
      </div>

      <FolderNameSheet
        state={folderSheet}
        parentLabel={
          folderSheet?.mode === 'create' && folderSheet.parentId
            ? folderLabel(folders, folderSheet.parentId)
            : undefined
        }
        onClose={() => setFolderSheet(null)}
        onSave={saveFolder}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Drag & drop board: folders inside folders, routines inside folders  */
/* ------------------------------------------------------------------ */

const ROUTINE = 'routine:';
const FOLDER = 'folder:';
/** `into:<folder id>` (a folder header) or `into:loose` ("Sem pasta"). */
const INTO = 'into:';
/** Gap before routine `<index>` of a group: `rslot:<group key>:<index>`. */
const ROUTINE_SLOT = 'rslot:';
/** Gap before subfolder `<index>`: `fslot:<parent id or TOP>:<index>`. */
const FOLDER_SLOT = 'fslot:';
const TOP = 'top';
/** Space between rows (`space-y-3`); drop lines sit in its middle. */
const GAP = 12;
/** How long a dragged row must rest on a closed folder to open it. */
const SPRING_OPEN_MS = 650;

const BOARD_INSTRUCTIONS = {
  draggable:
    'Para mover, pressione espaço ou Enter, use as setas para cima e para baixo para escolher a posição ou a pasta e pressione espaço de novo para soltar. Esc cancela.',
};

function parseSlot(id: string, prefix: string) {
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const cut = rest.lastIndexOf(':');
  return { key: rest.slice(0, cut), index: Number(rest.slice(cut + 1)) };
}

/** Where a drop lands; `into` = dropped on a header (appended at the end). */
type DropPlan =
  | {
      kind: 'routine';
      routineId: string;
      group: string;
      index: number;
      into: boolean;
    }
  | {
      kind: 'folder';
      folderId: string;
      parent: string | null;
      index: number;
      into: boolean;
    };

function RoutineBoard({
  groups,
  folders,
  collapsed,
  onToggle,
  onExpand,
  onRename,
  onCreateSubfolder,
  renderCard,
}: {
  groups: RoutineGroup[];
  folders: RoutineFolder[];
  collapsed: string[];
  onToggle: (folderId: string) => void;
  /** Opens a closed folder (a dragged row rested on it). */
  onExpand: (folderId: string) => void;
  onRename: (folder: RoutineFolder) => void;
  onCreateSubfolder: (folder: RoutineFolder) => void;
  renderCard: (
    template: WorkoutTemplateItem,
    handle?: DragHandleProps,
  ) => ReactNode;
}) {
  const sensors = useDragSensors(stepKeyboardCoordinates);
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const springTimer = useRef<number | undefined>(undefined);
  // Where the finger started and where it is, to tell a drop without moving.
  const pointer = useRef<{
    start: Coordinates | null;
    last: Coordinates | null;
  }>({ start: null, last: null });
  const draggingRoutine = activeId?.startsWith(ROUTINE) ?? false;
  const draggingFolder = activeId?.startsWith(FOLDER) ?? false;
  const activeKind = draggingRoutine
    ? 'routine'
    : draggingFolder
      ? 'folder'
      : null;
  // Folders fold to their headers while one is dragged. Unlike sortable
  // lists the board skips the pointer shift: the target is always what is
  // under the finger.
  const {
    containerRef,
    style: foldStyle,
    folded,
    begin,
    end,
  } = useFoldWhileDragging(draggingFolder ? activeId : null);
  const foldFolders = draggingFolder && folded;
  const collisionDetection: CollisionDetection = (args) => {
    if (args.pointerCoordinates) pointer.current.last = args.pointerCoordinates;
    return slotCollision(args);
  };
  /** Lifting the finger where it started changes nothing, even if folding moved rows under it. */
  const stayedPut = () => {
    const { start, last } = pointer.current;
    return (
      start !== null &&
      last !== null &&
      Math.hypot(last.x - start.x, last.y - start.y) < 12
    );
  };

  useEffect(() => () => window.clearTimeout(springTimer.current), []);

  const parents = useMemo(() => folderParents(folders), [folders]);
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const routinesByGroup = new Map(
    groups.map((group) => [group.folder?.id ?? LOOSE, group.templates]),
  );
  const templates = groups.flatMap((group) => group.templates);
  const templatesById = new Map(templates.map((t) => [t.id, t]));
  const hasFolders = folders.length > 0;
  const looseCount = routinesByGroup.get(LOOSE)?.length ?? 0;

  const subfoldersOf = (parentId: string | null) =>
    childFolders(folders, parentId, parents);
  const groupOf = (routineId: string) => {
    const template = templatesById.get(routineId);
    return template ? groupKeyOf(template, folders) : LOOSE;
  };
  const nameOf = (id: string) =>
    id.startsWith(FOLDER)
      ? (foldersById.get(id.slice(FOLDER.length))?.name ?? '')
      : (templatesById.get(id.slice(ROUTINE.length))?.name ?? '');
  const placeName = (key: string | null) =>
    key === null || key === TOP
      ? 'as pastas principais'
      : key === LOOSE
        ? '"Sem pasta"'
        : `"${foldersById.get(key)?.name ?? ''}"`;

  const planDrop = (active: string, over: string): DropPlan | null => {
    if (active.startsWith(ROUTINE)) {
      const routineId = active.slice(ROUTINE.length);
      const source = groupOf(routineId);
      if (over.startsWith(INTO)) {
        const group = over.slice(INTO.length);
        if (group === source) return null;
        const index = routinesByGroup.get(group)?.length ?? 0;
        return { kind: 'routine', routineId, group, index, into: true };
      }
      const slot = parseSlot(over, ROUTINE_SLOT);
      if (!slot) return null;
      const from =
        slot.key === source
          ? (routinesByGroup.get(source) ?? []).findIndex(
              (t) => t.id === routineId,
            )
          : -1;
      // The gaps count the dragged routine; its own removal shifts the rest.
      const index =
        from !== -1 && from < slot.index ? slot.index - 1 : slot.index;
      if (index === from) return null;
      return {
        kind: 'routine',
        routineId,
        group: slot.key,
        index,
        into: false,
      };
    }

    const folderId = active.slice(FOLDER.length);
    const source = parents.get(folderId) ?? null;
    let parent: string | null;
    let index: number;
    const into = over.startsWith(INTO);
    if (into) {
      parent = over.slice(INTO.length);
      if (parent === source) return null;
      index = subfoldersOf(parent).length;
    } else {
      const slot = parseSlot(over, FOLDER_SLOT);
      if (!slot) return null;
      parent = slot.key === TOP ? null : slot.key;
      const from =
        parent === source
          ? subfoldersOf(parent).findIndex((f) => f.id === folderId)
          : -1;
      index = from !== -1 && from < slot.index ? slot.index - 1 : slot.index;
      if (index === from) return null;
    }
    if (!canMoveFolder(folders, folderId, parent)) return null;
    return { kind: 'folder', folderId, parent, index, into };
  };

  const describe = (over: string, active: string) => {
    const plan = planDrop(active, over);
    if (!plan) return 'no mesmo lugar';
    const target = plan.kind === 'routine' ? plan.group : plan.parent;
    if (plan.into)
      return target === LOOSE
        ? 'em "Sem pasta"'
        : `dentro de ${placeName(target)}`;
    return plan.kind === 'folder' && target === null
      ? `na posição ${plan.index + 1} entre as pastas principais`
      : `na posição ${plan.index + 1} de ${placeName(target)}`;
  };

  const finish = () => {
    window.clearTimeout(springTimer.current);
    end();
    setActiveId(null);
  };

  const drop = (plan: DropPlan) => {
    if (plan.kind === 'routine') {
      actions.placeRoutine(plan.routineId, plan.group, plan.index);
      if (plan.into)
        toast({
          tone: 'success',
          title:
            plan.group === LOOSE ? 'Rotina tirada da pasta' : 'Rotina movida',
          description:
            plan.group === LOOSE
              ? nameOf(ROUTINE + plan.routineId)
              : folderLabel(folders, plan.group),
        });
    } else {
      if (!actions.placeFolder(plan.folderId, plan.parent, plan.index)) return;
      if (plan.into && plan.parent)
        toast({
          tone: 'success',
          title: 'Pasta movida',
          description: `Dentro de ${folderLabel(folders, plan.parent)}`,
        });
    }
    haptic('success');
  };

  const renderRoutines = (groupKey: string, showEmpty: boolean) => {
    if (foldFolders) return null;
    const items = routinesByGroup.get(groupKey) ?? [];
    if (items.length === 0)
      return showEmpty || draggingRoutine ? (
        <EmptyDropZone
          id={`${ROUTINE_SLOT}${groupKey}:0`}
          groupKey={groupKey}
          accepting={draggingRoutine}
        />
      ) : null;
    return (
      <div role="list" aria-label="Rotinas" className="space-y-3">
        {items.map((template, index) => (
          <RoutineRow
            key={template.id}
            id={template.id}
            slot={`${ROUTINE_SLOT}${groupKey}:${index}`}
            endSlot={
              index === items.length - 1
                ? `${ROUTINE_SLOT}${groupKey}:${items.length}`
                : undefined
            }
            accepting={draggingRoutine}
          >
            {(handle) => renderCard(template, handle)}
          </RoutineRow>
        ))}
      </div>
    );
  };

  const renderLevel = (parentId: string | null, depth: number): ReactNode => {
    const list = subfoldersOf(parentId);
    if (list.length === 0) return null;
    const parentKey = parentId ?? TOP;
    return (
      <div
        role="list"
        aria-label={
          parentId
            ? `Subpastas de ${foldersById.get(parentId)?.name ?? ''}`
            : 'Pastas'
        }
        className="space-y-3"
      >
        {list.map((folder, index) => {
          const open = !collapsed.includes(folder.id);
          const subfolders = open ? renderLevel(folder.id, depth + 1) : null;
          const routines = open
            ? renderRoutines(folder.id, subfolders === null)
            : null;
          return (
            <FolderSection
              key={folder.id}
              folder={folder}
              folders={folders}
              templates={templates}
              parentId={parentId}
              position={index}
              total={list.length}
              counts={{
                routines: routinesByGroup.get(folder.id)?.length ?? 0,
                subfolders: subfoldersOf(folder.id).length,
              }}
              collapsed={!open}
              activeKind={activeKind}
              slot={`${FOLDER_SLOT}${parentKey}:${index}`}
              endSlot={
                index === list.length - 1
                  ? `${FOLDER_SLOT}${parentKey}:${list.length}`
                  : undefined
              }
              onToggle={() => onToggle(folder.id)}
              onRename={() => onRename(folder)}
              onCreateSubfolder={() => onCreateSubfolder(folder)}
            >
              {subfolders || routines ? (
                <>
                  {subfolders}
                  {routines}
                </>
              ) : null}
            </FolderSection>
          );
        })}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={AUTO_SCROLL}
      accessibility={{
        announcements: dropAnnouncements(
          (id) => nameOf(String(id)),
          (over, active) => describe(String(over), String(active)),
        ),
        screenReaderInstructions: BOARD_INSTRUCTIONS,
      }}
      onDragStart={({ active, activatorEvent }) => {
        const id = String(active.id);
        pointer.current = {
          start: activatorEvent ? getEventCoordinates(activatorEvent) : null,
          last: null,
        };
        setOffset(previewOffset(activatorEvent, id));
        if (id.startsWith(FOLDER)) begin(id);
        setActiveId(id);
        haptic('tap');
      }}
      onDragOver={({ over }) => {
        window.clearTimeout(springTimer.current);
        const overId = over ? String(over.id) : '';
        if (!overId.startsWith(INTO)) return;
        haptic('tap');
        const folderId = overId.slice(INTO.length);
        if (collapsed.includes(folderId))
          springTimer.current = window.setTimeout(
            () => onExpand(folderId),
            SPRING_OPEN_MS,
          );
      }}
      onDragCancel={finish}
      onDragEnd={({ active, over }) => {
        const plan =
          over && !stayedPut()
            ? planDrop(String(active.id), String(over.id))
            : null;
        finish();
        if (plan) drop(plan);
      }}
    >
      <div ref={containerRef} style={foldStyle} className="space-y-4">
        {hasFolders ? renderLevel(null, 0) : renderRoutines(LOOSE, true)}

        {hasFolders && !foldFolders && (looseCount > 0 || draggingRoutine) && (
          <section aria-labelledby="loose-routines">
            <LooseHeader accepting={draggingRoutine} />
            {renderRoutines(LOOSE, true)}
          </section>
        )}
      </div>

      <DragPreview offset={offset}>
        {activeId?.startsWith(FOLDER) ? (
          <FolderPreview
            name={nameOf(activeId)}
            routines={
              routinesByGroup.get(activeId.slice(FOLDER.length))?.length ?? 0
            }
            subfolders={subfoldersOf(activeId.slice(FOLDER.length)).length}
          />
        ) : activeId ? (
          <RoutinePreview
            template={templatesById.get(activeId.slice(ROUTINE.length))}
          />
        ) : null}
      </DragPreview>
    </DndContext>
  );
}

/** A routine card that can be dragged; draws the drop lines around it. */
function RoutineRow({
  id,
  slot,
  endSlot,
  accepting,
  children,
}: {
  id: string;
  /** Gap above this routine. */
  slot: string;
  /** Gap below it, for the last routine of a group. */
  endSlot?: string;
  accepting: boolean;
  children: (handle: DragHandleProps) => ReactNode;
}) {
  const { bindRow, handle, pressToDrag, dragging } = useDragRow(ROUTINE + id);
  return (
    <div
      ref={bindRow}
      data-sortable-id={ROUTINE + id}
      role="listitem"
      {...pressToDrag}
      className={cx(
        'relative transition-opacity',
        PRESS_TO_DRAG,
        dragging && 'opacity-40',
      )}
    >
      <DropSlot id={slot} disabled={!accepting} gap={GAP} />
      {children(handle)}
      {endSlot && (
        <DropSlot id={endSlot} disabled={!accepting} gap={GAP} side="after" />
      )}
    </div>
  );
}

/** "Sem pasta" title; also a drop target to take a routine out of a folder. */
function LooseHeader({ accepting }: { accepting: boolean }) {
  const data: DropData = { drop: 'into', edge: 0 };
  const { setNodeRef, isOver } = useDroppable({
    id: `${INTO}${LOOSE}`,
    disabled: !accepting,
    data,
  });
  return (
    <h3
      ref={setNodeRef}
      id="loose-routines"
      className={cx(
        'text-micro mb-2 rounded-md px-1 py-2 font-semibold tracking-wider text-ink-3 uppercase transition-colors',
        isOver && 'bg-brand-soft text-brand-ink ring-2 ring-brand',
      )}
    >
      Sem pasta
    </h3>
  );
}

/** Placeholder of an empty group; while a routine is dragged, a drop gap. */
function EmptyDropZone({
  id,
  groupKey,
  accepting,
}: {
  id: string;
  groupKey: string;
  accepting: boolean;
}) {
  const data: DropData = { drop: 'slot' };
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !accepting,
    data,
  });
  return (
    <p
      ref={setNodeRef}
      className={cx(
        'text-callout rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
        isOver
          ? 'border-brand bg-brand-soft text-brand-ink'
          : 'border-line-strong text-ink-2',
      )}
    >
      {accepting ? (
        'Solte aqui'
      ) : groupKey === LOOSE ? (
        'Nenhuma rotina sem pasta.'
      ) : (
        <>Pasta vazia. Crie uma rotina aqui ou arraste uma rotina para cá.</>
      )}
    </p>
  );
}

function RoutinePreview({
  template,
}: {
  template: WorkoutTemplateItem | undefined;
}) {
  if (!template) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
      <ClipboardList size={20} className="text-brand-ink" aria-hidden="true" />
      <span className="text-headline min-w-0 flex-1 truncate font-semibold">
        {template.name}
      </span>
      <span className="text-footnote text-ink-2">
        {pluralize(template.exercises.length, 'exercício', 'exercícios')}
      </span>
    </div>
  );
}

function FolderPreview({
  name,
  routines,
  subfolders,
}: {
  name: string;
  routines: number;
  subfolders: number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface px-4 py-3">
      <Folder size={20} className="text-brand-ink" aria-hidden="true" />
      <span className="text-headline min-w-0 flex-1 truncate font-semibold">
        {name}
      </span>
      <FolderCounts routines={routines} subfolders={subfolders} />
    </div>
  );
}

/** "2 rotinas", after the number of subfolders when there are any. */
function FolderCounts({
  routines,
  subfolders,
}: {
  routines: number;
  subfolders: number;
}) {
  return (
    <span className="text-footnote flex shrink-0 items-center gap-2 text-ink-3 tabular">
      {subfolders > 0 && (
        <span
          className="flex items-center gap-0.5"
          aria-label={pluralize(subfolders, 'subpasta', 'subpastas')}
        >
          <Folder size={13} aria-hidden="true" />
          <span aria-hidden="true">{subfolders}</span>
        </span>
      )}
      {(routines > 0 || subfolders === 0) &&
        pluralize(routines, 'rotina', 'rotinas')}
    </span>
  );
}

/** "2 rotinas e 1 subpasta" (empty when there is nothing). */
function describeContents(routines: number, subfolders: number): string {
  return [
    routines > 0 ? pluralize(routines, 'rotina', 'rotinas') : '',
    subfolders > 0 ? pluralize(subfolders, 'subpasta', 'subpastas') : '',
  ]
    .filter(Boolean)
    .join(' e ');
}

function FolderSection({
  folder,
  folders,
  templates,
  parentId,
  position,
  total,
  counts,
  collapsed,
  activeKind,
  slot,
  endSlot,
  onToggle,
  onRename,
  onCreateSubfolder,
  children,
}: {
  folder: RoutineFolder;
  folders: RoutineFolder[];
  templates: WorkoutTemplateItem[];
  parentId: string | null;
  /** Place among the folders of the same parent. */
  position: number;
  total: number;
  /** What the folder holds directly. */
  counts: { routines: number; subfolders: number };
  collapsed: boolean;
  /** What is being dragged on the board, if anything. */
  activeKind: 'routine' | 'folder' | null;
  /** Gap above this folder (and below it, for the last one). */
  slot: string;
  endSlot?: string;
  onToggle: () => void;
  onRename: () => void;
  onCreateSubfolder: () => void;
  /** Subfolders and routines, when open; `null` when there are none. */
  children: ReactNode;
}) {
  const { bindRow, handle, pressToDrag, dragging } = useDragRow(
    FOLDER + folder.id,
  );
  // The header takes rows dropped on it, also when the folder is closed. A
  // dragged folder keeps the header's top and bottom edges for "before" and
  // "after"; a routine can only go inside.
  const intoData: DropData = {
    drop: 'into',
    edge: activeKind === 'folder' ? 0.25 : 0,
  };
  const { setNodeRef: bindDrop, isOver } = useDroppable({
    id: INTO + folder.id,
    disabled: activeKind === null || dragging,
    data: intoData,
  });
  const bindHeader = useCallback(
    (node: HTMLElement | null) => {
      bindRow(node);
      bindDrop(node);
    },
    [bindRow, bindDrop],
  );
  const { push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const titleId = `folder-${folder.id}`;
  const listId = `folder-list-${folder.id}`;
  const Icon = collapsed && !isOver ? Folder : FolderOpen;
  const parent = folders.find((item) => item.id === parentId) ?? null;
  const folding = activeKind === 'folder';

  // Where the folder can go: the top level and any folder outside itself.
  const destinations = [
    null,
    ...flattenFolders(folders)
      .map((node) => node.folder.id)
      .filter((id) => canMoveFolder(folders, folder.id, id)),
  ];

  const moveTo = (target: string | null) => {
    if (target === parentId) return;
    if (!actions.placeFolder(folder.id, target)) return;
    toast({
      tone: 'success',
      title: 'Pasta movida',
      description: target
        ? `Dentro de ${folderLabel(folders, target)}`
        : 'Agora no nível principal',
    });
  };

  const removeEmpty = () => {
    actions.deleteFolder(folder.id, false);
    toast({
      tone: 'success',
      title: 'Pasta excluída',
      description: folder.name,
    });
  };

  const contents = folderContents(templates, folders, folder.id);
  const direct = describeContents(contents.routines, contents.subfolders);
  const everything = describeContents(
    contents.allRoutines,
    contents.allSubfolders,
  );

  const menu: SheetAction[] = [
    {
      label: 'Nova rotina nesta pasta',
      icon: Plus,
      onSelect: () => push({ name: 'routine', folderId: folder.id }),
    },
    { label: 'Nova subpasta', icon: FolderPlus, onSelect: onCreateSubfolder },
    { label: 'Renomear pasta', icon: Pencil, onSelect: onRename },
    {
      label: 'Compartilhar com amigo',
      description: 'Envia uma cópia da pasta, com subpastas e rotinas',
      icon: Send,
      onSelect: () => {
        refreshFriendsIfStale();
        setSharing(shareTargets.folder(folder.id));
      },
    },
    ...(destinations.length > 1
      ? [
          {
            label: 'Mover para…',
            description: parent
              ? `Agora em ${folderLabel(folders, parent.id)}`
              : 'Agora no nível principal',
            icon: FolderInput,
            onSelect: () => setMoveOpen(true),
          },
        ]
      : []),
    ...(position > 0
      ? [
          {
            label: 'Mover para cima',
            icon: ArrowUp,
            onSelect: () => actions.moveFolder(folder.id, -1),
          },
        ]
      : []),
    ...(position < total - 1
      ? [
          {
            label: 'Mover para baixo',
            icon: ArrowDown,
            onSelect: () => actions.moveFolder(folder.id, 1),
          },
        ]
      : []),
    {
      label: 'Excluir pasta',
      icon: Trash2,
      tone: 'danger',
      onSelect: () => (direct ? setDeleteOpen(true) : removeEmpty()),
    },
  ];

  return (
    <section aria-labelledby={titleId} role="listitem" className="relative">
      <DropSlot id={slot} disabled={!folding} gap={GAP} />
      <div
        ref={bindHeader}
        data-sortable-id={FOLDER + folder.id}
        {...pressToDrag}
        className={cx(
          'flex items-center gap-1 rounded-lg transition-colors',
          PRESS_TO_DRAG,
          folding && 'bg-surface px-1',
          isOver && 'bg-brand-soft ring-2 ring-brand',
          dragging && 'opacity-40',
        )}
      >
        <DragHandle
          handle={handle}
          label={`Arrastar a pasta ${folder.name} para reordenar ou colocar em outra pasta`}
          className="-ml-1 w-7"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={listId}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-md px-1 text-left active:bg-raised"
        >
          <Icon
            size={20}
            strokeWidth={2}
            className="shrink-0 text-brand-ink"
            aria-hidden="true"
          />
          <span
            id={titleId}
            className="text-headline min-w-0 truncate font-semibold"
          >
            {folder.name}
          </span>
          {isOver ? (
            <span className="text-footnote shrink-0 font-semibold text-brand-ink">
              Soltar dentro
            </span>
          ) : (
            <FolderCounts
              routines={counts.routines}
              subfolders={counts.subfolders}
            />
          )}
          <ChevronDown
            size={18}
            className={cx(
              'ml-auto shrink-0 text-ink-3 transition-transform',
              collapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
        </button>
        <IconButton
          icon={MoreHorizontal}
          label={`Opções da pasta ${folder.name}`}
          size="sm"
          onClick={() => setMenuOpen(true)}
        />
      </div>
      {!collapsed && !dragging && children && (
        // The line on the left ties subfolders and routines to this folder.
        <div
          id={listId}
          className="mt-3 ml-3 space-y-3 border-l border-line-strong pl-3"
        >
          {children}
        </div>
      )}
      {endSlot && (
        <DropSlot id={endSlot} disabled={!folding} gap={GAP} side="after" />
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={folder.name}
        actions={menu}
      />
      <SendToFriendSheet target={sharing} onClose={() => setSharing(null)} />
      <ActionSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Mover "${folder.name}"`}
        actions={destinations.map((target): SheetAction => {
          const current = target === parentId;
          return {
            label: target ? folderLabel(folders, target) : 'Nível principal',
            description: target ? undefined : 'Fora de outras pastas',
            icon: current ? Check : target ? Folder : FolderTree,
            tone: current ? 'brand' : 'default',
            onSelect: () => moveTo(target),
          };
        })}
      />
      <ActionSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Excluir a pasta "${folder.name}"?`}
        actions={[
          {
            label: 'Excluir só a pasta',
            description: `Move ${direct} para ${parent ? `"${parent.name}"` : 'fora da pasta'}`,
            icon: FolderInput,
            onSelect: () => {
              actions.deleteFolder(folder.id, false);
              toast({
                tone: 'success',
                title: 'Pasta excluída',
                description: parent
                  ? `O conteúdo foi para "${parent.name}".`
                  : 'O conteúdo continua na lista.',
              });
            },
          },
          {
            label:
              contents.allSubfolders > 0
                ? 'Excluir pasta e tudo dentro'
                : 'Excluir pasta e rotinas',
            description: `Apaga ${everything}; o diário de treinos fica`,
            icon: Trash2,
            tone: 'danger',
            onSelect: async () => {
              const ok = await confirm({
                title: `Excluir ${everything}?`,
                message: `A pasta "${folder.name}" e tudo o que está dentro dela serão removidos. Treinos já concluídos continuam no diário.`,
                confirmLabel: 'Excluir tudo',
                tone: 'danger',
                icon: Trash2,
              });
              if (!ok) return;
              actions.deleteFolder(folder.id, true);
              toast({ tone: 'success', title: 'Pasta e conteúdo excluídos' });
            },
          },
        ]}
      />
    </section>
  );
}

function FolderNameSheet({
  state,
  parentLabel,
  onClose,
  onSave,
}: {
  state: FolderSheetState | null;
  /** Set when creating a subfolder: where it goes. */
  parentLabel?: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const renaming = state?.mode === 'rename';
  return (
    <NameSheet
      open={state !== null}
      onClose={onClose}
      onSave={onSave}
      title={
        renaming
          ? 'Renomear pasta'
          : parentLabel
            ? 'Nova subpasta'
            : 'Nova pasta'
      }
      description={
        renaming
          ? undefined
          : parentLabel
            ? `Dentro de ${parentLabel}.`
            : 'Agrupe rotinas por academia, fase do treino ou como preferir.'
      }
      label="Nome da pasta"
      placeholder="Ex.: Academia do centro"
      initial={state?.mode === 'rename' ? state.folder.name : ''}
      saveLabel={
        renaming
          ? 'Salvar nome'
          : parentLabel
            ? 'Criar subpasta'
            : 'Criar pasta'
      }
    />
  );
}

function QuickTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
  accent = false,
}: {
  icon: typeof Zap;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        accent
          ? 'pressable flex flex-col items-start gap-3 rounded-lg bg-brand p-4 text-left text-on-brand'
          : 'pressable flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4 text-left active:bg-raised'
      }
    >
      <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
      <span>
        <span className="text-body block font-semibold">{title}</span>
        <span
          className={
            accent
              ? 'text-footnote block opacity-80'
              : 'text-footnote block text-ink-2'
          }
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function RoutineCard({
  template,
  folders,
  handle,
  lastDoneAt,
  onStart,
  onNewFolder,
}: {
  template: WorkoutTemplateItem;
  folders: RoutineFolder[];
  handle?: DragHandleProps;
  lastDoneAt?: string;
  onStart: () => void;
  /** Creates a folder and moves this routine into it. */
  onNewFolder: () => void;
}) {
  const { push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [sharing, setSharing] = useState<ShareTarget | null>(null);
  const currentFolder = folders.find(
    (folder) => folder.id === template.folderId,
  );

  const moveTo = (folder: RoutineFolder | null) => {
    if ((folder?.id ?? null) === (currentFolder?.id ?? null)) return;
    actions.moveTemplateToFolder(template.id, folder?.id ?? null);
    toast({
      tone: 'success',
      title: folder ? 'Rotina movida' : 'Rotina tirada da pasta',
      description: folder ? folder.name : template.name,
    });
  };
  const sets = template.exercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );
  const muscles = [
    ...new Set(
      template.exercises
        .map(
          (exercise) => findExercise(exercise.exerciseId)?.primaryMuscleGroup,
        )
        .filter((group): group is string => Boolean(group)),
    ),
  ];

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir "${template.name}"?`,
      message:
        'A rotina será removida. Treinos já concluídos com ela continuam no diário.',
      confirmLabel: 'Excluir rotina',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteTemplate(template.id);
    toast({ tone: 'success', title: 'Rotina excluída' });
  };

  return (
    <Card as="div" className="overflow-hidden">
      <button
        type="button"
        onClick={() => push({ name: 'routine', templateId: template.id })}
        className="block w-full p-4 pb-3 text-left active:bg-raised"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-headline font-semibold">{template.name}</span>
          <span className="text-caption shrink-0 pt-1 text-ink-3">
            {lastDoneAt ? formatRelativeDay(lastDoneAt) : 'Nova'}
          </span>
        </span>
        <span className="text-callout mt-1 line-clamp-2 block text-ink-2">
          {template.exercises.length > 0
            ? template.exercises
                .map((exercise) => exercise.exerciseName)
                .join(' · ')
            : 'Sem exercícios'}
        </span>
      </button>
      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        {handle && (
          <DragHandle
            handle={handle}
            label={`Arrastar ${template.name} para reordenar ou mudar de pasta`}
            className="-ml-2.5 w-7"
          />
        )}
        <div
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
          aria-label="Grupos musculares"
        >
          {muscles.slice(0, 4).map((group) => (
            <span
              key={group}
              className="text-micro rounded-sm bg-raised px-1.5 py-0.5 font-semibold text-ink-2"
            >
              {muscleCode(group)}
            </span>
          ))}
          <span className="text-caption text-ink-3">
            {pluralize(sets, 'série', 'séries')}
          </span>
        </div>
        <IconButton
          icon={MoreHorizontal}
          label={`Opções de ${template.name}`}
          size="sm"
          onClick={() => setMenuOpen(true)}
        />
        <Button
          size="sm"
          icon={Play}
          onClick={onStart}
          disabled={template.exercises.length === 0}
        >
          Iniciar
        </Button>
      </div>
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={template.name}
        actions={[
          {
            label: 'Editar rotina',
            icon: Pencil,
            onSelect: () => push({ name: 'routine', templateId: template.id }),
          },
          {
            label: 'Mover para pasta',
            description: currentFolder
              ? `Agora em ${folderLabel(folders, currentFolder.id)}`
              : undefined,
            icon: FolderInput,
            onSelect: () =>
              folders.length > 0 ? setMoveOpen(true) : onNewFolder(),
          },
          {
            label: 'Duplicar rotina',
            icon: Copy,
            onSelect: () => {
              actions.duplicateTemplate(template.id);
              toast({ tone: 'success', title: 'Rotina duplicada' });
            },
          },
          {
            label: 'Compartilhar com amigo',
            icon: Send,
            onSelect: () => {
              refreshFriendsIfStale();
              setSharing(shareTargets.routine(template.id));
            },
          },
          {
            label: 'Excluir rotina',
            icon: Trash2,
            tone: 'danger',
            onSelect: remove,
          },
        ]}
      />
      <ActionSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Mover "${template.name}"`}
        actions={[
          ...flattenFolders(folders).map(({ folder }): SheetAction => ({
            label: folderLabel(folders, folder.id),
            icon: folder.id === currentFolder?.id ? Check : Folder,
            tone: folder.id === currentFolder?.id ? 'brand' : 'default',
            onSelect: () => moveTo(folder),
          })),
          {
            label: 'Sem pasta',
            icon: currentFolder ? ClipboardList : Check,
            tone: currentFolder ? 'default' : 'brand',
            onSelect: () => moveTo(null),
          },
          { label: 'Nova pasta…', icon: FolderPlus, onSelect: onNewFolder },
        ]}
      />
      <SendToFriendSheet target={sharing} onClose={() => setSharing(null)} />
    </Card>
  );
}
