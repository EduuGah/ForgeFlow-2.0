import { useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  CloudCog,
  Download,
  Droplet,
  FileText,
  FileUp,
  Info,
  LogOut,
  UserRound,
  Utensils,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import {
  formatNumber,
  formatRelativeDay,
  formatTime,
  formatWeight,
} from '../lib/format';
import { RECORD_LABELS } from '../lib/training';
import type { NotificationPrefs } from '../lib/types';
import { tutorial } from '../lib/tutorial';
import { useTheme, type ThemePreference } from '../lib/theme';
import { useNavigation } from '../navigation/Navigator';
import { GoogleButton, useGoogleSignIn } from '../features/GoogleSignIn';
import { Button } from '../ui/Button';
import { Medal } from '../ui/Feedback';
import { NumberField, Switch } from '../ui/Form';
import { GroupLabel, ListGroup, ListRow, StackHeader } from '../ui/Layout';
import { Sheet, useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

const NOTIFICATION_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: 'restTimerAlerts',
    label: 'Fim do descanso',
    description: 'Vibração e aviso quando o descanso termina',
  },
  {
    key: 'workoutReminders',
    label: 'Lembretes de treino',
    description: 'Aviso nos dias em que você costuma treinar',
  },
  {
    key: 'hydrationAlerts',
    label: 'Hidratação',
    description: 'Lembretes para beber água ao longo do dia',
  },
  {
    key: 'weeklyReport',
    label: 'Resumo semanal',
    description: 'Volume, frequência e recordes da semana',
  },
];

export function SettingsScreen() {
  const store = useAppStore();
  const {
    currentUser,
    hydrationTargetMl,
    nutritionTargetKcal,
    syncStatus,
    lastSyncedAt,
  } = store;
  const { pop, push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [sheet, setSheet] = useState<
    'notifications' | 'hydration' | 'nutrition' | 'report' | null
  >(null);
  const { signIn, signingIn } = useGoogleSignIn(() =>
    toast({ tone: 'success', title: 'Conta conectada' }),
  );

  const signOut = async () => {
    const ok = await confirm({
      title: 'Sair da conta?',
      message:
        'Seus dados continuam salvos na nuvem e voltam quando você entrar de novo.',
      confirmLabel: 'Sair',
      tone: 'danger',
      icon: LogOut,
    });
    if (!ok) return;
    try {
      await actions.logout();
    } catch {
      toast({
        tone: 'error',
        title: 'Não foi possível sair. Tente novamente.',
      });
    }
  };

  const exportBackup = () => {
    const data = {
      profile: store.userProfile,
      history: store.history,
      templates: store.templates,
      prs: store.prs,
      goals: store.goals,
      hydrationLogs: store.hydrationLogs,
      meals: store.meals,
      customExercises: store.customExercises,
      exportedAt: new Date().toISOString(),
      version: 'ForgeFlow-2.0-web',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forgeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({
      tone: 'success',
      title: 'Backup baixado',
      description: link.download,
    });
  };

  const syncLabel = !currentUser
    ? 'Desativada'
    : syncStatus === 'syncing'
      ? 'Sincronizando…'
      : syncStatus === 'error'
        ? 'Falhou'
        : lastSyncedAt
          ? `${formatRelativeDay(lastSyncedAt)}, ${formatTime(lastSyncedAt)}`
          : 'Pendente';

  return (
    <>
      <StackHeader title="Configurações" onBack={pop} />
      <div className="app-column pb-6">
        <GroupLabel>Aparência</GroupLabel>
        <ThemePicker />

        <GroupLabel>Conta</GroupLabel>
        {!currentUser && (
          <div className="mx-4 mb-3 rounded-lg border border-line bg-surface p-4">
            <p className="text-callout mb-3 text-ink-2">
              Entre para sincronizar seus treinos entre aparelhos e manter um
              backup na nuvem.
            </p>
            <GoogleButton onClick={signIn} loading={signingIn} />
          </div>
        )}
        <ListGroup>
          <ListRow
            icon={UserRound}
            title="Editar perfil"
            onClick={() => push({ name: 'editProfile' })}
          />
          {currentUser && (
            <ListRow
              icon={CloudCog}
              title="Sincronização"
              subtitle={currentUser.email ?? undefined}
              value={syncLabel}
              onClick={actions.retrySync}
            />
          )}
        </ListGroup>

        <GroupLabel>Preferências</GroupLabel>
        <ListGroup>
          <ListRow
            icon={Bell}
            title="Notificações"
            onClick={() => setSheet('notifications')}
          />
          <ListRow
            icon={Droplet}
            title="Meta de água"
            value={`${formatNumber(hydrationTargetMl / 1000)} L`}
            onClick={() => setSheet('hydration')}
          />
          <ListRow
            icon={Utensils}
            title="Metas de nutrição"
            value={`${formatNumber(nutritionTargetKcal, 0)} kcal`}
            onClick={() => setSheet('nutrition')}
          />
        </ListGroup>

        <GroupLabel>Seus dados</GroupLabel>
        <ListGroup>
          <ListRow
            icon={FileUp}
            title="Importar histórico (CSV)"
            subtitle="Traga treinos exportados de outro app"
            onClick={() => push({ name: 'import' })}
          />
          <ListRow
            icon={FileText}
            title="Relatório consolidado"
            onClick={() => setSheet('report')}
          />
          <ListRow
            icon={Download}
            title="Exportar backup (JSON)"
            subtitle="Treinos, rotinas, recordes, metas e diário"
            onClick={exportBackup}
          />
        </ListGroup>

        <GroupLabel>Sobre</GroupLabel>
        <ListGroup>
          <ListRow
            icon={BookOpen}
            title="Ver tutorial"
            onClick={tutorial.show}
          />
          <ListRow icon={Info} title="ForgeFlow" value="2.0" />
        </ListGroup>

        {currentUser && (
          <div className="mt-8 px-4">
            <Button variant="danger-ghost" size="lg" block onClick={signOut}>
              Sair
            </Button>
          </div>
        )}
      </div>

      <NotificationsSheet
        open={sheet === 'notifications'}
        onClose={() => setSheet(null)}
      />
      <HydrationTargetSheet
        open={sheet === 'hydration'}
        onClose={() => setSheet(null)}
      />
      <NutritionTargetSheet
        open={sheet === 'nutrition'}
        onClose={() => setSheet(null)}
      />
      <ReportSheet
        open={sheet === 'report'}
        onClose={() => setSheet(null)}
        onExport={exportBackup}
      />
    </>
  );
}

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

/** Three miniature screens; the selected one gets the ember outline. */
function ThemePicker() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema do app"
      className="mx-4 grid grid-cols-3 gap-3"
    >
      {THEMES.map((theme) => {
        const selected = preference === theme.value;
        return (
          <button
            key={theme.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(theme.value)}
            className={cx(
              'pressable flex flex-col items-center gap-2 rounded-lg border bg-surface p-2.5 pb-3 transition-colors',
              selected ? 'border-brand ring-1 ring-brand' : 'border-line',
            )}
          >
            <ThemePreview theme={theme.value} />
            <span className="text-callout flex items-center gap-1 font-semibold">
              {selected && (
                <Check
                  size={14}
                  strokeWidth={3}
                  className="text-brand-ink"
                  aria-hidden="true"
                />
              )}
              {theme.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ThemePreview({ theme }: { theme: ThemePreference }) {
  const half = (mode: 'light' | 'dark') => {
    const dark = mode === 'dark';
    return (
      <span
        className="flex h-full flex-1 flex-col gap-1 p-1.5"
        style={{ background: dark ? '#0d0f12' : '#f3f4f6' }}
      >
        <span
          className="h-1.5 w-2/3 rounded-full"
          style={{ background: dark ? '#f2f4f7' : '#12151a', opacity: 0.8 }}
        />
        <span
          className="flex-1 rounded-sm"
          style={{ background: dark ? '#1f232a' : '#ffffff' }}
        />
        <span
          className="h-2 w-1/2 rounded-sm"
          style={{ background: '#ff7a1a' }}
        />
      </span>
    );
  };
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-full overflow-hidden rounded-md border border-line"
    >
      {theme === 'system' ? (
        <>
          {half('light')}
          {half('dark')}
        </>
      ) : (
        half(theme)
      )}
    </span>
  );
}

function NotificationsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { notificationPrefs } = useAppStore();
  return (
    <Sheet open={open} onClose={onClose} title="Notificações">
      <ul className="divide-y divide-line" role="list">
        {NOTIFICATION_ROWS.map((row) => (
          <li key={row.key} className="flex items-center gap-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-body">{row.label}</p>
              <p className="text-footnote text-ink-2">{row.description}</p>
            </div>
            <Switch
              label={row.label}
              checked={notificationPrefs[row.key]}
              onChange={(checked) =>
                actions.updateNotificationPrefs({ [row.key]: checked })
              }
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function HydrationTargetSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { hydrationTargetMl } = useAppStore();
  const toast = useToast();
  const [value, setValue] = useState(hydrationTargetMl);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setValue(hydrationTargetMl);
  }
  const valid = value >= 500 && value <= 10000;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Meta diária de água"
      description="Uma referência comum é 35 ml por kg de peso corporal."
      footer={
        <Button
          size="lg"
          block
          disabled={!valid}
          onClick={() => {
            actions.setHydrationTarget(value);
            toast({ tone: 'success', title: 'Meta de água atualizada' });
            onClose();
          }}
        >
          Salvar meta
        </Button>
      }
    >
      <NumberField
        label="Meta"
        suffix="ml"
        value={value}
        max={10000}
        onValueChange={setValue}
        hint={valid ? undefined : 'Informe entre 500 e 10.000 ml.'}
      />
    </Sheet>
  );
}

export function NutritionTargetSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const store = useAppStore();
  const toast = useToast();
  const [targets, setTargets] = useState({
    kcal: store.nutritionTargetKcal,
    protein: store.nutritionTargetProtein,
    carbs: store.nutritionTargetCarbs,
    fat: store.nutritionTargetFat,
  });
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setTargets({
        kcal: store.nutritionTargetKcal,
        protein: store.nutritionTargetProtein,
        carbs: store.nutritionTargetCarbs,
        fat: store.nutritionTargetFat,
      });
    }
  }
  const macroKcal = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
  const valid = targets.kcal >= 800;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Metas de nutrição"
      footer={
        <Button
          size="lg"
          block
          disabled={!valid}
          onClick={() => {
            actions.setNutritionTargets(targets);
            toast({ tone: 'success', title: 'Metas de nutrição atualizadas' });
            onClose();
          }}
        >
          Salvar metas
        </Button>
      }
    >
      <div className="space-y-4">
        <NumberField
          label="Calorias"
          suffix="kcal"
          value={targets.kcal}
          max={10000}
          onValueChange={(kcal) => setTargets((t) => ({ ...t, kcal }))}
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Proteína"
            suffix="g"
            value={targets.protein}
            max={1000}
            onValueChange={(protein) => setTargets((t) => ({ ...t, protein }))}
          />
          <NumberField
            label="Carbos"
            suffix="g"
            value={targets.carbs}
            max={1500}
            onValueChange={(carbs) => setTargets((t) => ({ ...t, carbs }))}
          />
          <NumberField
            label="Gordura"
            suffix="g"
            value={targets.fat}
            max={500}
            onValueChange={(fat) => setTargets((t) => ({ ...t, fat }))}
          />
        </div>
        <p className="text-footnote text-ink-3">
          Os macros somam {formatNumber(macroKcal, 0)} kcal (
          {formatNumber(targets.kcal - macroKcal, 0)} kcal de diferença da
          meta).
        </p>
      </div>
    </Sheet>
  );
}

function ReportSheet({
  open,
  onClose,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
}) {
  const { history, prs, goals, userProfile } = useAppStore();
  const volume = history.reduce(
    (total, workout) => total + workout.totalVolumeKg,
    0,
  );
  const minutes = history.reduce(
    (total, workout) => total + workout.durationMinutes,
    0,
  );
  const rows = [
    { label: 'Treinos concluídos', value: formatNumber(history.length, 0) },
    {
      label: 'Tempo total treinando',
      value: `${formatNumber(minutes / 60)} h`,
    },
    { label: 'Volume total', value: `${formatWeight(volume)} kg` },
    { label: 'Recordes pessoais', value: formatNumber(prs.length, 0) },
    {
      label: 'Metas em andamento',
      value: formatNumber(
        goals.filter((goal) => goal.status === 'active').length,
        0,
      ),
    },
    {
      label: 'Metas concluídas',
      value: formatNumber(
        goals.filter((goal) => goal.status === 'completed').length,
        0,
      ),
    },
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Relatório consolidado"
      description={userProfile.name}
      footer={
        <Button
          size="lg"
          variant="secondary"
          block
          icon={Download}
          onClick={onExport}
        >
          Baixar backup completo
        </Button>
      }
    >
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 py-3"
          >
            <dt className="text-body text-ink-2">{row.label}</dt>
            <dd className="text-headline font-semibold tabular">{row.value}</dd>
          </div>
        ))}
      </dl>
      {prs.length > 0 && (
        <>
          <h3 className="text-headline mt-5 mb-2 font-semibold">Recordes</h3>
          <ul className="divide-y divide-line" role="list">
            {prs.map((record) => (
              <li key={record.id} className="flex items-center gap-3 py-2.5">
                <Medal size={18} />
                <span className="min-w-0 flex-1">
                  <span className="text-callout block truncate">
                    {record.exerciseName}
                  </span>
                  <span className="text-caption text-ink-3">
                    {RECORD_LABELS[record.type]}
                  </span>
                </span>
                <span className="text-callout font-semibold tabular">
                  {formatWeight(record.value)} kg
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
