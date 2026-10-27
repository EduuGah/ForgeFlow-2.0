import { useState, useSyncExternalStore } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import {
  canPromptInstall,
  detectBrowser,
  installSteps,
  isInstalled,
  promptInstall,
  subscribeInstall,
} from '../lib/install';
import { haptic } from '../lib/haptics';
import { Button, IconButton } from '../ui/Button';
import { Sheet, useToast } from '../ui/Overlay';

const DISMISSED_KEY = 'forgeflow_install_dismissed';

export function useInstallState() {
  const canPrompt = useSyncExternalStore(
    subscribeInstall,
    canPromptInstall,
    canPromptInstall,
  );
  return {
    installed: isInstalled(),
    canPrompt,
    browser: detectBrowser(navigator.userAgent),
  };
}

function isPhone() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** The browser's install dialog when it has one, else the menu steps. */
export function InstallSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { canPrompt, browser } = useInstallState();
  const toast = useToast();
  const steps = installSteps(browser);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Instalar o ForgeFlow"
      description="Fica na tela inicial, abre sem a barra do navegador, funciona offline e recebe notificações."
    >
      {canPrompt ? (
        <Button
          size="lg"
          block
          icon={Download}
          onClick={async () => {
            const accepted = await promptInstall();
            onClose();
            if (accepted) {
              haptic('success');
              toast({ tone: 'success', title: 'App instalado' });
            }
          }}
        >
          Instalar agora
        </Button>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="text-footnote grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-ink">
                {index + 1}
              </span>
              <span className="text-body pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}

/** A small card on Home for phones where the app isn't installed yet. */
export function InstallBanner() {
  const { installed, canPrompt } = useInstallState();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  if (installed || dismissed || !(isPhone() || canPrompt)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Shows again next time; harmless.
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
          <Smartphone size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-callout block font-semibold">
            Instale o ForgeFlow
          </span>
          <span className="text-footnote block text-ink-2">
            Na tela inicial e com notificações.
          </span>
        </span>
        <Button size="sm" onClick={() => setOpen(true)}>
          Instalar
        </Button>
        <IconButton
          icon={X}
          label="Dispensar"
          size="sm"
          onClick={dismiss}
          className="-mr-1"
        />
      </div>
      <InstallSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
