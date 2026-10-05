import { useMemo, useState, type ReactNode } from 'react';
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
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import type { RoutineFolder, WorkoutTemplateItem } from '../lib/types';
import { formatRelativeDay, pluralize } from '../lib/format';
import {
  LOOSE,
  groupRoutines,
  sortFolders,
  type RoutineGroup,
} from '../lib/folders';
import { muscleCode } from '../lib/training';
import { useNavigation } from '../navigation/Navigator';
import { useWorkoutLauncher } from '../features/useWorkoutLauncher';
import { OfflineNotice } from '../features/StatusBits';
import { NameSheet } from '../features/NameSheet';
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
  DragHandle,
  SCREEN_READER_INSTRUCTIONS,
  SortableRow,
  lockToVerticalAxis,
  moveAnnouncements,
  pointerFirst,
  useDragSensors,
  useFoldWhileDragging,
  type DragHandleProps,
} from '../ui/Sortable';
import { haptic } from '../lib/haptics';
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  useDroppable,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';

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
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the choice lasts for this visit only.
      }
      return next;
    });
  return { collapsed, toggle };
}

/** Name sheet for a new or renamed folder; `templateId` moves a routine into a new one. */
type FolderSheetState =
  | { mode: 'create'; templateId?: string }
  | { mode: 'rename'; folder: RoutineFolder };

export function RoutinesScreen() {
  const { templates, folders, activeWorkout, history } = useAppStore();
  const { push } = useNavigation();
  const launcher = useWorkoutLauncher();
  const toast = useToast();
  const { collapsed, toggle } = useCollapsedFolders();
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
    const id = actions.createFolder(name);
    if (folderSheet.templateId) {
      actions.moveTemplateToFolder(folderSheet.templateId, id);
      toast({ tone: 'success', title: 'Rotina movida', description: name });
    } else {
      toast({ tone: 'success', title: 'Pasta criada', description: name });
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
              onRename={(folder) => setFolderSheet({ mode: 'rename', folder })}
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
        onClose={() => setFolderSheet(null)}
        onSave={saveFolder}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Drag & drop board: routines between folders, folders in order       */
/* ------------------------------------------------------------------ */

const ROUTINE = 'routine:';
const FOLDER = 'folder:';
const GROUP = 'group:';

/** `group:<key>` (folder header) or `group:<key>:empty` (empty drop zone). */
function groupOfDrop(id: string): string | null {
  return id.startsWith(GROUP) ? id.slice(GROUP.length).split(':')[0] : null;
}

/** Routines may only land on routines or groups; folders only on folders. */
const typedCollision: CollisionDetection = (args) => {
  const folderDrag = String(args.active.id).startsWith(FOLDER);
  return pointerFirst({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => String(container.id).startsWith(FOLDER) === folderDrag,
    ),
  });
};

function RoutineBoard({
  groups,
  folders,
  collapsed,
  onToggle,
  onRename,
  renderCard,
}: {
  groups: RoutineGroup[];
  folders: RoutineFolder[];
  collapsed: string[];
  onToggle: (folderId: string) => void;
  onRename: (folder: RoutineFolder) => void;
  renderCard: (
    template: WorkoutTemplateItem,
    handle?: DragHandleProps,
  ) => ReactNode;
}) {
  const sensors = useDragSensors();
  const [activeId, setActiveId] = useState<string | null>(null);
  // While a routine is dragged, its group may change before it is dropped.
  const [draft, setDraft] = useState<Record<string, string[]> | null>(null);
  const {
    containerRef,
    style: foldStyle,
    begin,
    end,
    detect,
  } = useFoldWhileDragging(activeId?.startsWith(FOLDER) ? activeId : null);

  const hasFolders = folders.length > 0;
  const templatesById = new Map(
    groups.flatMap((group) => group.templates).map((t) => [t.id, t]),
  );
  const base: Record<string, string[]> = Object.fromEntries(
    groups.map((group) => [
      group.folder?.id ?? LOOSE,
      group.templates.map((t) => t.id),
    ]),
  );
  base[LOOSE] ??= [];
  const layout = draft ?? base;
  const folderIds = groups
    .filter((group) => group.folder)
    .map((group) => FOLDER + group.folder!.id);
  const draggingRoutine = activeId?.startsWith(ROUTINE) ?? false;
  const draggingFolder = activeId?.startsWith(FOLDER) ?? false;

  const groupOfRoutine = (lists: Record<string, string[]>, id: string) =>
    Object.keys(lists).find((key) => lists[key].includes(id)) ?? LOOSE;

  const nameOf = (id: string) => {
    if (id.startsWith(FOLDER))
      return folders.find((f) => FOLDER + f.id === id)?.name ?? '';
    if (id.startsWith(ROUTINE))
      return templatesById.get(id.slice(ROUTINE.length))?.name ?? '';
    const key = groupOfDrop(id);
    return key === LOOSE
      ? 'Sem pasta'
      : `pasta ${folders.find((f) => f.id === key)?.name ?? ''}`;
  };
  const positionOf = (id: string) => {
    if (id.startsWith(FOLDER)) return folderIds.indexOf(id);
    if (id.startsWith(ROUTINE)) {
      const key = id.slice(ROUTINE.length);
      return layout[groupOfRoutine(layout, key)]?.indexOf(key) ?? 0;
    }
    return 0;
  };

  const finish = () => {
    end();
    setActiveId(null);
    setDraft(null);
  };

  const renderRoutines = (groupKey: string) => {
    const ids = layout[groupKey] ?? [];
    return (
      <SortableContext
        items={ids.map((id) => ROUTINE + id)}
        strategy={verticalListSortingStrategy}
      >
        {ids.length > 0 ? (
          <div className="space-y-3">
            {ids.map((id) => {
              const template = templatesById.get(id);
              if (!template) return null;
              return (
                <SortableRow
                  key={id}
                  id={ROUTINE + id}
                  sorting={draggingRoutine}
                >
                  {({ handle }) => renderCard(template, handle)}
                </SortableRow>
              );
            })}
          </div>
        ) : (
          <EmptyDropZone groupKey={groupKey} />
        )}
      </SortableContext>
    );
  };

  const looseIds = layout[LOOSE] ?? [];
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detect(typedCollision)}
      modifiers={[lockToVerticalAxis]}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{
        announcements: moveAnnouncements(
          (id) => nameOf(String(id)),
          (id) => positionOf(String(id)),
        ),
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
      onDragStart={({ active }) => {
        const id = String(active.id);
        if (id.startsWith(FOLDER)) begin(id);
        else setDraft(base);
        setActiveId(id);
        haptic('tap');
      }}
      onDragOver={({ active, over }) => {
        const id = String(active.id);
        if (!over || !id.startsWith(ROUTINE) || !draft) return;
        const routineId = id.slice(ROUTINE.length);
        const overId = String(over.id);
        const source = groupOfRoutine(draft, routineId);
        const target = overId.startsWith(ROUTINE)
          ? groupOfRoutine(draft, overId.slice(ROUTINE.length))
          : groupOfDrop(overId);
        if (!target || target === source) return;
        const index = overId.startsWith(ROUTINE)
          ? draft[target].indexOf(overId.slice(ROUTINE.length))
          : 0;
        const next = { ...draft };
        next[source] = next[source].filter((item) => item !== routineId);
        next[target] = [...(next[target] ?? [])];
        next[target].splice(Math.max(0, index), 0, routineId);
        setDraft(next);
      }}
      onDragCancel={finish}
      onDragEnd={({ active, over }) => {
        const id = String(active.id);
        const current = draft;
        finish();
        if (!over) return;
        const overId = String(over.id);
        if (id.startsWith(FOLDER)) {
          const to = folderIds.indexOf(overId);
          if (to !== -1 && overId !== id) {
            actions.reorderFolder(id.slice(FOLDER.length), to);
            haptic('success');
          }
          return;
        }
        if (!current) return;
        const routineId = id.slice(ROUTINE.length);
        const group = groupOfRoutine(current, routineId);
        let index = current[group].indexOf(routineId);
        if (overId.startsWith(ROUTINE)) {
          const overIndex = current[group].indexOf(
            overId.slice(ROUTINE.length),
          );
          if (overIndex !== -1) index = overIndex;
        }
        actions.placeRoutine(routineId, group, index);
        haptic('success');
      }}
    >
      <div ref={containerRef} style={foldStyle} className="space-y-4">
        {hasFolders ? (
          <SortableContext
            items={folderIds}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group) => {
              const folder = group.folder;
              if (!folder) return null;
              const count = (layout[folder.id] ?? []).length;
              return (
                <SortableRow
                  key={folder.id}
                  id={FOLDER + folder.id}
                  sorting={draggingFolder}
                >
                  {({ handle }) => (
                    <FolderSection
                      folder={folder}
                      count={count}
                      position={folderIds.indexOf(FOLDER + folder.id)}
                      total={folderIds.length}
                      collapsed={collapsed.includes(folder.id)}
                      folded={draggingFolder}
                      handle={handle}
                      onToggle={() => onToggle(folder.id)}
                      onRename={() => onRename(folder)}
                    >
                      {renderRoutines(folder.id)}
                    </FolderSection>
                  )}
                </SortableRow>
              );
            })}
          </SortableContext>
        ) : (
          renderRoutines(LOOSE)
        )}

        {hasFolders && (looseIds.length > 0 || draggingRoutine) && (
          <section aria-labelledby="loose-routines">
            <LooseHeader />
            {renderRoutines(LOOSE)}
          </section>
        )}
      </div>

      {createPortal(
        <DragOverlay dropAnimation={{ duration: 180 }} zIndex={80}>
          {activeId ? (
            <div className="rounded-lg shadow-sheet ring-2 ring-brand">
              {activeId.startsWith(FOLDER) ? (
                <FolderPreview
                  name={nameOf(activeId)}
                  count={(layout[activeId.slice(FOLDER.length)] ?? []).length}
                />
              ) : (
                <RoutinePreview
                  template={templatesById.get(activeId.slice(ROUTINE.length))}
                />
              )}
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}

/** "Sem pasta" title; also a drop target to take a routine out of a folder. */
function LooseHeader() {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${GROUP}${LOOSE}`,
  });
  const highlight = isOver && String(active?.id).startsWith(ROUTINE);
  return (
    <h3
      ref={setNodeRef}
      id="loose-routines"
      className={cx(
        'text-micro mb-2 rounded-md px-1 py-1 font-semibold tracking-wider text-ink-3 uppercase transition-colors',
        highlight && 'bg-brand-soft text-brand-ink',
      )}
    >
      Sem pasta
    </h3>
  );
}

/** Placeholder of an empty group that accepts dropped routines. */
function EmptyDropZone({ groupKey }: { groupKey: string }) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `${GROUP}${groupKey}:empty`,
  });
  const dragging = String(active?.id ?? '').startsWith(ROUTINE);
  return (
    <p
      ref={setNodeRef}
      className={cx(
        'text-callout rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
        isOver && dragging
          ? 'border-brand bg-brand-soft text-brand-ink'
          : 'border-line-strong text-ink-2',
      )}
    >
      {dragging ? (
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

function FolderPreview({ name, count }: { name: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-surface px-4 py-3">
      <Folder size={20} className="text-brand-ink" aria-hidden="true" />
      <span className="text-headline min-w-0 flex-1 truncate font-semibold">
        {name}
      </span>
      <span className="text-footnote text-ink-2">
        {pluralize(count, 'rotina', 'rotinas')}
      </span>
    </div>
  );
}

function FolderSection({
  folder,
  count,
  position,
  total,
  collapsed,
  folded,
  handle,
  onToggle,
  onRename,
  children,
}: {
  folder: RoutineFolder;
  count: number;
  position: number;
  total: number;
  collapsed: boolean;
  /** Shown as a header only while folders are being reordered. */
  folded: boolean;
  handle: DragHandleProps;
  onToggle: () => void;
  onRename: () => void;
  children: ReactNode;
}) {
  // The header takes routines dropped on it (also when the folder is closed).
  const {
    setNodeRef: bindDrop,
    isOver,
    active,
  } = useDroppable({ id: `${GROUP}${folder.id}` });
  const dropHere = isOver && String(active?.id ?? '').startsWith(ROUTINE);
  const { push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const titleId = `folder-${folder.id}`;
  const listId = `folder-list-${folder.id}`;
  const Icon = collapsed ? Folder : FolderOpen;

  const removeEmpty = () => {
    actions.deleteFolder(folder.id, false);
    toast({
      tone: 'success',
      title: 'Pasta excluída',
      description: folder.name,
    });
  };

  const menu: SheetAction[] = [
    {
      label: 'Nova rotina nesta pasta',
      icon: Plus,
      onSelect: () => push({ name: 'routine', folderId: folder.id }),
    },
    { label: 'Renomear pasta', icon: Pencil, onSelect: onRename },
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
      onSelect: () => (count > 0 ? setDeleteOpen(true) : removeEmpty()),
    },
  ];

  return (
    <section aria-labelledby={titleId}>
      <div
        ref={bindDrop}
        className={cx(
          'flex items-center gap-1 rounded-lg transition-colors',
          dropHere && 'bg-brand-soft ring-2 ring-brand',
          folded && 'bg-surface px-1',
        )}
      >
        <DragHandle
          handle={handle}
          label={`Arrastar a pasta ${folder.name} para reordenar`}
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
          <span id={titleId} className="text-headline truncate font-semibold">
            {folder.name}
          </span>
          <span className="text-footnote shrink-0 text-ink-3 tabular">
            {pluralize(count, 'rotina', 'rotinas')}
          </span>
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
      {!collapsed && !folded && (
        <div id={listId} className="mt-2">
          {children}
        </div>
      )}

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={folder.name}
        actions={menu}
      />
      <ActionSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Excluir a pasta "${folder.name}"?`}
        actions={[
          {
            label: 'Excluir só a pasta',
            description: `${pluralize(count, 'rotina vai', 'rotinas vão')} para "Sem pasta"`,
            icon: FolderInput,
            onSelect: () => {
              actions.deleteFolder(folder.id, false);
              toast({
                tone: 'success',
                title: 'Pasta excluída',
                description: 'As rotinas continuam na lista.',
              });
            },
          },
          {
            label: 'Excluir pasta e rotinas',
            description: `Apaga ${pluralize(count, 'rotina', 'rotinas')}; o diário de treinos fica`,
            icon: Trash2,
            tone: 'danger',
            onSelect: async () => {
              const ok = await confirm({
                title: `Excluir ${pluralize(count, 'rotina', 'rotinas')}?`,
                message: `A pasta "${folder.name}" e as rotinas dela serão removidas. Treinos já concluídos continuam no diário.`,
                confirmLabel: 'Excluir tudo',
                tone: 'danger',
                icon: Trash2,
              });
              if (!ok) return;
              actions.deleteFolder(folder.id, true);
              toast({ tone: 'success', title: 'Pasta e rotinas excluídas' });
            },
          },
        ]}
      />
    </section>
  );
}

function FolderNameSheet({
  state,
  onClose,
  onSave,
}: {
  state: FolderSheetState | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const renaming = state?.mode === 'rename';
  return (
    <NameSheet
      open={state !== null}
      onClose={onClose}
      onSave={onSave}
      title={renaming ? 'Renomear pasta' : 'Nova pasta'}
      description={
        renaming
          ? undefined
          : 'Agrupe rotinas por academia, fase do treino ou como preferir.'
      }
      label="Nome da pasta"
      placeholder="Ex.: Academia do centro"
      initial={state?.mode === 'rename' ? state.folder.name : ''}
      saveLabel={renaming ? 'Salvar nome' : 'Criar pasta'}
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
              ? `Agora em ${currentFolder.name}`
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
          ...sortFolders(folders).map((folder): SheetAction => ({
            label: folder.name,
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
    </Card>
  );
}
