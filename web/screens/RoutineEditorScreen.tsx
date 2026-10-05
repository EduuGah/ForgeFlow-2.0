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
import { useBackGuard } from '../ui/core';

const REST_CHOICES = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export function RoutineEditorScreen({ templateId }: { templateId?: string }) {
  const { templates } = useAppStore();
  const existing = templateId
    ? templates.find((template) => template.id === templateId)
    : undefined;
  const { pop } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [items, setItems] = useState<TemplateExercise[]>(
    existing?.exercises ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const dirty =
    name !== (existing?.name ?? '') ||
    description !== (existing?.description ?? '') ||
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
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const move = (index: number, direction: -1 | 1) =>
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

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
            <ol className="space-y-3">
              {items.map((item, index) => (
                <RoutineExerciseCard
                  key={`${item.exerciseId}-${index}`}
                  item={item}
                  index={index}
                  total={items.length}
                  onChange={(patch) => update(index, patch)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() =>
                    setItems((current) => current.filter((_, i) => i !== index))
                  }
                />
              ))}
            </ol>
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
          setItems((current) => [
            ...current,
            ...exercises.map((exercise) => ({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              targetSets: 3,
              targetReps: 10,
              targetWeightKg: 0,
              restSeconds: 90,
            })),
          ])
        }
      />
    </>
  );
}

function RoutineExerciseCard({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: TemplateExercise;
  index: number;
  total: number;
  onChange: (patch: Partial<TemplateExercise>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const muscle = findExercise(item.exerciseId)?.primaryMuscleGroup;

  return (
    <li className="animate-rise rounded-lg bg-surface p-4">
      <div className="flex items-center gap-3">
        <ExerciseThumb muscle={muscle} size={40} />
        <p className="text-headline min-w-0 flex-1 truncate font-semibold">
          {item.exerciseName}
        </p>
        <IconButton
          icon={MoreVertical}
          label={`Opções de ${item.exerciseName}`}
          onClick={() => setMenuOpen(true)}
          className="-mr-2"
        />
      </div>
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
    </li>
  );
}
