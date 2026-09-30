import { useState } from 'react';
import {
  Bell,
  CloudCog,
  Download,
  Droplet,
  FileText,
  Info,
  LogIn,
  LogOut,
  UserRound,
  Utensils,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import { describeLoginError, isLoginDismissed } from '../firebase';
import {
  formatNumber,
  formatRelativeDay,
  formatTime,
  formatWeight,
} from '../lib/format';
import { RECORD_LABELS } from '../lib/training';
import type { NotificationPrefs } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { Button } from '../ui/Button';
import { Medal } from '../ui/Feedback';
import { NumberField, Switch } from '../ui/Form';
import { GroupLabel, ListGroup, ListRow, StackHeader } from '../ui/Layout';
import { Sheet, useConfirm, useToast } from '../ui/Overlay';

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
  const [signingIn, setSigningIn] = useState(false);

  const signIn = async () => {
    setSigningIn(true);
    try {
      await actions.login();
      toast({ tone: 'success', title: 'Conta conectada' });
    } catch (error) {
      if (!isLoginDismissed(error))
        toast({ tone: 'error', title: describeLoginError(error) });
    } finally {
      setSigningIn(false);
    }
  };

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
        <GroupLabel>Conta</GroupLabel>
        <ListGroup>
          <ListRow
            icon={UserRound}
            title="Editar perfil"
            onClick={() => push({ name: 'editProfile' })}
          />
          {currentUser ? (
            <ListRow
              icon={CloudCog}
              title="Sincronização"
              subtitle={currentUser.email ?? undefined}
              value={syncLabel}
              onClick={actions.retrySync}
            />
          ) : (
            <ListRow
              icon={LogIn}
              title={signingIn ? 'Entrando…' : 'Entrar com Google'}
              subtitle="Sincronize seus treinos entre aparelhos"
              tone="brand"
              onClick={signIn}
              disabled={signingIn}
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
