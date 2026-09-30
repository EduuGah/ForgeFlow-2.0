import { useState } from 'react';
import {
  ClipboardList,
  Copy,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import type { WorkoutTemplateItem } from '../lib/types';
import { pluralize } from '../lib/format';
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

export function TrainScreen() {
  const { templates, activeWorkout, history } = useAppStore();
  const { push } = useNavigation();
  const launcher = useWorkoutLauncher();

  return (
    <>
      <TabHeader title="Treino" />
      <div className="app-column space-y-6 px-4 pt-2">
        <OfflineNotice />

        {activeWorkout ? (
          <button
            type="button"
            onClick={launcher.resume}
            className="pressable flex h-16 w-full items-center gap-3 rounded-lg bg-brand-soft px-4 text-left text-brand-ink ring-1 ring-brand/40"
          >
            <span
              className="size-2.5 animate-pulse-dot rounded-full bg-success-ink"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="text-body block font-semibold">
                Retomar treino em andamento
              </span>
              <span className="text-footnote block truncate text-ink-2">
                {activeWorkout.name}
              </span>
            </span>
            <Play size={20} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={launcher.startEmpty}
            className="pressable text-body flex h-14 w-full items-center gap-3 rounded-lg bg-surface px-4 font-medium active:bg-raised"
          >
            <Plus size={22} aria-hidden="true" />
            Iniciar treino vazio
          </button>
        )}

        <section aria-labelledby="routines-title">
          <SectionHeader
            title="Rotinas"
            action={
              <IconButton
                icon={Plus}
                label="Nova rotina"
                onClick={() => push({ name: 'routine' })}
              />
            }
          />
          <h2 id="routines-title" className="sr-only">
            Rotinas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              icon={ClipboardList}
              onClick={() => push({ name: 'routine' })}
              className="h-12 justify-start"
            >
              Nova rotina
            </Button>
            <Button
              variant="secondary"
              icon={Search}
              onClick={() => push({ name: 'library' })}
              className="h-12 justify-start"
            >
              Exercícios
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card className="mt-4">
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
            <ul className="mt-4 space-y-3" role="list">
              {templates.map((template, index) => (
                <li
                  key={template.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  <RoutineCard
                    template={template}
                    onStart={() => launcher.startRoutine(template.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Registros">
          <ListGroup className="rounded-lg">
            <ListRow
              icon={History}
              title="Histórico de treinos"
              value={history.length > 0 ? String(history.length) : undefined}
              onClick={() => push({ name: 'history' })}
            />
          </ListGroup>
        </section>
      </div>
    </>
  );
}

function RoutineCard({
  template,
  onStart,
}: {
  template: WorkoutTemplateItem;
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

  const remove = async () => {
    const ok = await confirm({
      title: `Excluir "${template.name}"?`,
      message:
        'A rotina será removida. Treinos já concluídos com ela continuam no histórico.',
      confirmLabel: 'Excluir rotina',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteTemplate(template.id);
    toast({ tone: 'success', title: 'Rotina excluída' });
  };

  return (
    <Card as="div" className="p-4">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => push({ name: 'routine', templateId: template.id })}
          className="min-w-0 flex-1 text-left"
        >
          <h3 className="text-headline font-semibold">{template.name}</h3>
          <p className="text-callout mt-1 line-clamp-2 text-ink-2">
            {template.exercises.length > 0
              ? template.exercises
                  .map((exercise) => exercise.exerciseName)
                  .join(', ')
              : 'Sem exercícios'}
          </p>
          <p className="text-footnote mt-1.5 text-ink-3">
            {pluralize(template.exercises.length, 'exercício', 'exercícios')} ·{' '}
            {pluralize(sets, 'série', 'séries')}
          </p>
        </button>
        <IconButton
          icon={MoreHorizontal}
          label={`Opções de ${template.name}`}
          onClick={() => setMenuOpen(true)}
          className="-mt-2 -mr-2"
        />
      </div>
      <Button
        block
        className="mt-4"
        onClick={onStart}
        disabled={template.exercises.length === 0}
      >
        Começar rotina
      </Button>
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
