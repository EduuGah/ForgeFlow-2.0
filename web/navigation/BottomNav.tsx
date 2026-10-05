import { useMemo, useState } from 'react';
import {
  ChevronRight,
  ClipboardList,
  Dumbbell,
  House,
  Play,
  Plus,
  TrendingUp,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { findExercise, useAppStore } from '../store';
import { formatClock, pluralize } from '../lib/format';
import { muscleCode, suggestNextTemplate } from '../lib/training';
import { groupRoutines } from '../lib/folders';
import { haptic } from '../lib/haptics';
import { useWorkoutLauncher } from '../features/useWorkoutLauncher';
import { useRestCountdown } from '../features/RestTimer';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/Feedback';
import { Sheet } from '../ui/Overlay';
import { cx, useNow } from '../ui/core';
import { useNavigation, type Tab } from './Navigator';

interface Item {
  tab: Tab;
  label: string;
  icon: LucideIcon;
}

const LEFT: Item[] = [
  { tab: 'home', label: 'Hoje', icon: House },
  { tab: 'routines', label: 'Rotinas', icon: ClipboardList },
];
const RIGHT: Item[] = [
  { tab: 'progress', label: 'Evolução', icon: TrendingUp },
  { tab: 'profile', label: 'Perfil', icon: UserRound },
];

/** Dock height and the gap that floats it above the screen edge. */
export const NAV_HEIGHT = 68;
export const DOCK_GAP = 12;

/**
 * Floating dock: four destinations around a raised "Treinar" button, which
 * starts (or resumes) a workout from anywhere in the app.
 */
export function BottomNav() {
  const { tab, selectTab, openWorkout } = useNavigation();
  const { activeWorkout } = useAppStore();
  const [startOpen, setStartOpen] = useState(false);

  const renderItem = ({ tab: itemTab, label, icon: Icon }: Item) => {
    const active = tab === itemTab;
    return (
      <li key={itemTab} className="contents">
        <button
          type="button"
          aria-current={active ? 'page' : undefined}
          onClick={() => {
            haptic('tap');
            selectTab(itemTab);
          }}
          className={cx(
            'relative flex flex-col items-center justify-center gap-1 transition-colors',
            active ? 'text-brand-ink' : 'text-ink-2 active:text-ink',
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              'absolute top-0 h-[3px] rounded-b-full bg-brand transition-all duration-300 ease-standard',
              active ? 'w-7 opacity-100' : 'w-0 opacity-0',
            )}
          />
          <Icon size={22} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
          <span
            className={cx(
              'text-caption',
              active ? 'font-semibold' : 'font-medium',
            )}
          >
            {label}
          </span>
        </button>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 lg:hidden"
        style={{
          paddingBottom: `calc(${DOCK_GAP}px + env(safe-area-inset-bottom))`,
        }}
      >
        <ul
          className="app-column pointer-events-auto grid grid-cols-5 rounded-[22px] border border-line bg-surface/92 shadow-dock backdrop-blur-xl"
          style={{ height: NAV_HEIGHT }}
          role="list"
        >
          {LEFT.map(renderItem)}
          <li className="flex items-start justify-center">
            <CenterButton
              active={Boolean(activeWorkout)}
              startedAt={activeWorkout?.startedAt}
              onPress={() => {
                haptic('tap');
                if (activeWorkout) openWorkout();
                else setStartOpen(true);
              }}
            />
          </li>
          {RIGHT.map(renderItem)}
        </ul>
      </nav>
      <StartWorkoutSheet open={startOpen} onClose={() => setStartOpen(false)} />
    </>
  );
}

/**
 * Desktop navigation: a sidebar with the brand, the "Treinar" action (or
 * the running workout with its clock) and the four destinations.
 */
export function SideNav() {
  const { tab, selectTab, openWorkout } = useNavigation();
  const { activeWorkout } = useAppStore();
  const [startOpen, setStartOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-width)] flex-col border-r border-line bg-surface px-3 pt-5 pb-4 lg:flex"
      >
        <div className="flex items-center gap-2.5 px-2">
          <BrandMark size={34} />
          <span className="text-headline font-bold tracking-tight">
            ForgeFlow
          </span>
        </div>

        <div className="mt-6 px-1">
          {activeWorkout ? (
            <SideWorkoutButton
              name={activeWorkout.name}
              startedAt={activeWorkout.startedAt}
              onPress={openWorkout}
            />
          ) : (
            <Button
              block
              size="lg"
              icon={Dumbbell}
              onClick={() => setStartOpen(true)}
            >
              Treinar
            </Button>
          )}
        </div>

        <ul className="mt-6 space-y-1" role="list">
          {[...LEFT, ...RIGHT].map(({ tab: itemTab, label, icon: Icon }) => {
            const active = tab === itemTab;
            return (
              <li key={itemTab}>
                <button
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectTab(itemTab)}
                  className={cx(
                    'text-body flex h-11 w-full items-center gap-3 rounded-md px-3 text-left transition-colors',
                    active
                      ? 'bg-brand-soft font-semibold text-brand-ink'
                      : 'font-medium text-ink-2 hover:bg-raised hover:text-ink',
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.3 : 1.9}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-caption mt-auto px-3 text-ink-3">
          Dica: arraste pela alça ⋮⋮ para reordenar.
        </p>
      </nav>
      <StartWorkoutSheet open={startOpen} onClose={() => setStartOpen(false)} />
    </>
  );
}

function SideWorkoutButton({
  name,
  startedAt,
  onPress,
}: {
  name: string;
  startedAt: string;
  onPress: () => void;
}) {
  const now = useNow(1000);
  const rest = useRestCountdown();
  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(startedAt).getTime()) / 1000),
  );
  return (
    <button
      type="button"
      onClick={onPress}
      className="ember-edge pressable flex w-full items-center gap-3 rounded-lg bg-raised p-3 text-left"
    >
      <span
        className="size-2.5 shrink-0 animate-pulse-dot rounded-full bg-brand"
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="text-footnote block font-semibold">
          {rest.active ? 'Descansando' : 'Treino em andamento'}
        </span>
        <span className="text-caption block truncate text-ink-2">{name}</span>
      </span>
      <span className="font-metric text-metric-sm text-brand-ink tabular">
        {formatClock(rest.active ? rest.remainingSeconds : elapsed)}
      </span>
    </button>
  );
}

function CenterButton({
  active,
  startedAt,
  onPress,
}: {
  active: boolean;
  startedAt?: string;
  onPress: () => void;
}) {
  const now = useNow(1000, active);
  const rest = useRestCountdown();
  const elapsed = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;
  const resting = active && rest.active;
  const circumference = 2 * Math.PI * 31;

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={
        !active
          ? 'Começar um treino'
          : resting
            ? `Retomar treino, descanso de ${formatClock(rest.remainingSeconds)}`
            : 'Retomar treino em andamento'
      }
      className="pressable -mt-5 flex flex-col items-center gap-1"
    >
      <span className="relative grid size-14 place-items-center rounded-2xl bg-brand text-on-brand shadow-[0_8px_24px_rgb(255_122_26/0.35)]">
        {resting && (
          <svg
            className="absolute -inset-1.5 -rotate-90"
            viewBox="0 0 68 68"
            aria-hidden="true"
          >
            <circle
              cx="34"
              cy="34"
              r="31"
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - rest.progress)}
              style={{ transition: 'stroke-dashoffset 300ms linear' }}
            />
          </svg>
        )}
        {active && !resting && (
          <span
            className="absolute -inset-1 animate-pulse-dot rounded-[20px] ring-2 ring-brand/60"
            aria-hidden="true"
          />
        )}
        {active ? (
          <Play size={24} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Dumbbell size={24} strokeWidth={2.2} aria-hidden="true" />
        )}
      </span>
      <span
        className={cx(
          'text-caption font-semibold tabular',
          active ? 'text-brand-ink' : 'text-ink',
        )}
      >
        {!active
          ? 'Treinar'
          : resting
            ? formatClock(rest.remainingSeconds)
            : formatClock(elapsed)}
      </span>
    </button>
  );
}

function StartWorkoutSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { templates, folders, history } = useAppStore();
  const { push } = useNavigation();
  const launcher = useWorkoutLauncher();
  const suggestion = useMemo(
    () => suggestNextTemplate(templates, history),
    [templates, history],
  );
  const others = templates.filter((template) => template.id !== suggestion?.id);
  // One list per folder (e.g. per gym); routines without a folder last.
  const groups = groupRoutines(others, folders).filter(
    (group) => group.templates.length > 0,
  );

  const start = (templateId: string) => {
    onClose();
    void launcher.startRoutine(templateId);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Começar treino"
      description="Escolha uma rotina ou comece do zero."
    >
      <div className="space-y-5">
        <Button
          size="lg"
          block
          icon={Zap}
          onClick={() => {
            onClose();
            void launcher.startEmpty();
          }}
        >
          Treino livre
        </Button>

        {suggestion && (
          <section aria-labelledby="start-suggestion">
            <h3
              id="start-suggestion"
              className="text-micro mb-2 font-semibold tracking-wider text-ink-2 uppercase"
            >
              Sugestão para hoje
            </h3>
            <button
              type="button"
              onClick={() => start(suggestion.id)}
              className="ember-edge flex w-full items-center gap-3 rounded-lg bg-raised p-4 text-left active:bg-overlay"
            >
              <span className="min-w-0 flex-1">
                <span className="text-headline block truncate font-semibold">
                  {suggestion.name}
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    ...new Set(
                      suggestion.exercises.map(
                        (e) => findExercise(e.exerciseId)?.primaryMuscleGroup,
                      ),
                    ),
                  ]
                    .filter(Boolean)
                    .slice(0, 4)
                    .map((group) => (
                      <span
                        key={group}
                        className="text-micro rounded-sm bg-overlay px-1.5 py-0.5 font-semibold text-ink-2"
                      >
                        {muscleCode(group)}
                      </span>
                    ))}
                  <span className="text-caption text-ink-3">
                    {pluralize(
                      suggestion.exercises.length,
                      'exercício',
                      'exercícios',
                    )}
                  </span>
                </span>
              </span>
              <span className="grid size-10 place-items-center rounded-full bg-brand text-on-brand">
                <Play size={18} aria-hidden="true" />
              </span>
            </button>
          </section>
        )}

        {groups.map((group, groupIndex) => (
          <section
            key={group.folder?.id ?? 'loose'}
            aria-labelledby={`start-routines-${groupIndex}`}
          >
            <h3
              id={`start-routines-${groupIndex}`}
              className="text-micro mb-1 font-semibold tracking-wider text-ink-2 uppercase"
            >
              {group.folder?.name ??
                (folders.length > 0 ? 'Sem pasta' : 'Suas rotinas')}
            </h3>
            <ul className="divide-y divide-line" role="list">
              {group.templates.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => start(template.id)}
                    className="flex min-h-14 w-full items-center gap-3 py-2 text-left active:bg-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-body block truncate font-medium">
                        {template.name}
                      </span>
                      <span className="text-footnote text-ink-2">
                        {pluralize(
                          template.exercises.length,
                          'exercício',
                          'exercícios',
                        )}
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-ink-3"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Button
          variant="ghost"
          block
          icon={Plus}
          onClick={() => {
            onClose();
            push({ name: 'routine' });
          }}
        >
          Criar rotina
        </Button>
      </div>
    </Sheet>
  );
}
