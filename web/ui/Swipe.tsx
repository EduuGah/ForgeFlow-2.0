import {
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Trash2 } from 'lucide-react';
import { cx } from './core';
import { haptic } from '../lib/haptics';

/** Share of the row (or this many px) past which letting go deletes. */
const TRIGGER_RATIO = 0.4;
const TRIGGER_MAX_PX = 140;
/** Movement before deciding between a swipe and a vertical scroll. */
const SLOP = 10;

/**
 * Row that deletes when dragged to the left, revealing a red "Apagar"
 * strip. Vertical drags keep scrolling the page. It only adds a gesture:
 * every row keeps a visible way to delete for keyboard and screen readers.
 */
export function SwipeToDelete({
  onDelete,
  disabled = false,
  label = 'Apagar',
  children,
  className,
  surfaceClassName = 'bg-surface',
  ...rest
}: {
  onDelete: () => void;
  disabled?: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
  /** Opaque background of the moving row, so the red strip shows behind it. */
  surfaceClassName?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>) {
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    width: number;
    swiping: boolean;
  } | null>(null);
  const justSwiped = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [armed, setArmed] = useState(false);

  const threshold = (width: number) =>
    Math.min(TRIGGER_MAX_PX, width * TRIGGER_RATIO);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || settling || event.button !== 0) return;
    const target = event.target as HTMLElement;
    // A mouse drag inside a field selects text; leave it alone.
    if (event.pointerType === 'mouse' && target.closest('input, textarea'))
      return;
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.offsetWidth,
      swiping: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.swiping) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null;
        return;
      }
      if (dx > -SLOP || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      current.swiping = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    // Past the trigger point the row follows the finger more slowly.
    const limit = threshold(current.width);
    const pull = Math.min(0, dx);
    const next = pull < -limit ? -limit + (pull + limit) * 0.35 : pull;
    setOffset(next);
    const nowArmed = next <= -limit;
    if (nowArmed !== armed) {
      setArmed(nowArmed);
      if (nowArmed) haptic('tap');
    }
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    gesture.current = null;
    if (!current || current.id !== event.pointerId || !current.swiping) return;
    setDragging(false);
    justSwiped.current = true;
    setTimeout(() => {
      justSwiped.current = false;
    }, 0);
    setSettling(true);
    if (armed && event.type === 'pointerup') {
      setOffset(-current.width);
      setTimeout(() => {
        onDelete();
        setOffset(0);
        setArmed(false);
        setSettling(false);
      }, 180);
    } else {
      setOffset(0);
      setArmed(false);
      setTimeout(() => setSettling(false), 200);
    }
  };

  return (
    <div
      {...rest}
      className={cx('relative overflow-hidden', className)}
      onClickCapture={(event) => {
        // The click that ends a swipe must not press the button under it.
        if (justSwiped.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {offset < 0 && (
        <div
          aria-hidden="true"
          className={cx(
            'absolute inset-0 flex items-center justify-end gap-2 pr-5 font-semibold transition-colors',
            armed ? 'bg-danger text-white' : 'bg-danger-soft text-danger-ink',
          )}
        >
          <Trash2 size={18} />
          <span className="text-callout">{label}</span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        className={cx('relative touch-pan-y', surfaceClassName)}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: dragging
            ? 'none'
            : 'transform 200ms var(--ease-standard)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Pull distance (or flick speed, px/ms) that dismisses a full-screen panel. */
const PULL_DISMISS_PX = 120;
const PULL_DISMISS_VELOCITY = 0.7;

/**
 * Pull-down-to-dismiss for a panel's header. The drag may start anywhere on
 * it, buttons included: it only takes over after a clear downward move, and
 * then swallows the click that would otherwise press the button.
 */
export function usePullDown(onDismiss: () => void) {
  const start = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
    pulling: boolean;
  } | null>(null);
  const justPulled = useRef(false);
  const [offset, setOffset] = useState(0);
  const [pulling, setPulling] = useState(false);

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    const current = start.current;
    start.current = null;
    if (!current || current.id !== event.pointerId || !current.pulling) return;
    setPulling(false);
    justPulled.current = true;
    setTimeout(() => {
      justPulled.current = false;
    }, 0);
    const distance = Math.max(0, event.clientY - current.y);
    const velocity = distance / Math.max(1, event.timeStamp - current.time);
    if (
      event.type === 'pointerup' &&
      (distance > PULL_DISMISS_PX || velocity > PULL_DISMISS_VELOCITY)
    ) {
      haptic('tap');
      onDismiss();
    } else setOffset(0);
  };

  return {
    offset,
    pulling,
    /** Back to rest (call when the panel opens again). */
    reset: () => setOffset(0),
    handlers: {
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        start.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
          pulling: false,
        };
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const current = start.current;
        if (!current || current.id !== event.pointerId) return;
        const dy = event.clientY - current.y;
        if (!current.pulling) {
          if (dy < SLOP || dy < Math.abs(event.clientX - current.x)) return;
          current.pulling = true;
          current.time = event.timeStamp;
          setPulling(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        setOffset(Math.max(0, dy));
      },
      onPointerUp: end,
      onPointerCancel: end,
      onClickCapture: (event: ReactMouseEvent<HTMLElement>) => {
        if (justPulled.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
  };
}
