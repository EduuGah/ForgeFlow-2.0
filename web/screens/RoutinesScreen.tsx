import { useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  Copy,
  FileUp,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import type { WorkoutTemplateItem } from '../lib/types';
import { formatRelativeDay, pluralize } from '../lib/format';
import { muscleCode } from '../lib/training';
import { useNavigation } from '../navigation/Navigator';
import { useWorkoutLauncher } from '../features/useWorkoutLauncher';
import { OfflineNotice } from '../features/StatusBits';
import { Button, IconButton } from '../ui/Button';
import { EmptyState } from '../ui/Feedback';
import {
  Card,
  ListGroup,
  ListRow,
  SectionHeader,
  TabHeader,
} from '../ui/Layout';
import { ActionSheet, useConfirm, useToast } from '../ui/Overlay';

export function RoutinesScreen() {
  const { templates, activeWorkout, history } = useAppStore();
  const { push } = useNavigation();
  const launcher = useWorkoutLauncher();

  return (
    <>
      <TabHeader
        title="Rotinas"
        actions={
          <IconButton
            icon={Plus}
            label="Nova rotina"
            onClick={() => push({ name: 'routine' })}
          />
        }
      />
      <div className="app-column space-y-6 px-4 pt-2">
        <OfflineNotice />

        {activeWorkout ? (
          <button
            type="button"
            onClick={launcher.resume}
            className="ember-edge pressable flex w-full items-center gap-3 rounded-lg bg-surface p-4 text-left"
          >
            <span
              className="size-2.5 animate-pulse-dot rounded-full bg-brand"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="text-body block font-semibold">
                Treino em andamento
              </span>
              <span className="text-footnote block truncate text-ink-2">
                {activeWorkout.name}
              </span>
            </span>
            <ArrowRight
              size={20}
              className="text-brand-ink"
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <QuickTile
              icon={Zap}
              title="Treino livre"
              subtitle="Monte na hora"
              onClick={launcher.startEmpty}
              accent
            />
            <QuickTile
              icon={Search}
              title="Exercícios"
              subtitle="Biblioteca"
              onClick={() => push({ name: 'library' })}
            />
          </div>
        )}

        <section aria-labelledby="routines-title">
          <SectionHeader
            title={`Suas rotinas (${templates.length})`}
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={Plus}
                onClick={() => push({ name: 'routine' })}
              >
                Nova
              </Button>
            }
          />
          <h2 id="routines-title" className="sr-only">
            Suas rotinas
          </h2>

          {templates.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma rotina ainda"
                message="Monte uma rotina com seus exercícios, séries e cargas para começar o treino com um toque."
                action={
                  <Button icon={Plus} onClick={() => push({ name: 'routine' })}>
                    Criar rotina
                  </Button>
                }
              />
            </Card>
          ) : (
            <ul className="space-y-3" role="list">
              {templates.map((template, index) => (
                <li
                  key={template.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <RoutineCard
                    template={template}
                    lastDoneAt={
                      history.find(
                        (workout) =>
                          workout.templateId === template.id ||
                          workout.name === template.name,
                      )?.completedAt
                    }
                    onStart={() => launcher.startRoutine(template.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <ListGroup className="mx-0">
          <ListRow
            icon={History}
            title="Diário de treinos"
            value={history.length > 0 ? String(history.length) : undefined}
            onClick={() => push({ name: 'history' })}
          />
          <ListRow
            icon={FileUp}
            title="Importar histórico"
            subtitle="Arquivo CSV exportado de outro app"
            onClick={() => push({ name: 'import' })}
          />
        </ListGroup>
      </div>
    </>
  );
}

function QuickTile({
  icon: Icon,
  title,
  subtitle,
  onClick,
  accent = false,
}: {
  icon: typeof Zap;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        accent
          ? 'pressable flex flex-col items-start gap-3 rounded-lg bg-brand p-4 text-left text-on-brand'
          : 'pressable flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-4 text-left active:bg-raised'
      }
    >
      <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
      <span>
        <span className="text-body block font-semibold">{title}</span>
        <span
          className={
            accent
              ? 'text-footnote block opacity-80'
              : 'text-footnote block text-ink-2'
          }
        >
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function RoutineCard({
  template,
  lastDoneAt,
  onStart,
}: {
  template: WorkoutTemplateItem;
  lastDoneAt?: string;
  onStart: () => void;
}) {
  const { push } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const sets = template.exercises.reduce(
    (total, exercise) => total + exercise.targetSets,
    0,
  );
  const muscles = [
    ...new Set(
      template.exercises
        .map(
          (exercise) => findExercise(exercise.exerciseId)?.primaryMuscleGroup,
        )
        .filter((group): group is string => Boolean(group)),
    ),
  ];

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir "${template.name}"?`,
      message:
        'A rotina será removida. Treinos já concluídos com ela continuam no diário.',
      confirmLabel: 'Excluir rotina',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteTemplate(template.id);
    toast({ tone: 'success', title: 'Rotina excluída' });
  };

  return (
    <Card as="div" className="overflow-hidden">
      <button
        type="button"
        onClick={() => push({ name: 'routine', templateId: template.id })}
        className="block w-full p-4 pb-3 text-left active:bg-raised"
      >
        <span className="flex items-start justify-between gap-2">
          <span className="text-headline font-semibold">{template.name}</span>
          <span className="text-caption shrink-0 pt-1 text-ink-3">
            {lastDoneAt ? formatRelativeDay(lastDoneAt) : 'Nova'}
          </span>
        </span>
        <span className="text-callout mt-1 line-clamp-2 block text-ink-2">
          {template.exercises.length > 0
            ? template.exercises
                .map((exercise) => exercise.exerciseName)
                .join(' · ')
            : 'Sem exercícios'}
        </span>
      </button>
      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        <div
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
          aria-label="Grupos musculares"
        >
          {muscles.slice(0, 4).map((group) => (
            <span
              key={group}
              className="text-micro rounded-sm bg-raised px-1.5 py-0.5 font-semibold text-ink-2"
            >
              {muscleCode(group)}
            </span>
          ))}
          <span className="text-caption text-ink-3">
            {pluralize(sets, 'série', 'séries')}
          </span>
        </div>
        <IconButton
          icon={MoreHorizontal}
          label={`Opções de ${template.name}`}
          size="sm"
          onClick={() => setMenuOpen(true)}
        />
        <Button
          size="sm"
          icon={Play}
          onClick={onStart}
          disabled={template.exercises.length === 0}
        >
          Iniciar
        </Button>
      </div>
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={template.name}
        actions={[
          {
            label: 'Editar rotina',
            icon: Pencil,
            onSelect: () => push({ name: 'routine', templateId: template.id }),
          },
          {
            label: 'Duplicar rotina',
            icon: Copy,
            onSelect: () => {
              actions.duplicateTemplate(template.id);
              toast({ tone: 'success', title: 'Rotina duplicada' });
            },
          },
          {
            label: 'Excluir rotina',
            icon: Trash2,
            tone: 'danger',
            onSelect: remove,
          },
        ]}
      />
    </Card>
  );
}
