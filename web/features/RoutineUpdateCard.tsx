import { useState } from 'react';
import { Check, ClipboardList, RefreshCw } from 'lucide-react';
import { actions, type FinishResult } from '../store';
import { haptic } from '../lib/haptics';
import { Button } from '../ui/Button';
import { TextField } from '../ui/Form';

type Update = NonNullable<FinishResult['routineUpdate']>;

/**
 * After a workout: offers to update the routine it no longer matches, save it
 * as a new routine, or leave it. A free workout can become a routine.
 */
export function RoutineUpdateCard({ update }: { update: Update }) {
  const fromRoutine = update.templateId !== null;
  const [step, setStep] = useState<'ask' | 'name' | 'done' | 'dismissed'>(
    'ask',
  );
  const [doneText, setDoneText] = useState('');
  const [name, setName] = useState(
    fromRoutine ? `${update.templateName} (nova)` : update.templateName,
  );

  if (step === 'dismissed') return null;

  const finish = (text: string) => {
    haptic('success');
    setDoneText(text);
    setStep('done');
  };

  const saveNew = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    actions.createTemplate({
      name: trimmed.slice(0, 60),
      description: '',
      exercises: update.exercises,
      ...(update.folderId ? { folderId: update.folderId } : {}),
    });
    finish(`Rotina “${trimmed}” criada.`);
  };

  if (step === 'done')
    return (
      <section
        className="mt-4 flex w-full items-center gap-2 rounded-lg bg-success-soft p-4 text-left"
        role="status"
      >
        <Check size={18} className="text-success-ink" aria-hidden="true" />
        <p className="text-callout font-medium text-success-ink">{doneText}</p>
      </section>
    );

  const shown = update.changes.slice(0, 5);
  const more = update.changes.length - shown.length;

  return (
    <section
      className="mt-4 w-full rounded-lg border border-brand bg-surface p-4 text-left"
      aria-labelledby="routine-update-title"
    >
      <h2
        id="routine-update-title"
        className="text-headline flex items-center gap-2 font-semibold"
      >
        {fromRoutine ? (
          <RefreshCw size={18} className="text-brand-ink" aria-hidden="true" />
        ) : (
          <ClipboardList
            size={18}
            className="text-brand-ink"
            aria-hidden="true"
          />
        )}
        {fromRoutine
          ? `O treino mudou em relação a “${update.templateName}”`
          : 'Salvar este treino como rotina?'}
      </h2>
      {fromRoutine ? (
        <ul className="text-callout mt-2 list-disc space-y-0.5 pl-5 text-ink-2">
          {shown.map((change) => (
            <li key={change}>{change}</li>
          ))}
          {more > 0 && <li>e mais {more}</li>}
        </ul>
      ) : (
        <p className="text-callout mt-1 text-ink-2">
          Fica nas suas rotinas para repetir com um toque.
        </p>
      )}

      {step === 'name' ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            saveNew();
          }}
        >
          <TextField
            label="Nome da rotina"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep('ask')}
            >
              Voltar
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-2">
          {fromRoutine && (
            <Button
              block
              onClick={() => {
                actions.updateTemplate(update.templateId!, {
                  exercises: update.exercises,
                });
                finish(`Rotina “${update.templateName}” atualizada.`);
              }}
            >
              Atualizar a rotina
            </Button>
          )}
          <Button
            block
            variant={fromRoutine ? 'secondary' : 'primary'}
            onClick={() => setStep('name')}
          >
            {fromRoutine ? 'Salvar como nova rotina' : 'Salvar como rotina'}
          </Button>
          <Button block variant="ghost" onClick={() => setStep('dismissed')}>
            {fromRoutine ? 'Não salvar' : 'Agora não'}
          </Button>
        </div>
      )}
    </section>
  );
}
