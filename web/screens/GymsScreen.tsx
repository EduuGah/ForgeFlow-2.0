import { useMemo, useState } from 'react';
import {
  ChevronRight,
  History,
  MapPin,
  MapPinPlus,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Trash2,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import {
  formatCompact,
  formatDurationMinutes,
  formatNumber,
  formatRelativeDay,
  formatShortDate,
  formatWeight,
  pluralize,
} from '../lib/format';
import { filterByGym, gymStats, summarizeGyms } from '../lib/gyms';
import { useNavigation } from '../navigation/Navigator';
import { NameSheet } from '../features/NameSheet';
import { NewGymSheet } from '../features/GymPicker';
import { WorkoutCard } from '../features/WorkoutCard';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, Medal } from '../ui/Feedback';
import { Card, SectionHeader, StackHeader, Stat } from '../ui/Layout';
import { ActionSheet, useConfirm, useToast } from '../ui/Overlay';

/** Gyms the person trains at, most recently used first. */
export function GymsScreen() {
  const { history, gyms } = useAppStore();
  const { pop, push } = useNavigation();
  const [creating, setCreating] = useState(false);
  const summaries = useMemo(
    () => summarizeGyms(history, gyms),
    [history, gyms],
  );
  const unassigned = useMemo(
    () => filterByGym(history, gyms, 'none').length,
    [history, gyms],
  );

  return (
    <>
      <StackHeader
        title="Academias"
        onBack={pop}
        right={
          <IconButton
            icon={Plus}
            label="Nova academia"
            onClick={() => setCreating(true)}
          />
        }
      />
      <div className="app-column space-y-5 px-4 pt-4">
        {gyms.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nenhuma academia ainda"
            message="Ao concluir um treino, escolha onde treinou. Assim você vê quantas vezes foi a cada academia, o tempo e o volume em cada uma."
            action={
              <Button icon={MapPinPlus} onClick={() => setCreating(true)}>
                Adicionar academia
              </Button>
            }
            className="pt-16"
          />
        ) : (
          <ul
            className="divide-y divide-line rounded-lg border border-line bg-surface"
            role="list"
          >
            {summaries.map(({ gym, workouts, lastAt }) => (
              <li key={gym.id}>
                <button
                  type="button"
                  onClick={() => push({ name: 'gym', gymId: gym.id })}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left active:bg-raised"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
                    <MapPin size={20} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-body block truncate font-semibold">
                      {gym.name}
                    </span>
                    <span className="text-footnote text-ink-2">
                      {pluralize(workouts, 'treino', 'treinos')}
                      {lastAt && ` · último ${formatRelativeDay(lastAt)}`}
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
        )}

        {gyms.length > 0 && unassigned > 0 && (
          <button
            type="button"
            onClick={() => push({ name: 'history', gymFilter: 'none' })}
            className="text-callout flex w-full items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-3 text-left text-ink-2 active:bg-raised"
          >
            <History size={20} className="shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {pluralize(unassigned, 'treino', 'treinos')} sem academia. Abra um
              treino para escolher o local, ou use o menu de uma academia para
              marcar todos de uma vez.
            </span>
          </button>
        )}
      </div>

      <NewGymSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(gymId) => push({ name: 'gym', gymId })}
      />
    </>
  );
}

/** What happened at one gym: totals, frequency, favourites and workouts. */
export function GymDetailScreen({ gymId }: { gymId: string }) {
  const { history, gyms } = useAppStore();
  const { pop, push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const gym = gyms.find((item) => item.id === gymId);
  const stats = useMemo(() => gymStats(history, gymId), [history, gymId]);
  const workouts = useMemo(
    () => history.filter((workout) => workout.gymId === gymId),
    [history, gymId],
  );
  const unassigned = useMemo(
    () => filterByGym(history, gyms, 'none').length,
    [history, gyms],
  );

  if (!gym) {
    return (
      <>
        <StackHeader title="Academia" onBack={pop} />
        <EmptyState
          icon={SearchX}
          title="Academia não encontrada"
          message="Ela pode ter sido excluída em outro aparelho."
          className="pt-20"
        />
      </>
    );
  }

  const assignUnassigned = async () => {
    const ok = await confirm({
      title: `Marcar ${pluralize(unassigned, 'treino', 'treinos')} em ${gym.name}?`,
      message:
        'Os treinos sem academia (por exemplo, importados de outro app) passam a contar para esta academia. Dá para trocar um por um depois.',
      confirmLabel: 'Marcar treinos',
      icon: MapPin,
    });
    if (!ok) return;
    const count = actions.assignGymToUnassigned(gym.id);
    toast({
      tone: 'success',
      title: `${pluralize(count, 'treino marcado', 'treinos marcados')}`,
      description: gym.name,
    });
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir "${gym.name}"?`,
      message:
        stats.workouts > 0
          ? `${pluralize(stats.workouts, 'treino continua', 'treinos continuam')} no diário, sem academia.`
          : 'Nenhum treino está ligado a esta academia.',
      confirmLabel: 'Excluir academia',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteGym(gym.id);
    toast({ tone: 'success', title: 'Academia excluída' });
    pop();
  };

  return (
    <>
      <StackHeader
        title={gym.name}
        onBack={pop}
        right={
          <IconButton
            icon={MoreHorizontal}
            label={`Opções de ${gym.name}`}
            onClick={() => setMenuOpen(true)}
          />
        }
      />
      <div className="app-column space-y-6 px-4 pt-5">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink">
            <MapPin size={26} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-title font-bold">{gym.name}</h2>
            <p className="text-callout text-ink-2">
              {stats.firstAt && stats.lastAt
                ? `Desde ${formatShortDate(stats.firstAt)} · último treino ${formatRelativeDay(stats.lastAt)}`
                : 'Nenhum treino aqui ainda'}
            </p>
          </div>
        </div>

        {stats.workouts === 0 ? (
          <Card>
            <EmptyState
              icon={History}
              title="Nenhum treino nesta academia"
              message="Escolha esta academia no resumo ao concluir um treino, ou no detalhe de um treino do diário."
              action={
                unassigned > 0 ? (
                  <Button variant="tinted" onClick={assignUnassigned}>
                    Marcar {pluralize(unassigned, 'treino', 'treinos')} sem
                    academia
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <>
            <Card className="grid grid-cols-2 gap-x-4 gap-y-5 p-4">
              <Stat label="Treinos" value={formatNumber(stats.workouts, 0)} />
              <Stat
                label="Tempo total"
                value={formatDurationMinutes(stats.totalMinutes)}
              />
              <Stat
                label="Volume"
                value={formatCompact(stats.totalVolumeKg)}
                unit="kg"
              />
              <Stat
                label="Recordes"
                value={formatNumber(stats.records, 0)}
                icon={
                  stats.records > 0 ? (
                    <Medal size={18} className="self-center" />
                  ) : undefined
                }
              />
              <p className="text-callout col-span-2 -mt-1 rounded-md bg-raised px-3 py-2.5">
                <span className="font-semibold tabular">
                  {formatNumber(stats.perWeek)}{' '}
                  {stats.perWeek === 1 ? 'treino' : 'treinos'} por semana
                </span>{' '}
                <span className="text-ink-2">nas últimas 8 semanas</span>
              </p>
            </Card>

            {stats.topExercises.length > 0 && (
              <section aria-labelledby="gym-exercises">
                <SectionHeader
                  id="gym-exercises"
                  title="Exercícios mais feitos"
                />
                <ul
                  className="divide-y divide-line rounded-lg border border-line bg-surface"
                  role="list"
                >
                  {stats.topExercises.map((entry, index) => {
                    const catalog = entry.exerciseId
                      ? findExercise(entry.exerciseId)
                      : undefined;
                    return (
                      <li key={entry.key}>
                        <button
                          type="button"
                          disabled={!catalog}
                          onClick={() =>
                            catalog &&
                            push({ name: 'exercise', exerciseId: catalog.id })
                          }
                          className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised disabled:active:bg-transparent"
                        >
                          <span className="text-callout w-5 shrink-0 font-bold text-ink-3 tabular">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="text-body block truncate font-medium">
                              {entry.name}
                            </span>
                            <span className="text-footnote text-ink-2 tabular">
                              {pluralize(entry.sets, 'série', 'séries')}
                              {entry.bestWeightKg > 0 &&
                                ` · melhor ${formatWeight(entry.bestWeightKg)} kg`}
                            </span>
                          </span>
                          {catalog && (
                            <ChevronRight
                              size={18}
                              className="text-ink-3"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {stats.topRoutines.length > 0 && (
              <section aria-labelledby="gym-routines">
                <SectionHeader id="gym-routines" title="Treinos mais feitos" />
                <ul
                  className="divide-y divide-line rounded-lg border border-line bg-surface"
                  role="list"
                >
                  {stats.topRoutines.map((routine) => (
                    <li
                      key={routine.name}
                      className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="text-body truncate">{routine.name}</span>
                      <span className="text-footnote shrink-0 text-ink-2 tabular">
                        {pluralize(routine.count, 'vez', 'vezes')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="gym-workouts">
              <SectionHeader
                id="gym-workouts"
                title="Treinos recentes"
                action={
                  workouts.length > 5 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        push({ name: 'history', gymFilter: gym.id })
                      }
                    >
                      Ver todos
                    </Button>
                  ) : undefined
                }
              />
              <ul className="space-y-2" role="list">
                {workouts.slice(0, 5).map((workout) => (
                  <li key={workout.id}>
                    <WorkoutCard
                      workout={workout}
                      onOpen={() =>
                        push({ name: 'workout', workoutId: workout.id })
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={gym.name}
        actions={[
          {
            label: 'Renomear academia',
            icon: Pencil,
            onSelect: () => setRenaming(true),
          },
          ...(unassigned > 0
            ? [
                {
                  label: 'Marcar treinos sem academia aqui',
                  description: pluralize(unassigned, 'treino', 'treinos'),
                  icon: MapPin,
                  onSelect: assignUnassigned,
                },
              ]
            : []),
          {
            label: 'Excluir academia',
            icon: Trash2,
            tone: 'danger',
            onSelect: remove,
          },
        ]}
      />
      <NameSheet
        open={renaming}
        onClose={() => setRenaming(false)}
        onSave={(name) => {
          actions.renameGym(gym.id, name);
          toast({ tone: 'success', title: 'Academia renomeada' });
        }}
        title="Renomear academia"
        label="Nome da academia"
        initial={gym.name}
        saveLabel="Salvar nome"
      />
    </>
  );
}
