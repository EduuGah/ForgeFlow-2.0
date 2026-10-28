import { useNavigation, type Route } from '../navigation/Navigator';
import { Art, type ArtName } from '../ui/Art';

/*
 * Shortcuts on Home to the places that used to be three taps deep in
 * Profile: one swipeable row of painted tiles.
 */

const SHORTCUTS: { label: string; art: ArtName; route: Route }[] = [
  { label: 'Conquistas', art: 'trophy', route: { name: 'achievements' } },
  { label: 'Metas', art: 'target', route: { name: 'goals' } },
  { label: 'Amigos', art: 'friends', route: { name: 'social' } },
  { label: 'Histórico', art: 'calendar', route: { name: 'history' } },
  { label: 'Medidas', art: 'tape', route: { name: 'measurements' } },
  { label: 'Água', art: 'water', route: { name: 'hydration' } },
  { label: 'Nutrição', art: 'meal', route: { name: 'nutrition' } },
  { label: 'Academias', art: 'pin', route: { name: 'gyms' } },
];

export function QuickAccess() {
  const { push } = useNavigation();
  return (
    <nav aria-label="Atalhos">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {SHORTCUTS.map((item) => (
          <li key={item.label} className="shrink-0">
            <button
              type="button"
              onClick={() => push(item.route)}
              className="pressable flex w-[4.5rem] flex-col items-center gap-1.5"
            >
              <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface">
                <Art name={item.art} size={36} />
              </span>
              <span className="text-caption font-medium text-ink-2">
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
