import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEventHandler,
} from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCenter,
  getScrollableAncestors,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type AutoScrollOptions,
  type CollisionDetection,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type KeyboardCoordinateGetter,
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
import { CSS, getEventCoordinates } from '@dnd-kit/utilities';
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

// Module constants: new option objects on every render would rebuild the
// sensors and re-render every draggable row.
const HANDLE_OPTIONS = { activationConstraint: { distance: 3 } };
const PRESS_OPTIONS = { activationConstraint: { delay: 220, tolerance: 6 } };

/**
 * - Grip (mouse, pen or finger): drags after 3 px. The grip has
 *   `touch-action: none`, so a finger on it never scrolls the page.
 * - Press and hold (touch) on rows that opt in with `pressToDrag`: a quick
 *   swipe still scrolls, holding still for a moment picks the row up.
 * - Keyboard: space or Enter on the grip, then the arrows.
 */
export function useDragSensors(
  coordinateGetter: KeyboardCoordinateGetter = sortableKeyboardCoordinates,
) {
  const keyboardOptions = useMemo(
    () => ({ coordinateGetter }),
    [coordinateGetter],
  );
  return useSensors(
    useSensor(PointerSensor, HANDLE_OPTIONS),
    useSensor(TouchSensor, PRESS_OPTIONS),
    useSensor(KeyboardSensor, keyboardOptions),
  );
}

/**
 * Scrolls sooner and faster near the screen edges than dnd-kit's default
 * (the sticky header and the tab bar cover part of its zones on phones).
 */
export const AUTO_SCROLL: AutoScrollOptions = {
  threshold: { x: 0, y: 0.18 },
  acceleration: 14,
};

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

/**
 * Spoken feedback for boards with drop targets: `describe` turns a target
 * into a phrase such as "na posição 2 de Academia" or "dentro de Academia".
 */
export function dropAnnouncements(
  nameOf: (id: UniqueIdentifier) => string,
  describe: (over: UniqueIdentifier, active: UniqueIdentifier) => string,
): Announcements {
  return {
    onDragStart: ({ active }) => `${nameOf(active.id)} selecionado.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} ${describe(over.id, active.id)}.`
        : `${nameOf(active.id)} fora da lista.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} solto ${describe(over.id, active.id)}.`
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

/**
 * Rows may fold to a compact form while something is dragged. This keeps
 * the page steady and the finger on the folded row:
 * - folds (`folded`) right after the render that starts the drag, so the
 *   preview is measured where the row was grabbed, under the finger;
 * - holds the container's height, so the page does not shrink and the
 *   scroll position does not jump;
 * - scrolls the dragged row back under the finger once the rows above it
 *   folded. What scrolling cannot make up (near the top of the page) is
 *   kept as a pointer shift for `detect`.
 * Rows are found by their `data-sortable-id`.
 */
export function useFoldWhileDragging(activeId: string | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heldHeight, setHeldHeight] = useState<number | null>(null);
  const [folded, setFolded] = useState(false);
  const startTop = useRef<number | null>(null);
  const shift = useRef(0);

  const rowOf = (id: string) =>
    [
      ...(containerRef.current?.querySelectorAll<HTMLElement>(
        '[data-sortable-id]',
      ) ?? []),
    ].find((element) => element.dataset.sortableId === id);

  useLayoutEffect(() => {
    if (!folded || !activeId || startTop.current === null) return;
    const row = rowOf(activeId);
    if (!row) return;
    const moved = row.getBoundingClientRect().top - startTop.current;
    if (moved !== 0) getScrollableAncestors(row, 1)[0]?.scrollBy(0, moved);
    shift.current = row.getBoundingClientRect().top - startTop.current;
  }, [folded, activeId]);

  useEffect(() => {
    if (activeId !== null && startTop.current !== null) setFolded(true);
  }, [activeId]);

  return {
    containerRef,
    style: heldHeight ? { minHeight: heldHeight } : undefined,
    folded,
    /** Call on drag start, before the rows fold. */
    begin: (id: string) => {
      startTop.current = rowOf(id)?.getBoundingClientRect().top ?? null;
      shift.current = 0;
      setHeldHeight(containerRef.current?.offsetHeight ?? null);
    },
    end: () => {
      startTop.current = null;
      shift.current = 0;
      setHeldHeight(null);
      setFolded(false);
    },
    detect:
      (base: CollisionDetection): CollisionDetection =>
      (args) =>
        base(
          args.pointerCoordinates
            ? {
                ...args,
                pointerCoordinates: {
                  x: args.pointerCoordinates.x,
                  y: args.pointerCoordinates.y + shift.current,
                },
              }
            : args,
        ),
  };
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
  const [offset, setOffset] = useState(0);
  const {
    containerRef,
    style: foldStyle,
    folded,
    begin,
    end,
    detect,
  } = useFoldWhileDragging(activeId);
  const collisionDetection = detect(pointerFirst);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      modifiers={[lockToVerticalAxis]}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={AUTO_SCROLL}
      accessibility={{
        announcements: moveAnnouncements(
          (id) => nameOf(String(id)),
          (id) => ids.indexOf(String(id)),
        ),
        screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
      }}
      onDragStart={({ active, activatorEvent }) => {
        setOffset(previewOffset(activatorEvent, String(active.id)));
        begin(String(active.id));
        setActiveId(String(active.id));
        haptic('tap');
      }}
      onDragCancel={() => {
        end();
        setActiveId(null);
      }}
      onDragEnd={({ active, over }) => {
        end();
        setActiveId(null);
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
          ref={containerRef}
          role="list"
          aria-label={label}
          className={className}
          style={foldStyle}
        >
          {ids.map((id, index) => (
            <SortableRow key={id} id={id} sorting={folded}>
              {(state) => children(id, index, state)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      {renderOverlay && (
        <DragPreview offset={offset}>
          {activeId ? renderOverlay(activeId) : null}
        </DragPreview>
      )}
    </DndContext>
  );
}

/** Gap between the finger and the bottom of the preview, plus its height. */
const PREVIEW_LIFT = 72;

/**
 * Offset that shows the preview just above the finger, wherever the row
 * was grabbed (a tall card, a long press), so the finger never hides it or
 * the place it is over. 0 for keyboard drags, which have no pointer. Call
 * on drag start, while the row is still where it was grabbed.
 */
export function previewOffset(
  activatorEvent: Event | null,
  id: string,
): number {
  const start = activatorEvent ? getEventCoordinates(activatorEvent) : null;
  const row = [
    ...document.querySelectorAll<HTMLElement>('[data-sortable-id]'),
  ].find((element) => element.dataset.sortableId === id);
  if (!start || !row) return 0;
  return start.y - row.getBoundingClientRect().top - PREVIEW_LIFT;
}

/** Compact copy of the dragged row that follows the finger. */
export function DragPreview({
  children,
  offset = 0,
}: {
  children: ReactNode;
  /** From `previewOffset`. */
  offset?: number;
}) {
  // Portaled: a transformed ancestor (sheets, the workout panel) would
  // otherwise offset the fixed-position overlay.
  return createPortal(
    <DragOverlay
      dropAnimation={{ duration: 160 }}
      zIndex={80}
      modifiers={[lockToVerticalAxis]}
    >
      {children ? (
        <div
          className="scale-[1.02] rounded-lg shadow-sheet ring-2 ring-brand"
          style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        >
          {children}
        </div>
      ) : null}
    </DragOverlay>,
    document.body,
  );
}

/** One draggable row; `id` must be unique inside its DndContext. */
export function SortableRow({
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

/* ------------------------------------------------------------------ */
/* Boards: rows dragged onto drop targets (gaps and rows to drop into) */
/* ------------------------------------------------------------------ */

/** Classes for an area where a press and hold picks a row up. */
export const PRESS_TO_DRAG = 'select-none [-webkit-touch-callout:none]';

/**
 * A row dragged onto drop targets. Unlike a sortable row it stays in place
 * (dimmed) while the preview follows the finger, so nothing shifts under
 * the finger; a line or a highlight shows where it will land.
 */
export function useDragRow(id: string) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({ id });
  const handle: DragHandleProps = {
    attributes,
    listeners,
    bindActivator: setActivatorNodeRef,
  };
  return {
    /** The row's element; give it `data-sortable-id={id}` as well. */
    bindRow: setNodeRef,
    handle,
    /** Spread where a press and hold (touch) should pick the row up. */
    pressToDrag: {
      onTouchStart: listeners?.onTouchStart as
        TouchEventHandler<HTMLElement> | undefined,
    },
    dragging: isDragging,
  };
}

/** Data of a drop target: a gap between rows or a row to drop into. */
export type DropData =
  | { drop: 'slot' }
  /** `edge`: share of the top and bottom that still points to the gaps. */
  | { drop: 'into'; edge: number };

/**
 * Gap between two rows where a dragged row can land. It sits in the middle
 * of the `gap` (px) without taking space and draws the drop line while it
 * is the target.
 */
export function DropSlot({
  id,
  disabled,
  gap,
  side = 'before',
}: {
  id: string;
  disabled: boolean;
  gap: number;
  side?: 'before' | 'after';
}) {
  const data: DropData = { drop: 'slot' };
  const { setNodeRef, isOver } = useDroppable({ id, disabled, data });
  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 h-0"
      style={side === 'before' ? { top: -gap / 2 } : { bottom: -gap / 2 }}
    >
      {isOver && (
        <div className="absolute inset-x-0 -top-px h-[3px] rounded-full bg-brand before:absolute before:-top-[3px] before:-left-1 before:size-[9px] before:rounded-full before:border-2 before:border-brand before:bg-canvas" />
      )}
    </div>
  );
}

/**
 * Finger: a row to drop into wins while the finger is over its middle (its
 * top and bottom `edge` still point to the gaps around it); elsewhere the
 * nearest gap wins, so each row splits in a top half (before) and a bottom
 * half (after). Two gaps can share a height (the end of a subfolder and the
 * next row of its parent): the finger's x then picks the level, the
 * deepest one the finger is not left of.
 * Keyboard: the target whose corner the dragged copy was moved to (see
 * `stepKeyboardCoordinates`); at first, the gap at the row's own level.
 */
export const slotCollision: CollisionDetection = ({
  droppableContainers,
  droppableRects,
  pointerCoordinates,
  collisionRect,
}) => {
  let best: { id: UniqueIdentifier; value: number } | null = null;
  for (const container of droppableContainers) {
    const rect = droppableRects.get(container.id);
    if (!rect) continue;
    const data = container.data.current as DropData | undefined;
    let value: number;
    if (!pointerCoordinates) {
      value =
        Math.abs(rect.top - collisionRect.top) +
        Math.abs(rect.left - collisionRect.left) / 1000;
    } else if (data?.drop === 'into') {
      const { y } = pointerCoordinates;
      const edge = rect.height * data.edge;
      if (y < rect.top + edge || y > rect.bottom - edge) continue;
      value = -1;
    } else {
      const { x, y } = pointerCoordinates;
      value =
        Math.abs(y - (rect.top + rect.height / 2)) +
        (x < rect.left ? 0.5 : 0) -
        rect.left / 10000;
    }
    if (!best || value < best.value) best = { id: container.id, value };
  }
  return best ? [{ id: best.id, data: { value: best.value } }] : [];
};

/**
 * Up and down arrows step to the previous or next drop target in screen
 * order (at the same height, the deeper one first) and move the dragged
 * copy to its corner. Use without `lockToVerticalAxis` on the DndContext
 * (lock the preview instead), or the level of the target would be lost.
 */
export const stepKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  {
    context: {
      active,
      collisionRect,
      droppableRects,
      droppableContainers,
      over,
    },
  },
) => {
  const step =
    event.code === KeyboardCode.Down
      ? 1
      : event.code === KeyboardCode.Up
        ? -1
        : 0;
  if (step === 0) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;
  const targets = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      const rect = droppableRects.get(container.id);
      return rect ? [{ id: container.id, top: rect.top, left: rect.left }] : [];
    })
    .sort((a, b) => a.top - b.top || b.left - a.left);
  const current = over ? targets.findIndex((t) => t.id === over.id) : -1;
  const next =
    current !== -1
      ? targets[current + step]
      : step > 0
        ? targets.find((t) => t.top > collisionRect.top)
        : [...targets].reverse().find((t) => t.top < collisionRect.top);
  return next ? { x: next.left, y: next.top } : undefined;
};
