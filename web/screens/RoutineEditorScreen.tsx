import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  MoreVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { actions, findExercise, useAppStore } from '../store';
import type { TemplateExercise } from '../lib/types';
import { formatRestLabel } from '../lib/format';
import { sortFolders } from '../lib/folders';
import { useNavigation } from '../navigation/Navigator';
import { ExercisePicker } from '../features/ExercisePicker';
import { Button, IconButton } from '../ui/Button';
import { EmptyState, ExerciseThumb } from '../ui/Feedback';
import {
  NumberField,
  SelectField,
  Stepper,
  TextAreaField,
  TextField,
} from '../ui/Form';
import { Card, SectionHeader, StackHeader } from '../ui/Layout';
import { ActionSheet, useConfirm, useToast } from '../ui/Overlay';
import { cx, useBackGuard } from '../ui/core';
import { uid } from '../lib/id';
import {
  DragHandle,
  SortableList,
  arrayMove,
  type DragHandleProps,
} from '../ui/Sortable';

const REST_CHOICES = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export function RoutineEditorScreen({
  templateId,
  folderId: initialFolderId,
}: {
  templateId?: string;
  /** Folder for a new routine created from inside a folder. */
  folderId?: string;
}) {
  const { templates, folders } = useAppStore();
  const existing = templateId
    ? templates.find((template) => template.id === templateId)
    : undefined;
  const { pop } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const originalFolder = existing ? (existing.folderId ?? '') : '';
  const [folderId, setFolderId] = useState(
    existing ? originalFolder : (initialFolderId ?? ''),
  );
  // Rows carry a local key so they keep their identity while dragged.
  const [rows, setRows] = useState(() =>
    (existing?.exercises ?? []).map((item) => ({ key: uid('row'), item })),
  );
  const items = rows.map((row) => row.item);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dirty =
    name !== (existing?.name ?? '') ||
    description !== (existing?.description ?? '') ||
    folderId !== originalFolder ||
    JSON.stringify(items) !== JSON.stringify(existing?.exercises ?? []);

  const confirmLeave = () =>
    confirm({
      title: 'Descartar alterações?',
      message: 'As mudanças nesta rotina ainda não foram salvas.',
      confirmLabel: 'Descartar',
      cancelLabel: 'Continuar editando',
      tone: 'danger',
    });

  useBackGuard(dirty, async (rearm) => {
    if (await confirmLeave()) pop();
    else rearm();
  });

  const leave = async () => {
    if (!dirty || (await confirmLeave())) pop();
  };

  const nameError =
    submitted && !name.trim() ? 'Dê um nome à rotina.' : undefined;

  const save = () => {
    setSubmitted(true);
    const trimmed = name.trim();
    if (!trimmed) return;
    if (items.length === 0) {
      toast({ tone: 'error', title: 'Adicione ao menos um exercício' });
      return;
    }
    const payload = {
      name: trimmed,
      description: description.trim(),
      exercises: items,
      folderId: folders.some((folder) => folder.id === folderId)
        ? folderId
        : undefined,
    };
    if (existing) actions.updateTemplate(existing.id, payload);
    else actions.createTemplate(payload);
    toast({
      tone: 'success',
      title: existing ? 'Rotina atualizada' : 'Rotina criada',
      description: trimmed,
    });
    pop();
  };

  const update = (index: number, patch: Partial<TemplateExercise>) =>
    setRows((current) =>
      current.map((row, i) =>
        i === index ? { ...row, item: { ...row.item, ...patch } } : row,
      ),
    );

  const moveTo = (from: number, to: number) =>
    setRows((current) =>
      to < 0 || to >= current.length ? current : arrayMove(current, from, to),
    );

  const removeRoutine = async () => {
    if (!existing) return;
    const ok = await confirm({
      title: `Excluir "${existing.name}"?`,
      message: 'Treinos já concluídos com esta rotina continuam no histórico.',
      confirmLabel: 'Excluir rotina',
      tone: 'danger',
      icon: Trash2,
    });
    if (!ok) return;
    actions.deleteTemplate(existing.id);
    toast({ tone: 'success', title: 'Rotina excluída' });
    pop();
  };

  return (
    <>
      <StackHeader
        title={existing ? 'Editar rotina' : 'Nova rotina'}
        onBack={leave}
        right={
          <Button size="sm" onClick={save}>
            Salvar
          </Button>
        }
      />
      <form
        className="app-column space-y-5 px-4 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label="Nome da rotina"
          value={name}
          maxLength={120}
          placeholder="Ex.: Upper A"
          onChange={(event) => setName(event.target.value)}
          error={nameError}
        />
        <TextAreaField
          label="Descrição (opcional)"
          value={description}
          rows={2}
          maxLength={500}
          placeholder="Foco, observações, ordem dos dias…"
          onChange={(event) => setDescription(event.target.value)}
        />
        {folders.length > 0 && (
          <SelectField
            label="Pasta"
            value={folderId}
            onChange={setFolderId}
            options={[
              { value: '', label: 'Sem pasta' },
              ...sortFolders(folders).map((folder) => ({
                value: folder.id,
                label: folder.name,
              })),
            ]}
          />
        )}

        <section aria-labelledby="routine-exercises">
          <SectionHeader
            id="routine-exercises"
            title={`Exercícios (${items.length})`}
          />
          {items.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardList}
                title="Nenhum exercício"
                message="Adicione os exercícios na ordem em que você costuma fazê-los."
              />
            </Card>
          ) : (
            <SortableList
              label="Exercícios da rotina"
              ids={rows.map((row) => row.key)}
              nameOf={(key) =>
                rows.find((row) => row.key === key)?.item.exerciseName ?? ''
              }
              onMove={moveTo}
              className="space-y-3"
              renderOverlay={(key) => {
                const row = rows.find((candidate) => candidate.key === key);
                return row ? <RoutineExercisePreview item={row.item} /> : null;
              }}
            >
              {(key, index, { handle, sorting }) => (
                <RoutineExerciseCard
                  item={rows[index].item}
                  index={index}
                  total={rows.length}
                  handle={handle}
                  compact={sorting}
                  onChange={(patch) => update(index, patch)}
                  onMove={(direction) => moveTo(index, index + direction)}
                  onRemove={() =>
                    setRows((current) =>
                      current.filter((row) => row.key !== key),
                    )
                  }
                />
              )}
            </SortableList>
          )}
          <Button
            variant="secondary"
            size="lg"
            block
            icon={Plus}
            className="mt-3"
            onClick={() => setPickerOpen(true)}
          >
            Adicionar exercício
          </Button>
        </section>

        {existing && (
          <Button
            variant="danger-ghost"
            block
            icon={Trash2}
            onClick={removeRoutine}
          >
            Excluir rotina
          </Button>
        )}
      </form>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={(exercises) =>
          setRows((current) => [
            ...current,
            ...exercises.map((exercise) => ({
              key: uid('row'),
              item: {
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                targetSets: 3,
                targetReps: 10,
                targetWeightKg: 0,
                restSeconds: 90,
              },
            })),
          ])
        }
      />
    </>
  );
}

/** Compact copy of a routine exercise that follows the finger while dragged. */
function RoutineExercisePreview({ item }: { item: TemplateExercise }) {
  const muscle = findExercise(item.exerciseId)?.primaryMuscleGroup;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface p-3">
      <ExerciseThumb muscle={muscle} exerciseId={item.exerciseId} size={40} />
      <p className="text-headline min-w-0 flex-1 truncate font-semibold">
        {item.exerciseName}
      </p>
      <span className="text-footnote text-ink-2 tabular">
        {item.targetSets} × {item.targetReps}
      </span>
    </div>
  );
}

function RoutineExerciseCard({
  item,
  index,
  total,
  handle,
  compact,
  onChange,
  onMove,
  onRemove,
}: {
  item: TemplateExercise;
  index: number;
  total: number;
  handle: DragHandleProps;
  /** Folded to its header while the list is being reordered. */
  compact: boolean;
  onChange: (patch: Partial<TemplateExercise>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const muscle = findExercise(item.exerciseId)?.primaryMuscleGroup;

  return (
    <div className={cx('rounded-lg bg-surface', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-center gap-2">
        <DragHandle
          handle={handle}
          label={`Arrastar ${item.exerciseName} para reordenar`}
          className="-ml-2"
        />
        <ExerciseThumb muscle={muscle} exerciseId={item.exerciseId} size={40} />
        <p className="text-headline ml-1 min-w-0 flex-1 truncate font-semibold">
          {item.exerciseName}
        </p>
        {compact ? (
          <span className="text-footnote text-ink-2 tabular">
            {item.targetSets} × {item.targetReps}
          </span>
        ) : (
          <IconButton
            icon={MoreVertical}
            label={`Opções de ${item.exerciseName}`}
            onClick={() => setMenuOpen(true)}
            className="-mr-2"
          />
        )}
      </div>
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stepper
            label="Séries"
            value={item.targetSets}
            min={1}
            max={20}
            onChange={(targetSets) => onChange({ targetSets })}
          />
          <Stepper
            label="Repetições"
            value={item.targetReps}
            min={1}
            max={100}
            onChange={(targetReps) => onChange({ targetReps })}
          />
          <NumberField
            label="Carga"
            suffix="kg"
            decimal
            zeroAsEmpty
            placeholder="0"
            max={2000}
            value={item.targetWeightKg ?? 0}
            onValueChange={(targetWeightKg) => onChange({ targetWeightKg })}
          />
          <SelectField
            label="Descanso"
            value={String(item.restSeconds)}
            onChange={(value) => onChange({ restSeconds: Number(value) })}
            options={REST_CHOICES.map((seconds) => ({
              value: String(seconds),
              label: formatRestLabel(seconds),
            }))}
          />
        </div>
      )}
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={item.exerciseName}
        actions={[
          ...(index > 0
            ? [
                {
                  label: 'Mover para cima',
                  icon: ArrowUp,
                  onSelect: () => onMove(-1),
                },
              ]
            : []),
          ...(index < total - 1
            ? [
                {
                  label: 'Mover para baixo',
                  icon: ArrowDown,
                  onSelect: () => onMove(1),
                },
              ]
            : []),
          {
            label: 'Remover da rotina',
            icon: Trash2,
            tone: 'danger' as const,
            onSelect: onRemove,
          },
        ]}
      />
    </div>
  );
}
