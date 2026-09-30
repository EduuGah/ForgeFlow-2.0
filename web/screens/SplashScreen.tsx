import { BrandMark } from '../ui/Feedback';

/** Shown while the saved session is restored (Firebase auth resolves). */
export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 grid place-items-center bg-canvas"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center">
        <div className="animate-pop">
          <BrandMark size={64} />
        </div>
        <p className="font-metric mt-5 animate-fade-in text-metric-sm tracking-[0.18em] text-ink">
          FORGEFLOW
        </p>
        <div
          className="mt-6 h-0.5 w-28 overflow-hidden rounded-full bg-overlay"
          aria-hidden="true"
        >
          <div className="h-full w-2/5 animate-indeterminate rounded-full bg-brand-ink" />
        </div>
        <span className="sr-only">Carregando seus treinos</span>
      </div>
    </div>
  );
}
