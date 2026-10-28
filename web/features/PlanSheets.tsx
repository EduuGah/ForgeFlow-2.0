import { useState } from 'react';
import {
  BatteryCharging,
  BellRing,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Library,
  Plus,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import { formatRepRange } from '../lib/format';
import { haptic } from '../lib/haptics';
import { notificationPermission } from '../lib/notify';
import { PROGRAMS, programExercises, type Program } from '../lib/programs';
import {
  WEEKDAYS,
  deloadActive,
  minuteToTime,
  startDeload,
  timeToMinute,
} from '../lib/trainingPlan';
import { Button } from '../ui/Button';
import { Badge, InlineNotice } from '../ui/Feedback';
import { SelectField, Switch, TextField } from '../ui/Form';
import { Card } from '../ui/Layout';
import { Sheet, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';
import { PushSetup } from './PushSetup';
import { registerPush } from './pushRegistration';
import { updatePlan, useTrainingPlan } from './trainingPlan';

/** Monday first, the way the week reads in Brazil. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/* ------------------------------------------------------------------ */
/* The week at a glance                                                */
/* ------------------------------------------------------------------ */

export function WeekPlanCard({
  onEdit,
  onPrograms,
}: {
  onEdit: () => void;
  onPrograms: () => void;
}) {
  const { templates } = useAppStore();
  const plan = useTrainingPlan();
  const today = new Date().getDay();
  const nameOf = (id: string | null) =>
    (id && templates.find((template) => template.id === id)?.name) || null;
  const planned = plan.days.some((id) => nameOf(id));
  const deload = deloadActive(plan);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline flex items-center gap-2 font-semibold">
          <CalendarDays
            size={18}
            className="text-brand-ink"
            aria-hidden="true"
          />
          Sua agenda
        </h2>
        <div className="flex items-center gap-1">
          {plan.reminder.enabled && planned && (
            <span className="text-caption flex items-center gap-1 text-ink-2">
              <BellRing size={13} aria-hidden="true" />
              {minuteToTime(plan.reminder.minute)}
            </span>
          )}
          {deload && <Badge tone="warmup">Deload</Badge>}
        </div>
      </div>
      <ol
        className="mt-3 grid grid-cols-7 gap-1.5"
        aria-label="Agenda da semana"
      >
        {ORDER.map((day) => {
          const name = nameOf(plan.days[day]);
          return (
            <li
              key={day}
              className={cx(
                'flex min-w-0 flex-col items-center gap-1 rounded-md px-0.5 py-2',
                name ? 'bg-brand-soft' : 'bg-raised',
                day === today && 'ring-2 ring-brand-ink',
              )}
              aria-label={`${WEEKDAYS[day]}: ${name ?? 'descanso'}`}
            >
              <span
                className={cx(
                  'text-caption font-bold',
                  day === today ? 'text-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {LETTERS[day]}
              </span>
              <span
                className={cx(
                  'text-micro w-full truncate text-center font-semibold',
                  name ? 'text-brand-ink' : 'text-ink-3',
                )}
                aria-hidden="true"
              >
                {name ?? '—'}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={CalendarDays}
          onClick={onEdit}
        >
          {planned ? 'Editar agenda' : 'Montar agenda'}
        </Button>
        <Button variant="tinted" size="sm" icon={Library} onClick={onPrograms}>
          Programas
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Editing the week, the reminder and the deload                       */
/* ------------------------------------------------------------------ */

export function AgendaSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { templates, currentUser } = useAppStore();
  const plan = useTrainingPlan();
  const toast = useToast();
  const deload = deloadActive(plan);
  const options = [
    { value: '', label: 'Descanso' },
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ];

  const toggleReminder = async (enabled: boolean) => {
    updatePlan((current) => ({
      ...current,
      reminder: { ...current.reminder, enabled },
    }));
    if (enabled && currentUser && notificationPermission() === 'granted')
      await registerPush();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agenda da semana"
      description="Escolha a rotina de cada dia. A Home mostra o treino do dia."
    >
      <div className="space-y-5">
        {templates.length === 0 && (
          <InlineNotice tone="info">
            Crie uma rotina ou adicione um programa pronto para montar a agenda.
          </InlineNotice>
        )}
        <div className="space-y-2">
          {ORDER.map((day) => (
            <SelectField
              key={day}
              label={WEEKDAYS[day]}
              value={
                plan.days[day] &&
                templates.some((template) => template.id === plan.days[day])
                  ? (plan.days[day] as string)
                  : ''
              }
              onChange={(value) =>
                updatePlan((current) => ({
                  ...current,
                  days: current.days.map((id, index) =>
                    index === day ? value || null : id,
                  ),
                }))
              }
              options={options}
            />
          ))}
        </div>

        <section className="space-y-3 rounded-lg bg-raised p-3">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-body flex items-center gap-2 font-medium">
                <BellRing size={16} aria-hidden="true" /> Lembrete de treino
              </p>
              <p className="text-footnote text-ink-2">
                Nos dias com rotina, mesmo com o app fechado
              </p>
            </div>
            <Switch
              label="Lembrete de treino"
              checked={plan.reminder.enabled}
              onChange={(checked) => void toggleReminder(checked)}
            />
          </div>
          {plan.reminder.enabled && (
            <>
              <TextField
                label="Horário"
                type="time"
                value={minuteToTime(plan.reminder.minute)}
                onChange={(event) => {
                  const minute = timeToMinute(event.target.value);
                  if (minute !== null)
                    updatePlan((current) => ({
                      ...current,
                      reminder: { ...current.reminder, minute },
                    }));
                }}
              />
              {currentUser ? (
                <PushSetup />
              ) : (
                <InlineNotice tone="info">
                  Entre com sua conta para receber o lembrete com o app fechado.
                </InlineNotice>
              )}
            </>
          )}
        </section>

        <section className="space-y-2 rounded-lg bg-raised p-3">
          <p className="text-body flex items-center gap-2 font-medium">
            <BatteryCharging size={16} aria-hidden="true" /> Semana de deload
          </p>
          <p className="text-footnote text-ink-2">
            Uma semana mais leve: as rotinas começam com metade das séries.
            Ajuda o corpo a recuperar depois de semanas puxadas.
          </p>
          {deload ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-footnote font-semibold text-warmup">
                Ativo até domingo
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  updatePlan((current) => ({ ...current, deloadUntil: null }))
                }
              >
                Encerrar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                updatePlan((current) => startDeload(current));
                haptic('success');
                toast({
                  tone: 'success',
                  title: 'Deload ativado',
                  description: 'Até domingo, rotinas com metade das séries.',
                });
              }}
            >
              Fazer deload esta semana
            </Button>
          )}
        </section>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Ready-made programs                                                 */
/* ------------------------------------------------------------------ */

function addProgram(program: Program, useInPlan: boolean): number {
  const folderId = actions.createFolder(program.name);
  const ids = program.routines.map((routine) =>
    actions.createTemplate({
      name: routine.name,
      description: program.description,
      exercises: programExercises(routine),
      folderId,
    }),
  );
  if (useInPlan)
    updatePlan((current) => {
      const days: (string | null)[] = [
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];
      // A, B, A… across the suggested days.
      program.schedule.forEach((day, index) => {
        days[day] = ids[index % ids.length];
      });
      return { ...current, days };
    });
  return ids.length;
}

function ProgramCard({
  program,
  onAdded,
}: {
  program: Program;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [useInPlan, setUseInPlan] = useState(true);
  return (
    <li className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={program.level === 'Iniciante' ? 'success' : 'brand'}>
              {program.level}
            </Badge>
            <span className="text-caption text-ink-2">
              {program.daysPerWeek}x por semana · {program.place}
            </span>
          </span>
          <span className="text-headline mt-1.5 block font-semibold">
            {program.name}
          </span>
          <span className="text-footnote mt-0.5 block text-ink-2">
            {program.description}
          </span>
        </span>
        {open ? (
          <ChevronUp size={18} className="mt-1 text-ink-3" aria-hidden="true" />
        ) : (
          <ChevronDown
            size={18}
            className="mt-1 text-ink-3"
            aria-hidden="true"
          />
        )}
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {program.routines.map((routine) => (
            <div key={routine.name}>
              <p className="text-callout font-semibold">{routine.name}</p>
              <ul className="mt-1 space-y-0.5">
                {programExercises(routine).map((exercise) => (
                  <li
                    key={exercise.exerciseId}
                    className="text-footnote flex justify-between gap-3 text-ink-2"
                  >
                    <span className="truncate">{exercise.exerciseName}</span>
                    <span className="shrink-0 tabular">
                      {exercise.targetSets} ×{' '}
                      {formatRepRange(
                        exercise.targetReps,
                        exercise.targetRepsMax,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <label className="flex items-center justify-between gap-3">
            <span className="text-footnote text-ink-2">
              Montar a agenda com este programa (
              {program.schedule.map((day) => LETTERS[day]).join(' ')})
            </span>
            <Switch
              label="Usar na agenda"
              checked={useInPlan}
              onChange={setUseInPlan}
            />
          </label>
          <Button
            block
            icon={Plus}
            onClick={() => {
              const count = addProgram(program, useInPlan);
              haptic('success');
              toast({
                tone: 'success',
                title: 'Programa adicionado',
                description: `${count} ${count === 1 ? 'rotina' : 'rotinas'} na pasta "${program.name}".`,
              });
              onAdded();
            }}
          >
            Adicionar às minhas rotinas
          </Button>
        </div>
      )}
    </li>
  );
}

export function ProgramsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Programas prontos"
      description="Rotinas que funcionam juntas. Adicione e ajuste do seu jeito."
    >
      <ul className="space-y-3">
        {PROGRAMS.map((program) => (
          <ProgramCard key={program.id} program={program} onAdded={onClose} />
        ))}
      </ul>
    </Sheet>
  );
}
