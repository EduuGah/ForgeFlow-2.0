import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import {
  CalendarRange,
  Check,
  ChevronDown,
  Dumbbell,
  FileSpreadsheet,
  FileUp,
  History,
  ListChecks,
  Ruler,
  Sparkles,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import { actions, useAppStore } from '../store';
import {
  ImportError,
  isMeasurementCsv,
  parseCsv,
  planImport,
  planMeasurementImport,
  readMeasurementCsv,
  readWorkoutCsv,
  type ExerciseMatch,
  type ImportExtras,
  type ImportPlan,
  type MeasurementPlan,
} from '../lib/importCsv';
import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_LABELS,
  measurementSeries,
} from '../lib/measurements';
import { formatNumber, formatShortDate, pluralize } from '../lib/format';
import { muscleCode } from '../lib/training';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { Button, Spinner } from '../ui/Button';
import { InlineNotice } from '../ui/Feedback';
import { Card, StackHeader } from '../ui/Layout';
import { useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

type Step =
  | { kind: 'pick'; error?: string }
  | { kind: 'reading'; fileName: string }
  | { kind: 'preview'; fileName: string; plan: ImportPlan }
  | { kind: 'measurePreview'; fileName: string; plan: MeasurementPlan }
  | {
      kind: 'done';
      imported: number;
      records: number;
      workoutIds: string[];
      exerciseIds: string[];
    }
  | { kind: 'measureDone'; imported: number; ids: string[] };

const FORMAT_LABEL = { hevy: 'Hevy', strong: 'Strong' } as const;

export function ImportScreen() {
  const { allExercises, history, currentUser, measurements } = useAppStore();
  const { pop, push, selectTab } = useNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [dragging, setDragging] = useState(false);

  const readFile = async (file: File) => {
    setStep({ kind: 'reading', fileName: file.name });
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new ImportError('Arquivo grande demais (máximo de 20 MB).');
      const text = await file.text();
      if (isMeasurementCsv(parseCsv(text))) {
        const measures = readMeasurementCsv(text);
        if (measures.rows.length === 0)
          throw new ImportError('Não encontramos medidas nesse arquivo.');
        setStep({
          kind: 'measurePreview',
          fileName: file.name,
          plan: planMeasurementImport(measures, measurements),
        });
        return;
      }
      const parsed = readWorkoutCsv(text);
      if (parsed.workouts.length === 0)
        throw new ImportError(
          'Não encontramos treinos com séries válidas nesse arquivo.',
        );
      const plan = planImport(parsed, {
        catalog: allExercises,
        history,
        ownerUserId: currentUser?.uid || 'local-user',
        now: new Date(),
      });
      setStep({ kind: 'preview', fileName: file.name, plan });
    } catch (error) {
      setStep({
        kind: 'pick',
        error:
          error instanceof ImportError
            ? error.message
            : 'Não foi possível ler esse arquivo. Confira se é um CSV exportado pelo app de treino.',
      });
    }
  };

  const runImport = async (plan: ImportPlan) => {
    const ok = await confirm({
      title: `Importar ${pluralize(plan.workouts.length, 'treino', 'treinos')}?`,
      message:
        'Eles entram no seu diário e os recordes são recalculados com todo o histórico. Dá para desfazer logo em seguida.',
      confirmLabel: 'Importar',
      icon: FileUp,
    });
    if (!ok) return;
    const result = actions.importHistory(plan);
    haptic('success');
    setStep({
      kind: 'done',
      ...result,
      workoutIds: plan.workouts.map((workout) => workout.id),
      exerciseIds: plan.newExercises.map((exercise) => exercise.id),
    });
  };

  const runMeasurementImport = async (plan: MeasurementPlan) => {
    const ok = await confirm({
      title: `Importar ${pluralize(plan.measurements.length, 'medição', 'medições')}?`,
      message:
        'Elas entram em Medidas corporais, e o peso do seu perfil passa a seguir a medição mais recente.',
      confirmLabel: 'Importar',
      icon: Ruler,
    });
    if (!ok) return;
    const imported = actions.importMeasurements(plan);
    haptic('success');
    setStep({
      kind: 'measureDone',
      imported,
      ids: plan.measurements.map((item) => item.id),
    });
  };

  const undoMeasurements = async (ids: string[]) => {
    const ok = await confirm({
      title: 'Desfazer importação?',
      message: 'As medições importadas serão removidas.',
      confirmLabel: 'Desfazer',
      tone: 'danger',
      icon: Undo2,
    });
    if (!ok) return;
    actions.undoMeasurementImport(ids);
    toast({ tone: 'success', title: 'Importação desfeita' });
    setStep({ kind: 'pick' });
  };

  const undo = async (workoutIds: string[], exerciseIds: string[]) => {
    const ok = await confirm({
      title: 'Desfazer importação?',
      message:
        'Os treinos importados e os exercícios criados por ela serão removidos.',
      confirmLabel: 'Desfazer',
      tone: 'danger',
      icon: Undo2,
    });
    if (!ok) return;
    actions.undoImport(workoutIds, exerciseIds);
    toast({ tone: 'success', title: 'Importação desfeita' });
    setStep({ kind: 'pick' });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void readFile(file);
  };

  return (
    <>
      <StackHeader title="Importar histórico" onBack={pop} />
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file);
        }}
      />

      <div className="app-column space-y-4 px-4 pt-4 pb-6">
        {step.kind === 'pick' && (
          <>
            <div className="animate-rise">
              <h2 className="text-title font-bold">
                Traga seus treinos e medidas
              </h2>
              <p className="text-callout mt-1.5 text-ink-2">
                Use o CSV exportado pelo seu app anterior. Nos treinos vêm
                séries, cargas, aquecimentos, falhas, cardio, RPE, supersets e
                notas, e os recordes são recalculados. O arquivo de medidas traz
                peso, gordura e circunferências.
              </p>
            </div>

            {step.error && (
              <InlineNotice tone="error">{step.error}</InlineNotice>
            )}

            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cx(
                'pressable flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-9 text-center transition-colors',
                dragging
                  ? 'border-brand bg-brand-soft'
                  : 'border-line-strong bg-surface active:bg-raised',
              )}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-brand text-on-brand">
                <FileUp size={26} aria-hidden="true" />
              </span>
              <span className="text-headline font-semibold">
                Escolher arquivo CSV
              </span>
              <span className="text-footnote text-ink-2">
                ou arraste o arquivo para cá
              </span>
            </button>

            <Card className="p-4">
              <h3 className="text-headline font-semibold">Como exportar</h3>
              <ol className="text-callout mt-3 space-y-3 text-ink-2">
                <HowToStep n={1}>
                  <strong className="text-ink">Hevy:</strong> Perfil ›
                  Configurações › Exportar e importar dados › Exportar treinos
                  e, se quiser, Exportar medidas (são dois arquivos: importe um
                  de cada vez).
                </HowToStep>
                <HowToStep n={2}>
                  <strong className="text-ink">Strong:</strong> Perfil ›
                  Configurações › Exportar dados de treino.
                </HowToStep>
                <HowToStep n={3}>
                  Salve o arquivo no celular e escolha-o aqui.
                </HowToStep>
              </ol>
              <p className="text-footnote mt-4 text-ink-3">
                Treinos e medições que já estão no app são ignorados, então
                importar o mesmo arquivo de novo não duplica nada.
              </p>
            </Card>
          </>
        )}

        {step.kind === 'reading' && (
          <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Spinner size={28} className="text-brand-ink" />
            <p className="text-headline font-semibold">
              Lendo {step.fileName}…
            </p>
            <p className="text-footnote text-ink-2">
              Organizando treinos, séries e exercícios.
            </p>
          </Card>
        )}

        {step.kind === 'preview' && (
          <Preview
            fileName={step.fileName}
            plan={step.plan}
            onImport={() => void runImport(step.plan)}
            onPickAnother={() => input.current?.click()}
          />
        )}

        {step.kind === 'measurePreview' && (
          <MeasurementPreview
            fileName={step.fileName}
            plan={step.plan}
            onImport={() => void runMeasurementImport(step.plan)}
            onPickAnother={() => input.current?.click()}
          />
        )}

        {step.kind === 'measureDone' && (
          <div className="animate-rise space-y-4">
            <Card className="flex flex-col items-center px-6 py-9 text-center">
              <span className="grid size-16 animate-pop place-items-center rounded-full bg-success text-on-brand">
                <Check size={32} strokeWidth={3} aria-hidden="true" />
              </span>
              <h2 className="text-title mt-4 font-bold">Medidas importadas</h2>
              <p className="text-callout mt-1 text-ink-2">
                {pluralize(
                  step.imported,
                  'medição entrou',
                  'medições entraram',
                )}{' '}
                em Medidas corporais.
              </p>
            </Card>
            <Button
              size="lg"
              block
              icon={Ruler}
              onClick={() => {
                pop();
                push({ name: 'measurements' });
              }}
            >
              Ver medidas
            </Button>
            <Button
              variant="danger-ghost"
              block
              icon={Undo2}
              onClick={() => void undoMeasurements(step.ids)}
            >
              Desfazer importação
            </Button>
          </div>
        )}

        {step.kind === 'done' && (
          <div className="animate-rise space-y-4">
            <Card className="flex flex-col items-center px-6 py-9 text-center">
              <span className="grid size-16 animate-pop place-items-center rounded-full bg-success text-on-brand">
                <Check size={32} strokeWidth={3} aria-hidden="true" />
              </span>
              <h2 className="text-title mt-4 font-bold">Histórico importado</h2>
              <p className="text-callout mt-1 text-ink-2">
                {pluralize(step.imported, 'treino entrou', 'treinos entraram')}{' '}
                no seu diário
                {step.records > 0 &&
                  ` com ${pluralize(step.records, 'recorde', 'recordes')}`}
                .
              </p>
            </Card>
            <Button
              size="lg"
              block
              icon={History}
              onClick={() => {
                pop();
                push({ name: 'history' });
              }}
            >
              Ver diário de treinos
            </Button>
            <Button
              size="lg"
              variant="secondary"
              block
              icon={TrendingUp}
              onClick={() => selectTab('progress')}
            >
              Ver minha evolução
            </Button>
            <Button
              variant="danger-ghost"
              block
              icon={Undo2}
              onClick={() => void undo(step.workoutIds, step.exerciseIds)}
            >
              Desfazer importação
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function HowToStep({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-caption grid size-6 shrink-0 place-items-center rounded-full bg-raised font-bold text-ink">
        {n}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}

function Preview({
  fileName,
  plan,
  onImport,
  onPickAnother,
}: {
  fileName: string;
  plan: ImportPlan;
  onImport: () => void;
  onPickAnother: () => void;
}) {
  const recognized = plan.matches.filter((match) => match.recognized);
  const created = plan.matches.filter((match) => !match.recognized);
  const nothingNew = plan.workouts.length === 0;

  return (
    <div className="animate-rise space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-success-soft text-success-ink">
            <FileSpreadsheet size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-body block truncate font-semibold">
              {fileName}
            </span>
            <span className="text-footnote text-ink-2">
              Exportado do {FORMAT_LABEL[plan.format]}
            </span>
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line">
          <PreviewStat
            icon={Dumbbell}
            label="Treinos novos"
            value={formatNumber(plan.workouts.length, 0)}
          />
          <PreviewStat
            icon={ListChecks}
            label="Séries"
            value={formatNumber(plan.totalSets, 0)}
          />
          <PreviewStat
            icon={CalendarRange}
            label="Período"
            value={
              plan.firstDate && plan.lastDate
                ? `${formatShortDate(plan.firstDate)} – ${formatShortDate(plan.lastDate)}`
                : '—'
            }
            wide
          />
        </dl>
      </Card>

      {plan.duplicates > 0 && (
        <InlineNotice tone="info">
          {pluralize(plan.duplicates, 'treino já estava', 'treinos já estavam')}{' '}
          no seu diário e{' '}
          {plan.duplicates === 1 ? 'será ignorado' : 'serão ignorados'}.
        </InlineNotice>
      )}
      {plan.skippedRows > 0 && (
        <InlineNotice tone="warning">
          {pluralize(
            plan.skippedRows,
            'linha sem data válida foi ignorada',
            'linhas sem data válida foram ignoradas',
          )}
          .
        </InlineNotice>
      )}

      {!nothingNew && <ExtrasList extras={plan.extras} />}

      {!nothingNew && (
        <>
          <MatchList
            title={`Exercícios reconhecidos (${recognized.length})`}
            description="Ligados aos exercícios do ForgeFlow, com instruções e histórico unificados."
            matches={recognized}
            defaultOpen={false}
          />
          {created.length > 0 && (
            <MatchList
              title={`Novos exercícios (${created.length})`}
              description="Serão criados como exercícios personalizados, com o grupo muscular estimado."
              matches={created}
              defaultOpen
              accent
            />
          )}
        </>
      )}

      <div className="space-y-2 pt-2">
        {nothingNew ? (
          <InlineNotice tone="info">
            Todos os treinos desse arquivo já estão no seu diário.
          </InlineNotice>
        ) : (
          <Button size="lg" block icon={Sparkles} onClick={onImport}>
            Importar {pluralize(plan.workouts.length, 'treino', 'treinos')}
          </Button>
        )}
        <Button variant="ghost" block onClick={onPickAnother}>
          Escolher outro arquivo
        </Button>
      </div>
    </div>
  );
}

function PreviewStat({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col-reverse bg-surface p-4',
        wide && 'col-span-2',
      )}
    >
      <dt className="text-caption mt-0.5 flex items-center gap-1.5 text-ink-2">
        <Icon size={14} aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-metric text-metric-sm">{value}</dd>
    </div>
  );
}

function MatchList({
  title,
  description,
  matches,
  defaultOpen,
  accent = false,
}: {
  title: string;
  description: string;
  matches: ExerciseMatch[];
  defaultOpen: boolean;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card
      className={cx(
        'overflow-hidden',
        accent && 'ember-edge border-transparent',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-4 text-left active:bg-raised"
      >
        <span className="min-w-0 flex-1">
          <span className="text-headline block font-semibold">{title}</span>
          <span className="text-footnote mt-0.5 block text-ink-2">
            {description}
          </span>
        </span>
        <ChevronDown
          size={20}
          className={cx(
            'mt-0.5 shrink-0 text-ink-3 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line" role="list">
          {matches.map((match) => (
            <li
              key={match.sourceName}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="text-micro w-10 shrink-0 rounded-sm bg-raised py-0.5 text-center font-semibold text-ink-2">
                {muscleCode(match.primaryMuscleGroup)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-callout block truncate">
                  {match.exerciseName}
                </span>
                {match.exerciseName !== match.sourceName && (
                  <span className="text-caption block truncate text-ink-3">
                    {match.sourceName}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const EXTRA_LABELS: { key: keyof ImportExtras; one: string; many: string }[] = [
  {
    key: 'warmups',
    one: 'série de aquecimento',
    many: 'séries de aquecimento',
  },
  { key: 'failures', one: 'série até a falha', many: 'séries até a falha' },
  { key: 'dropsets', one: 'drop set', many: 'drop sets' },
  {
    key: 'cardio',
    one: 'série de cardio ou tempo (distância e duração)',
    many: 'séries de cardio ou tempo (distância e duração)',
  },
  { key: 'rpe', one: 'série com RPE', many: 'séries com RPE' },
  { key: 'supersets', one: 'superset', many: 'supersets' },
  {
    key: 'exerciseNotes',
    one: 'nota de exercício',
    many: 'notas de exercício',
  },
  {
    key: 'workoutNotes',
    one: 'descrição de treino',
    many: 'descrições de treino',
  },
];

/** Everything besides plain sets that the file carries, so nothing is a surprise. */
function ExtrasList({ extras }: { extras: ImportExtras }) {
  const items = EXTRA_LABELS.filter(({ key }) => extras[key] > 0);
  if (items.length === 0) return null;
  return (
    <Card className="p-4">
      <h3 className="text-headline font-semibold">Também vem junto</h3>
      <ul className="mt-2 space-y-1.5" role="list">
        {items.map(({ key, one, many }) => (
          <li key={key} className="text-callout flex items-center gap-2">
            <Check
              size={16}
              strokeWidth={3}
              className="shrink-0 text-success-ink"
              aria-hidden="true"
            />
            {pluralize(extras[key], one, many)}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MeasurementPreview({
  fileName,
  plan,
  onImport,
  onPickAnother,
}: {
  fileName: string;
  plan: MeasurementPlan;
  onImport: () => void;
  onPickAnother: () => void;
}) {
  const nothingNew = plan.measurements.length === 0;
  const weights = measurementSeries(plan.measurements, 'weightKg');
  const fields = MEASUREMENT_FIELDS.filter((field) =>
    plan.fields.includes(field),
  );
  return (
    <div className="animate-rise space-y-4">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-success-soft text-success-ink">
            <Ruler size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-body block truncate font-semibold">
              {fileName}
            </span>
            <span className="text-footnote text-ink-2">
              Medidas corporais exportadas do Hevy
            </span>
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-line">
          <PreviewStat
            icon={ListChecks}
            label="Medições novas"
            value={formatNumber(plan.measurements.length, 0)}
          />
          <PreviewStat
            icon={TrendingUp}
            label="Peso"
            value={
              weights.length > 0
                ? `${formatNumber(weights[0].value)} → ${formatNumber(weights[weights.length - 1].value)} kg`
                : '—'
            }
          />
          <PreviewStat
            icon={CalendarRange}
            label="Período"
            value={
              plan.firstDate && plan.lastDate
                ? `${formatShortDate(plan.firstDate)} – ${formatShortDate(plan.lastDate)}`
                : '—'
            }
            wide
          />
        </dl>
      </Card>

      {fields.length > 0 && (
        <Card className="p-4">
          <h3 className="text-headline font-semibold">Dados no arquivo</h3>
          <ul className="mt-3 flex flex-wrap gap-1.5" role="list">
            {fields.map((field) => (
              <li
                key={field}
                className="text-footnote rounded-full bg-raised px-2.5 py-1 font-medium"
              >
                {MEASUREMENT_LABELS[field]}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.duplicates > 0 && (
        <InlineNotice tone="info">
          {pluralize(
            plan.duplicates,
            'dia já tinha medição e será ignorado',
            'dias já tinham medição e serão ignorados',
          )}
          .
        </InlineNotice>
      )}
      {plan.skippedRows > 0 && (
        <InlineNotice tone="warning">
          {pluralize(
            plan.skippedRows,
            'linha sem data ou sem valores foi ignorada',
            'linhas sem data ou sem valores foram ignoradas',
          )}
          .
        </InlineNotice>
      )}

      <div className="space-y-2 pt-2">
        {nothingNew ? (
          <InlineNotice tone="info">
            Todas as medições desse arquivo já estão no app.
          </InlineNotice>
        ) : (
          <Button size="lg" block icon={Sparkles} onClick={onImport}>
            Importar{' '}
            {pluralize(plan.measurements.length, 'medição', 'medições')}
          </Button>
        )}
        <Button variant="ghost" block onClick={onPickAnother}>
          Escolher outro arquivo
        </Button>
      </div>
    </div>
  );
}
