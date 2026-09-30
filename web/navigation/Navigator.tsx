import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cx, useBackLayer } from '../ui/core';

export type Tab = 'home' | 'train' | 'profile';

export type Route =
  | { name: 'stats' }
  | { name: 'goals' }
  | { name: 'hydration' }
  | { name: 'nutrition' }
  | { name: 'social' }
  | { name: 'settings' }
  | { name: 'editProfile' }
  | { name: 'library' }
  | { name: 'history' }
  | { name: 'exercise'; exerciseId: string }
  | { name: 'workout'; workoutId: string }
  | { name: 'routine'; templateId?: string };

export interface StackEntry {
  key: number;
  route: Route;
}

interface NavigationValue {
  tab: Tab;
  stack: StackEntry[];
  /** Increments when the stack is cleared without animation (tab switch). */
  resetCount: number;
  workoutOpen: boolean;
  push: (route: Route) => void;
  pop: () => void;
  selectTab: (tab: Tab) => void;
  openWorkout: () => void;
  closeWorkout: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value)
    throw new Error('useNavigation must be used inside NavigationProvider');
  return value;
}

let entrySeed = 0;

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>('home');
  const [stack, setStack] = useState<StackEntry[]>([]);
  const [resetCount, setResetCount] = useState(0);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const scrollPositions = useRef<Record<Tab, number>>({
    home: 0,
    train: 0,
    profile: 0,
  });

  const push = useCallback((route: Route) => {
    entrySeed += 1;
    const entry = { key: entrySeed, route };
    setStack((current) => [...current, entry]);
  }, []);

  const pop = useCallback(() => {
    setStack((current) => current.slice(0, -1));
  }, []);

  const selectTab = useCallback(
    (next: Tab) => {
      if (stack.length > 0) {
        setStack([]);
        setResetCount((count) => count + 1);
        if (next === tab) return;
      } else if (next === tab) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      scrollPositions.current[tab] = window.scrollY;
      setTab(next);
    },
    [stack.length, tab],
  );

  // Each tab keeps its own scroll position, like native tab bars.
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.current[tab] ?? 0);
  }, [tab]);

  const openWorkout = useCallback(() => setWorkoutOpen(true), []);
  const closeWorkout = useCallback(() => setWorkoutOpen(false), []);

  const value = useMemo<NavigationValue>(
    () => ({
      tab,
      stack,
      resetCount,
      workoutOpen,
      push,
      pop,
      selectTab,
      openWorkout,
      closeWorkout,
    }),
    [
      tab,
      stack,
      resetCount,
      workoutOpen,
      push,
      pop,
      selectTab,
      openWorkout,
      closeWorkout,
    ],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Stack host                                                          */
/* ------------------------------------------------------------------ */

/**
 * Renders pushed screens above the active tab. Screens slide in from the
 * right; popped screens stay mounted while they slide out. The tab root stays
 * rendered underneath, so its scroll position survives a push.
 */
export function StackHost({
  render,
  bottomInset,
}: {
  render: (route: Route) => ReactNode;
  bottomInset: string;
}) {
  const { stack, resetCount, pop } = useNavigation();
  const [leaving, setLeaving] = useState<StackEntry[]>([]);
  const [previous, setPrevious] = useState({ stack, resetCount });

  if (previous.stack !== stack || previous.resetCount !== resetCount) {
    const removed = previous.stack.filter((entry) => !stack.includes(entry));
    setPrevious({ stack, resetCount });
    if (previous.resetCount !== resetCount) setLeaving([]);
    else if (removed.length > 0)
      setLeaving((current) => [...current, ...removed]);
  }

  const finishLeaving = (key: number) =>
    setLeaving((current) => current.filter((entry) => entry.key !== key));

  // One keyed list keeps the same component instance while a screen slides
  // out, so its scroll position and state do not reset mid-animation.
  const layers = [
    ...stack.map((entry, index) => ({
      entry,
      leaving: false,
      top: index === stack.length - 1,
    })),
    ...leaving.map((entry) => ({ entry, leaving: true, top: false })),
  ].sort((a, b) => a.entry.key - b.entry.key);

  return (
    <>
      {layers.map(({ entry, leaving: isLeaving, top }, index) => (
        <StackScreen
          key={entry.key}
          top={top}
          leaving={isLeaving}
          onBack={isLeaving ? noop : pop}
          onLeft={() => finishLeaving(entry.key)}
          bottomInset={bottomInset}
          depth={index}
        >
          {render(entry.route)}
        </StackScreen>
      ))}
    </>
  );
}

function noop() {}

const ScreenContext = createContext<{
  isTop: boolean;
  scrollRoot: HTMLElement | null;
}>({
  isTop: true,
  scrollRoot: null,
});

export function useScreen() {
  return useContext(ScreenContext);
}

function StackScreen({
  children,
  leaving = false,
  top,
  onBack,
  onLeft,
  bottomInset,
  depth,
}: {
  children: ReactNode;
  leaving?: boolean;
  top: boolean;
  onBack: () => void;
  onLeft?: () => void;
  bottomInset: string;
  depth: number;
}) {
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  useBackLayer(!leaving, onBack);

  const onLeftRef = useRef(onLeft);
  useEffect(() => {
    onLeftRef.current = onLeft;
  });
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => onLeftRef.current?.(), 450);
    return () => clearTimeout(id);
  }, [leaving]);
  const context = useMemo(
    () => ({ isTop: top, scrollRoot }),
    [top, scrollRoot],
  );

  return (
    <ScreenContext.Provider value={context}>
      <div
        ref={setScrollRoot}
        aria-hidden={!top || leaving || undefined}
        inert={!top || leaving || undefined}
        onAnimationEnd={(event) => {
          if (leaving && event.target === event.currentTarget) onLeft?.();
        }}
        className={cx(
          'fixed inset-0 overflow-y-auto overscroll-contain bg-canvas',
          leaving ? 'animate-push-out' : 'animate-push-in',
        )}
        style={{ zIndex: 30 + depth, paddingBottom: bottomInset }}
      >
        {children}
      </div>
    </ScreenContext.Provider>
  );
}
