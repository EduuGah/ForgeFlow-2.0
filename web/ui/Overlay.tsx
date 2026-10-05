import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from './Button';
import { Medal } from './Feedback';
import {
  cx,
  useBackLayer,
  usePresence,
  useRestoreFocus,
  useScrollLock,
} from './core';
import { haptic } from '../lib/haptics';

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'auto' | 'tall';
  /** Blocks swipe/backdrop dismissal (e.g. while saving). */
  dismissible?: boolean;
  bodyClassName?: string;
}

const DISMISS_DISTANCE = 110;

export function Sheet({
  open,
  onClose,
  title,
  description,
  headerAction,
  children,
  footer,
  size = 'auto',
  dismissible = true,
  bodyClassName,
}: SheetProps) {
  const { mounted, closing, onExited } = usePresence(open, 420);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startTime: number } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  useBackLayer(open, onClose);
  useScrollLock(mounted);
  useRestoreFocus(open);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement))
      panel.focus({ preventScroll: true });
  }, [open]);

  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    if (open) setDragY(0);
  }

  if (!mounted) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dismissible || closing) return;
    if (
      (event.target as HTMLElement).closest(
        'button, a, input, textarea, select',
      )
    )
      return;
    drag.current = { startY: event.clientY, startTime: event.timeStamp };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setDragY(Math.max(0, event.clientY - drag.current.startY));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const distance = Math.max(0, event.clientY - drag.current.startY);
    const velocity =
      distance / Math.max(1, event.timeStamp - drag.current.startTime);
    drag.current = null;
    setDragging(false);
    if (distance > DISMISS_DISTANCE || velocity > 0.7) onClose();
    else setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className={cx(
          'absolute inset-0 bg-scrim',
          closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Painel'}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && dismissible) {
            event.stopPropagation();
            onClose();
          }
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && closing) onExited();
        }}
        className={cx(
          'app-column absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-xl bg-surface shadow-sheet outline-none',
          // Desktop: a centered window instead of a sheet from the bottom.
          'lg:inset-x-auto lg:top-[8dvh] lg:bottom-auto lg:left-[calc(50%-17.5rem)] lg:w-[35rem] lg:max-h-[84dvh] lg:rounded-xl',
          size === 'tall' && 'h-[92dvh] lg:h-[84dvh]',
          closing ? 'animate-sheet-out' : 'animate-sheet-in',
        )}
        style={{
          translate: `0 ${dragY}px`,
          transition: dragging ? 'none' : 'translate 240ms var(--ease-sheet)',
        }}
      >
        <div
          className="shrink-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong lg:invisible"
            aria-hidden="true"
          />
          {(title || headerAction) && (
            <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3">
              <div className="min-w-0 pt-1">
                {title && (
                  <h2 id={titleId} className="text-title font-bold">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-callout mt-1 text-ink-2">{description}</p>
                )}
              </div>
              {headerAction}
            </div>
          )}
        </div>
        <div
          className={cx(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5',
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : (
          <div className="pb-safe shrink-0" />
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Action sheet                                                        */
/* ------------------------------------------------------------------ */

export interface SheetAction {
  label: string;
  description?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'danger' | 'brand';
  onSelect: () => void;
}

export function ActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      bodyClassName="px-2 pb-2"
    >
      <ul className="space-y-0.5" role="list">
        {actions.map((action) => {
          const Icon = action.icon;
          const tone =
            action.tone === 'danger'
              ? 'text-danger-ink'
              : action.tone === 'brand'
                ? 'text-brand-ink'
                : 'text-ink';
          return (
            <li key={action.label}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  action.onSelect();
                }}
                className="flex min-h-14 w-full items-center gap-4 rounded-md px-3 py-2.5 text-left transition-colors active:bg-raised"
              >
                {Icon && (
                  <Icon
                    size={22}
                    strokeWidth={1.9}
                    className={cx('shrink-0', tone)}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cx('text-body block font-medium', tone)}>
                    {action.label}
                  </span>
                  {action.description && (
                    <span className="text-footnote block text-ink-2">
                      {action.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" block className="mt-2" onClick={onClose}>
        Cancelar
      </Button>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Confirmation dialog                                                 */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: LucideIcon;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [open, setOpen] = useState(false);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setRequest({ options, resolve });
        setOpen(true);
      }),
    [],
  );

  const settle = (result: boolean) => {
    if (!open) return;
    request?.resolve(result);
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ConfirmDialog
          open={open}
          options={request.options}
          onSettle={settle}
        />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  open,
  options,
  onSettle,
}: {
  open: boolean;
  options: ConfirmOptions;
  onSettle: (result: boolean) => void;
}) {
  const { mounted, closing, onExited } = usePresence(open, 260);
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const tone = options.tone ?? 'primary';
  const Icon = options.icon;

  useBackLayer(open, () => onSettle(false));
  useScrollLock(mounted);
  useRestoreFocus(open);

  useEffect(() => {
    if (!open) return;
    // Destructive actions start focused on the safe choice.
    (tone === 'danger' ? cancelRef : confirmRef).current?.focus({
      preventScroll: true,
    });
  }, [open, tone]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-60 grid place-items-center p-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onSettle(false);
      }}
    >
      <div
        aria-hidden="true"
        onClick={() => onSettle(false)}
        className={cx(
          'absolute inset-0 bg-scrim',
          closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && closing) onExited();
        }}
        className={cx(
          'relative w-full max-w-[22rem] rounded-xl bg-surface p-5 text-center shadow-pop',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {Icon && (
          <div
            className={cx(
              'mx-auto mb-4 grid size-14 place-items-center rounded-full',
              tone === 'danger'
                ? 'bg-danger-soft text-danger-ink'
                : 'bg-brand-soft text-brand-ink',
            )}
          >
            <Icon size={26} aria-hidden="true" />
          </div>
        )}
        <h2 id={titleId} className="text-headline font-semibold">
          {options.title}
        </h2>
        {options.message && (
          <div className="text-callout mt-2 text-ink-2">{options.message}</div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Button
            ref={confirmRef}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="lg"
            block
            onClick={() => onSettle(true)}
          >
            {options.confirmLabel}
          </Button>
          <Button
            ref={cancelRef}
            variant="secondary"
            size="lg"
            block
            onClick={() => onSettle(false)}
          >
            {options.cancelLabel ?? 'Cancelar'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: 'success' | 'error' | 'info' | 'record';
  action?: { label: string; onPress: () => void };
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

type ToastFn = (options: ToastOptions) => void;

const ToastContext = createContext<ToastFn>(() => undefined);

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

let toastSeed = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const toast = useCallback<ToastFn>((options) => {
    toastSeed += 1;
    const entry = { ...options, id: toastSeed };
    setToasts((current) => [...current.slice(-2), entry]);
    if (options.tone === 'error') haptic('warning');
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="app-column pointer-events-none fixed inset-x-0 top-0 z-70 flex flex-col gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:left-[var(--sidebar-width)]"
        >
          {toasts.map((item) => (
            <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

const TOAST_ICONS: Record<NonNullable<ToastOptions['tone']>, ReactNode> = {
  success: (
    <CheckCircle2 size={20} className="text-success-ink" aria-hidden="true" />
  ),
  error: (
    <AlertCircle size={20} className="text-danger-ink" aria-hidden="true" />
  ),
  info: <Info size={20} className="text-brand-ink" aria-hidden="true" />,
  record: <Medal size={22} />,
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastEntry;
  onDismiss: (id: number) => void;
}) {
  const duration = toast.duration ?? (toast.action ? 5000 : 3200);
  useEffect(() => {
    const id = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(id);
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex animate-rise items-center gap-3 rounded-lg border border-line-strong bg-raised/95 py-3 pr-2 pl-3.5 shadow-pop backdrop-blur-md"
    >
      {TOAST_ICONS[toast.tone ?? 'info']}
      <div className="min-w-0 flex-1">
        <p className="text-callout font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="text-footnote text-ink-2">{toast.description}</p>
        )}
      </div>
      {toast.action && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.action?.onPress();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => onDismiss(toast.id)}
        className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 active:bg-overlay"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
