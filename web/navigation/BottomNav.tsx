import { Dumbbell, House, UserRound, type LucideIcon } from 'lucide-react';
import { cx } from '../ui/core';
import { haptic } from '../lib/haptics';
import { useNavigation, type Tab } from './Navigator';

const ITEMS: { tab: Tab; label: string; icon: LucideIcon }[] = [
  { tab: 'home', label: 'Início', icon: House },
  { tab: 'train', label: 'Treino', icon: Dumbbell },
  { tab: 'profile', label: 'Perfil', icon: UserRound },
];

export const NAV_HEIGHT = 64;

export function BottomNav() {
  const { tab, selectTab } = useNavigation();
  return (
    <nav
      aria-label="Navegação principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md"
    >
      <ul
        className="app-column grid grid-cols-3"
        style={{ height: NAV_HEIGHT }}
        role="list"
      >
        {ITEMS.map(({ tab: itemTab, label, icon: Icon }) => {
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
                  'flex flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-brand-ink' : 'text-ink-2 active:text-ink',
                )}
              >
                <span
                  className={cx(
                    'grid h-8 w-16 place-items-center rounded-full transition-colors duration-200',
                    active && 'bg-brand-soft',
                  )}
                >
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.3 : 1.9}
                    aria-hidden="true"
                  />
                </span>
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
        })}
      </ul>
    </nav>
  );
}
