import {
  Droplet,
  History,
  MapPin,
  Ruler,
  Target,
  Trophy,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useNavigation, type Route } from '../navigation/Navigator';

/*
 * Shortcuts on Home to the places that used to be three taps deep in
 * Profile: a 4 × 2 grid of line icons, all on screen at once.
 */

const SHORTCUTS: { label: string; icon: LucideIcon; route: Route }[] = [
  { label: 'Conquistas', icon: Trophy, route: { name: 'achievements' } },
  { label: 'Metas', icon: Target, route: { name: 'goals' } },
  { label: 'Amigos', icon: Users, route: { name: 'social' } },
  { label: 'Histórico', icon: History, route: { name: 'history' } },
  { label: 'Medidas', icon: Ruler, route: { name: 'measurements' } },
  { label: 'Água', icon: Droplet, route: { name: 'hydration' } },
  { label: 'Nutrição', icon: Utensils, route: { name: 'nutrition' } },
  { label: 'Academias', icon: MapPin, route: { name: 'gyms' } },
];

export function QuickAccess() {
  const { push } = useNavigation();
  return (
    <nav aria-label="Atalhos">
      <ul className="grid grid-cols-4 gap-x-2 gap-y-3">
        {SHORTCUTS.map(({ label, icon: Icon, route }) => (
          <li key={label} className="min-w-0">
            <button
              type="button"
              onClick={() => push(route)}
              className="pressable flex w-full flex-col items-center gap-1.5"
            >
              <span className="grid size-12 place-items-center rounded-2xl border border-line bg-surface text-brand-ink">
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="text-caption w-full truncate text-center font-medium text-ink-2">
                {label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
