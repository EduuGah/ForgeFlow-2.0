/*
 * Installing the app (PWA). Chrome and Edge offer an install prompt the app
 * can trigger; Opera, Firefox, Samsung Internet and Safari install from their
 * own menus, so for those the app explains where.
 */

export type BrowserKind =
  'ios' | 'opera' | 'opera-mini' | 'samsung' | 'firefox' | 'chromium' | 'other';

export function detectBrowser(userAgent: string): BrowserKind {
  const ua = userAgent;
  if (/Opera Mini/i.test(ua)) return 'opera-mini';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/\bOPR\/|\bOPT\/|\bOpera\b|OPiOS/i.test(ua)) return 'opera';
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Chrome|Chromium|CriOS|Edg\//i.test(ua)) return 'chromium';
  return 'other';
}

/** Where to tap, for browsers that install from their own menu. */
export function installSteps(browser: BrowserKind): string[] {
  switch (browser) {
    case 'ios':
      return [
        'Abra este site no Safari (no iPhone, só ele instala apps da web).',
        'Toque em Compartilhar (o quadrado com a seta para cima).',
        'Escolha “Adicionar à Tela de Início” e confirme.',
      ];
    case 'opera':
      return [
        'Toque no menu do Opera (o ícone “O” ou os três pontos ⋮).',
        'Escolha “Tela inicial” ou “Adicionar à tela inicial”.',
        'Confirme em “Adicionar”: o ForgeFlow aparece entre seus apps.',
      ];
    case 'opera-mini':
      return [
        'O Opera Mini não instala apps da web.',
        'Abra este site no Opera, no Chrome ou no Samsung Internet e instale por lá.',
      ];
    case 'samsung':
      return [
        'Toque no menu (☰) no canto de baixo.',
        'Escolha “Adicionar página a” e depois “Tela inicial”.',
      ];
    case 'firefox':
      return [
        'Toque no menu (⋮).',
        'Escolha “Instalar” ou “Adicionar à tela inicial”.',
      ];
    default:
      return [
        'Abra o menu do navegador (⋮).',
        'Escolha “Instalar app” ou “Adicionar à tela inicial”.',
      ];
  }
}

/* ------------------------------------------------------------------ */
/* Browser state                                                       */
/* ------------------------------------------------------------------ */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function changed() {
  listeners.forEach((listener) => listener());
}

/** Keeps the browser's install prompt (when it offers one) for later. */
export function watchInstallPrompt() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    changed();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Shows the browser's own install dialog; true when the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  changed();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

/** Already running as an installed app. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
