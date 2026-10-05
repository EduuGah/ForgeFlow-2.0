import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Ruler, Trash2 } from 'lucide-react';
import { actions, useAppStore } from '../store';
import type { BodyMeasurement } from '../lib/types';
import {
  MEASUREMENT_GROUPS,
  MEASUREMENT_LABELS,
  measurementSeries,
  measurementUnit,
  summarizeMeasurements,
  type MeasurementField,
} from '../lib/measurements';
import { addMonths, parseLocalDateInput, toLocalDateInput } from '../lib/dates';
import { formatNumber, formatShortDate } from '../lib/format';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import { LineChart } from '../ui/Charts';
import { EmptyState } from '../ui/Feedback';
import { NumberField, SegmentedControl, TextField } from '../ui/Form';
import { Card, GroupLabel, StackHeader } from '../ui/Layout';
import { Sheet, useConfirm, useToast } from '../ui/Overlay';
import { cx } from '../ui/core';

type Period = '3m' | '6m' | '1y' | 'all';

const PERIODS: { value: Period; label: string }[] = [
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 ano' },
  { value: 'all', label: 'Tudo' },
];

const PERIOD_MONTHS: Record<Exclude<Period, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  '1y': 12,
};

/** "9 de mar. de 2026" — measurements span years, so the year is kept. */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatValue(field: MeasurementField, value: number): string {
  return `${formatNumber(value, field === 'weightKg' ? 2 : 1)} ${measurementUnit(field)}`;
}

/** "▼ 1,15 kg" — direction in text, never color alone. */
function formatChange(field: MeasurementField, change: number): string {
  if (change === 0) return '= sem mudança';
  return `${change > 0 ? '▲' : '▼'} ${formatValue(field, Math.abs(change))}`;
}

function summaryLine(item: BodyMeasurement): string {
  const parts: string[] = [];
  for (const group of MEASUREMENT_GROUPS) {
    for (const field of group.fields) {
      const value = item[field];
      if (typeof value !== 'number') continue;
      parts.push(
        field === 'weightKg' || field === 'fatPercent'
          ? formatValue(field, value)
          : `${MEASUREMENT_LABELS[field].toLowerCase()} ${formatValue(field, value)}`,
      );
    }
  }
  return parts.join(' · ');
}

export function MeasurementsScreen() {
  const { measurements } = useAppStore();
  const { pop } = useNavigation();
  const toast = useToast();
  const summaries = useMemo(
    () => summarizeMeasurements(measurements),
    [measurements],
  );
  const [chosenField, setField] = useState<MeasurementField | null>(null);
  // null = automatic: the shortest period that still shows a trend.
  const [chosenPeriod, setPeriod] = useState<Period | null>(null);
  const [editing, setEditing] = useState<BodyMeasurement | 'new' | null>(null);

  const field: MeasurementField | null =
    chosenField && summaries.some((item) => item.field === chosenField)
      ? chosenField
      : (summaries.find((item) => item.field === 'weightKg')?.field ??
        summaries[0]?.field ??
        null);
  const summary = summaries.find((item) => item.field === field);

  const { points, period } = useMemo((): {
    points: { date: string; value: number }[];
    period: Period;
  } => {
    const series = field ? measurementSeries(measurements, field) : [];
    const within = (choice: Period) => {
      if (choice === 'all') return series;
      const since = addMonths(new Date(), -PERIOD_MONTHS[choice]).getTime();
      return series.filter((point) => new Date(point.date).getTime() >= since);
    };
    if (chosenPeriod)
      return { points: within(chosenPeriod), period: chosenPeriod };
    const auto =
      (['3m', '6m', '1y'] as const).find(
        (choice) => within(choice).length >= 2,
      ) ?? 'all';
    return { points: within(auto), period: auto };
  }, [measurements, field, chosenPeriod]);

  const remove = (item: BodyMeasurement) => {
    const removed = actions.removeMeasurement(item.id);
    if (!removed) return;
    toast({
      title: 'Medição excluída',
      action: {
        label: 'Desfazer',
        onPress: () => actions.restoreMeasurement(removed),
      },
    });
  };

  return (
    <>
      <StackHeader
        title="Medidas corporais"
        onBack={pop}
        right={
          <IconButton
            icon={Plus}
            label="Nova medição"
            onClick={() => setEditing('new')}
          />
        }
      />
      <div className="app-column pb-6">
        {measurements.length === 0 ? (
          <EmptyState
            icon={Ruler}
            title="Nenhuma medição ainda"
            message="Registre peso, gordura corporal e circunferências para acompanhar sua composição. Vindo do Hevy? Importe o arquivo de medidas em Configurações."
            action={
              <Button icon={Plus} onClick={() => setEditing('new')}>
                Registrar medição
              </Button>
            }
            className="pt-20"
          />
        ) : (
          <>
            {field && summary && (
              <div className="px-4 pt-4">
                <SegmentedControl
                  label="Medida exibida"
                  options={summaries.map((item) => ({
                    value: item.field,
                    label: MEASUREMENT_LABELS[item.field],
                  }))}
                  value={field}
                  onChange={setField}
                />
                <Card className="mt-4 p-4">
                  <p className="text-footnote text-ink-2">
                    {MEASUREMENT_LABELS[field]} · {formatDay(summary.latestAt)}
                  </p>
                  <p className="font-metric text-metric-lg tabular">
                    {formatNumber(summary.latest, field === 'weightKg' ? 2 : 1)}
                    <span className="text-headline ml-1 font-sans text-ink-2">
                      {measurementUnit(field)}
                    </span>
                  </p>
                  <p className="text-caption mt-1 flex flex-wrap gap-x-3 text-ink-2 tabular">
                    {summary.change !== undefined && (
                      <span>
                        {formatChange(field, summary.change)}{' '}
                        <span className="text-ink-3">desde a anterior</span>
                      </span>
                    )}
                    {summary.sinceStart !== undefined && (
                      <span>
                        {formatChange(field, summary.sinceStart)}{' '}
                        <span className="text-ink-3">desde o início</span>
                      </span>
                    )}
                  </p>
                  <div className="mt-4">
                    <LineChart
                      zoom
                      data={points.map((point) => ({
                        key: point.date,
                        label: formatShortDate(point.date),
                        value: point.value,
                      }))}
                      label={`${MEASUREMENT_LABELS[field]} ao longo do tempo`}
                      formatValue={(value) => formatValue(field, value)}
                      formatTick={(value) => formatNumber(value, 1)}
                      emptyMessage="Sem medições no período"
                    />
                  </div>
                  <SegmentedControl
                    label="Período do gráfico"
                    options={PERIODS}
                    value={period}
                    onChange={setPeriod}
                    className="mt-3"
                  />
                </Card>
              </div>
            )}

            <GroupLabel>Últimos valores</GroupLabel>
            <ul
              className="mx-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface"
              role="list"
            >
              {summaries.map((item) => (
                <li key={item.field}>
                  <button
                    type="button"
                    onClick={() => {
                      setField(item.field);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cx(
                      'flex min-h-13 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised',
                      item.field === field && 'bg-brand-soft',
                    )}
                  >
                    <span className="text-body min-w-0 flex-1 truncate">
                      {MEASUREMENT_LABELS[item.field]}
                    </span>
                    <span className="text-right">
                      <span className="text-body block font-semibold tabular">
                        {formatValue(item.field, item.latest)}
                      </span>
                      {item.change !== undefined && (
                        <span className="text-caption block text-ink-3 tabular">
                          {formatChange(item.field, item.change)}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <GroupLabel>Histórico</GroupLabel>
            <ul
              className="mx-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface"
              role="list"
            >
              {measurements.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(item)}
                    className="flex w-full flex-col items-start px-4 py-3 text-left active:bg-raised"
                  >
                    <span className="text-body font-semibold first-letter:uppercase">
                      {formatDay(item.measuredAt)}
                    </span>
                    <span className="text-footnote mt-0.5 text-ink-2 tabular">
                      {summaryLine(item)}
                    </span>
                    {item.notes && (
                      <span className="text-footnote mt-1 text-ink-3">
                        {item.notes}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <MeasurementSheet
        open={editing !== null}
        initial={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onDelete={(item) => {
          setEditing(null);
          remove(item);
        }}
      />
    </>
  );
}

type Draft = Partial<Record<MeasurementField, number>>;

function draftFrom(item: BodyMeasurement | null): Draft {
  const draft: Draft = {};
  if (!item) return draft;
  for (const group of MEASUREMENT_GROUPS)
    for (const field of group.fields) {
      const value = item[field];
      if (typeof value === 'number') draft[field] = value;
    }
  return draft;
}

function MeasurementSheet({
  open,
  initial,
  onClose,
  onDelete,
}: {
  open: boolean;
  initial: BodyMeasurement | null;
  onClose: () => void;
  onDelete: (item: BodyMeasurement) => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [values, setValues] = useState<Draft>({});
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset the form each time the sheet opens (derived state, no effect).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      const draft = draftFrom(initial);
      setValues(draft);
      setDate(
        toLocalDateInput(initial ? new Date(initial.measuredAt) : new Date()),
      );
      setNotes(initial?.notes ?? '');
      setExpanded(
        MEASUREMENT_GROUPS.filter(
          (group, index) =>
            index === 0 || group.fields.some((field) => draft[field]),
        ).map((group) => group.title),
      );
    }
  }

  const hasValue = Object.values(values).some((value) => (value ?? 0) > 0);

  const save = () => {
    const day = parseLocalDateInput(date);
    if (!day || !hasValue) return;
    // Today keeps the current time; other days are stored at noon, so the
    // calendar day never shifts with the time zone.
    const now = new Date();
    const measuredAt =
      toLocalDateInput(day) === toLocalDateInput(now)
        ? now
        : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
    const entry: Omit<BodyMeasurement, 'id'> = {
      measuredAt: measuredAt.toISOString(),
    };
    for (const [key, value] of Object.entries(values))
      if (value && value > 0) entry[key as MeasurementField] = value;
    const trimmed = notes.trim();
    if (trimmed) entry.notes = trimmed;

    if (initial) {
      actions.updateMeasurement(initial.id, entry);
      toast({ tone: 'success', title: 'Medição atualizada' });
    } else {
      actions.addMeasurement(entry);
      toast({ tone: 'success', title: 'Medição registrada' });
    }
    onClose();
  };

  const askDelete = async () => {
    if (!initial) return;
    const ok = await confirm({
      title: 'Excluir esta medição?',
      message: formatDay(initial.measuredAt),
      confirmLabel: 'Excluir',
      tone: 'danger',
      icon: Trash2,
    });
    if (ok) onDelete(initial);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="tall"
      title={initial ? 'Editar medição' : 'Nova medição'}
      description="Preencha só o que você mediu."
      footer={
        <div className="space-y-2">
          <Button
            size="lg"
            block
            disabled={!hasValue || !parseLocalDateInput(date)}
            onClick={save}
          >
            {initial ? 'Salvar alterações' : 'Registrar medição'}
          </Button>
          {initial && (
            <Button
              variant="danger-ghost"
              block
              icon={Trash2}
              onClick={() => void askDelete()}
            >
              Excluir medição
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <TextField
          label="Data"
          type="date"
          value={date}
          max={toLocalDateInput(new Date())}
          onChange={(event) => setDate(event.target.value)}
        />
        {MEASUREMENT_GROUPS.map((group) => {
          const isOpen = expanded.includes(group.title);
          return (
            <section key={group.title} className="rounded-lg bg-raised/50">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() =>
                  setExpanded((current) =>
                    isOpen
                      ? current.filter((title) => title !== group.title)
                      : [...current, group.title],
                  )
                }
                className="text-headline flex w-full items-center justify-between px-3 py-3 font-semibold"
              >
                {group.title}
                <ChevronDown
                  size={18}
                  className={cx(
                    'text-ink-3 transition-transform',
                    isOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                  {group.fields.map((field) => (
                    <NumberField
                      key={field}
                      label={MEASUREMENT_LABELS[field]}
                      suffix={measurementUnit(field)}
                      decimal
                      zeroAsEmpty
                      placeholder="—"
                      max={field === 'fatPercent' ? 80 : 400}
                      value={values[field] ?? 0}
                      onValueChange={(value) =>
                        setValues((current) => ({ ...current, [field]: value }))
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <TextField
          label="Observação"
          placeholder="Em jejum, pós-treino…"
          value={notes}
          maxLength={200}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
    </Sheet>
  );
}
