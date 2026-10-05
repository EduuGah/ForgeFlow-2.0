import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type Modifier,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cx } from './core';
import { haptic } from '../lib/haptics';

export { arrayMove };

/** Keeps a dragged row on its column (vertical lists only). */
export const lockToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

/**
 * Picks the row under the finger, else the row nearest to it. Rows can be
 * tall or fold while dragging, so the pointer is a steadier guide than the
 * dragged row's own rectangle. Keyboard moves have no pointer and fall back
 * to the closest centre.
 */
export const pointerFirst: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  if (hits.length > 0) return hits;
  const { pointerCoordinates, droppableContainers, droppableRects } = args;
  if (!pointerCoordinates) return closestCenter(args);
  let nearest: { id: UniqueIdentifier; distance: number } | null = null;
  for (const container of droppableContainers) {
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const { y } = pointerCoordinates;
    const distance =
      y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (!nearest || distance < nearest.distance)
      nearest = { id: container.id, distance };
  }
  return nearest ? [{ id: nearest.id, data: { value: nearest.distance } }] : [];
};

/** Mouse drags after a few pixels; touch on the handle starts at once. */
export function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

export const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    'Para mover, pressione espaço ou Enter, use as setas para escolher a posição e pressione espaço de novo para soltar. Esc cancela.',
};

/** Spoken feedback while moving with the keyboard or a screen reader. */
export function moveAnnouncements(
  nameOf: (id: UniqueIdentifier) => string,
  positionOf: (id: UniqueIdentifier) => number,
): Announcements {
  return {
    onDragStart: ({ active }) =>
      `${nameOf(active.id)} selecionado, posição ${positionOf(active.id) + 1}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} na posição ${positionOf(over.id) + 1}.`
        : `${nameOf(active.id)} fora da lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} solto na posição ${positionOf(over.id) + 1}.`
        : `${nameOf(active.id)} solto.`,
    onDragCancel: ({ active }) =>
      `Movimento cancelado. ${nameOf(active.id)} voltou ao lugar.`,
  };
}

export interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  /** Element that starts the drag (named so lint does not treat it as a ref). */
  bindActivator: (element: HTMLElement | null) => void;
}

/** Grip that starts a drag; also focusable for keyboard moves. */
export function DragHandle({
  handle: { attributes, listeners, bindActivator },
  label,
  className,
}: {
  handle: DragHandleProps;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      ref={bindActivator}
      {...attributes}
      {...listeners}
      aria-label={label}
      title={label}
      className={cx(
        'grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ink-3 active:cursor-grabbing active:bg-raised',
        className,
      )}
    >
      <GripVertical size={18} aria-hidden="true" />
    </button>
  );
}

export interface SortableRenderState {
  handle: DragHandleProps;
  /** This row is the one being dragged (its place in the list). */
  dragging: boolean;
  /** Any row of the list is being dragged: rows may fold to a compact form. */
  sorting: boolean;
}

/**
 * Vertical list reordered by dragging a handle (touch, mouse or keyboard).
 * While a row moves, the list can fold its rows (`sorting`) and a compact
 * copy follows the finger (`renderOverlay`).
 */
export function SortableList({
  ids,
  onMove,
  nameOf,
  renderOverlay,
  children,
  className,
  label,
}: {
  ids: string[];
  onMove: (from: number, to: number) => void;
  nameOf: (id: string) => string;
  renderOverlay?: (id: string) => ReactNode;
  children: (
    id: string,
    index: number,
    state: SortableRenderState,
  ) => ReactNode;
  className?: string;
  /** Accessible name of the list. */
  label: string;
}) {
  const sensors = useDragSensors();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Rows may fold while dragging; holding the list's height keeps the page
  // from shrinking and the scroll position from jumping under the finger.
  const listRef = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState<number | null>(null);
  // When rows fold, the dragged row moves up away from the finger; the
  // collision check reads the pointer shifted by the same amount so the
  // finger keeps pointing at the folded row.
  const startTop = useRef<number | null>(null);
  const shift = useRef(0);
  const release = () => {
    setActiveId(null);
    setHeldHeight(null);
    startTop.current = null;
    shift.current = 0;
  };

  const rowOf = (id: string) =>
    [...(listRef.current?.children ?? [])].find(
      (element) => (element as HTMLElement).dataset.sortableId === id,
    );

  useLayoutEffect(() => {
    if (!activeId || startTop.current === null) return;
    const row = rowOf(activeId);
    if (row) shift.current = row.getBoundingClientRect().top - startTop.current;
  }, [activeId]);

  const collisionDetection: CollisionDetection = (args) =>
    pointerFirst(
      args.pointerCoordinates
        ? {
            ...args,
            pointerCoordinates: {
              x: args.pointerCoordinates.x,
              y: args.pointerCoordinates.y + shift.current,
            },
          }
        : args,
    );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      modifiers={[lockToVerticalAxis]}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{
        announcements: moveAnnouncements(
          (id) => nameOf(String(id)),
          (id) => ids.indexOf(String(id)),
        ),
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
      onDragStart={({ active }) => {
        // Measured before the rows fold (the fold happens on this update).
        startTop.current =
          rowOf(String(active.id))?.getBoundingClientRect().top ?? null;
        shift.current = 0;
        setHeldHeight(listRef.current?.offsetHeight ?? null);
        setActiveId(String(active.id));
        haptic('tap');
      }}
      onDragCancel={release}
      onDragEnd={({ active, over }) => {
        release();
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        onMove(from, to);
        haptic('success');
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={listRef}
          role="list"
          aria-label={label}
          className={className}
          style={heldHeight ? { minHeight: heldHeight } : undefined}
        >
          {ids.map((id, index) => (
            <SortableRow key={id} id={id} sorting={activeId !== null}>
              {(state) => children(id, index, state)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      {renderOverlay &&
        // Portaled: a transformed ancestor (sheets, the workout panel) would
        // otherwise offset the fixed-position overlay.
        createPortal(
          <DragOverlay dropAnimation={{ duration: 180 }} zIndex={80}>
            {activeId ? (
              <div className="rounded-lg shadow-sheet ring-2 ring-brand">
                {renderOverlay(activeId)}
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

function SortableRow({
  id,
  sorting,
  children,
}: {
  id: string;
  sorting: boolean;
  children: (state: SortableRenderState) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      data-sortable-id={id}
      role="listitem"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cx('relative', isDragging && 'z-10 opacity-40')}
    >
      {children({
        handle: {
          attributes,
          listeners,
          bindActivator: setActivatorNodeRef,
        },
        dragging: isDragging,
        sorting,
      })}
    </div>
  );
}
