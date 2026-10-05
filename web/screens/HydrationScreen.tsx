import { useMemo, useState } from 'react';
import { CheckCircle2, Droplet, Plus, Settings2, Trash2 } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { addDays, startOfDay } from '../lib/dates';
import { formatNumber, formatTime } from '../lib/format';
import { goalPercent, hydrationDate, itemsOnDay } from '../lib/training';
import type { HydrationLog } from '../lib/types';
import { haptic } from '../lib/haptics';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import { BarChart } from '../ui/Charts';
import { EmptyState, ProgressRing } from '../ui/Feedback';
import { NumericInput } from '../ui/Form';
import { Card, SectionHeader, StackHeader } from '../ui/Layout';
import { useToast } from '../ui/Overlay';
import { HydrationTargetSheet } from './SettingsScreen';

const QUICK = [
  { label: 'Copo', amount: 250, size: 18 },
  { label: 'Caneca', amount: 350, size: 20 },
  { label: 'Garrafa', amount: 500, size: 22 },
  { label: 'Garrafa G', amount: 750, size: 26 },
];

function liters(ml: number) {
  return `${formatNumber(ml / 1000, 2)} L`;
}

export function HydrationScreen() {
  const { hydrationLogs, hydrationTargetMl } = useAppStore();
  const { pop } = useNavigation();
  const toast = useToast();
  const [targetOpen, setTargetOpen] = useState(false);
  const [custom, setCustom] = useState(300);

  const today = useMemo(
    () => itemsOnDay(hydrationLogs, hydrationDate, new Date()),
    [hydrationLogs],
  );
  const total = today.reduce((sum, log) => sum + log.amountMl, 0);
  const percent = goalPercent(total, hydrationTargetMl);
  const remaining = Math.max(0, hydrationTargetMl - total);
  const week = useMemo(() => {
    const first = addDays(startOfDay(new Date()), -6);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(first, i);
      return {
        key: day.toISOString(),
        label: day
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', ''),
        value: itemsOnDay(hydrationLogs, hydrationDate, day).reduce(
          (sum, log) => sum + log.amountMl,
          0,
        ),
      };
    });
  }, [hydrationLogs]);

  const add = (amount: number) => {
    if (!(amount > 0)) return;
    const log = actions.addHydration(amount);
    haptic('tap');
    const reached =
      total < hydrationTargetMl && total + amount >= hydrationTargetMl;
    toast({
      tone: reached ? 'record' : 'success',
      title: reached
        ? 'Meta de água concluída!'
        : `+${formatNumber(amount, 0)} ml`,
      action: {
        label: 'Desfazer',
        onPress: () => actions.removeHydration(log.id),
      },
    });
  };

  const remove = (log: HydrationLog) => {
    const removed = actions.removeHydration(log.id);
    if (!removed) return;
    toast({
      title: `${formatNumber(log.amountMl, 0)} ml removidos`,
      action: {
        label: 'Desfazer',
        onPress: () => actions.restoreHydration(removed),
      },
    });
  };

  return (
    <>
      <StackHeader
        title="Hidratação"
        onBack={pop}
        right={
          <IconButton
            icon={Settings2}
            label="Ajustar meta diária"
            onClick={() => setTargetOpen(true)}
          />
        }
      />
      <div className="app-column space-y-6 px-4 pt-6">
        <div className="flex flex-col items-center text-center">
          <ProgressRing
            value={percent}
            size={196}
            stroke={14}
            tone="water"
            label={`${percent}% da meta de água de hoje`}
          >
            <div>
              <Droplet
                size={22}
                className="mx-auto text-water"
                aria-hidden="true"
              />
              <p className="font-metric text-metric-lg mt-1">{liters(total)}</p>
              <p className="text-footnote text-ink-2">
                de {liters(hydrationTargetMl)}
              </p>
            </div>
          </ProgressRing>
          <p className="text-callout mt-4 text-ink-2" aria-live="polite">
            {remaining > 0 ? (
              <>
                Faltam{' '}
                <span className="font-semibold text-ink">
                  {formatNumber(remaining, 0)} ml
                </span>{' '}
                para a meta de hoje
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success-ink">
                <CheckCircle2 size={18} aria-hidden="true" /> Meta de hoje
                concluída
              </span>
            )}
          </p>
        </div>

        <section aria-labelledby="water-quick">
          <SectionHeader id="water-quick" title="Registrar" />
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((item) => (
              <button
                key={item.amount}
                type="button"
                onClick={() => add(item.amount)}
                className="pressable flex flex-col items-center gap-1.5 rounded-lg bg-surface py-3.5 active:bg-raised"
                aria-label={`Registrar ${item.label}, ${item.amount} ml`}
              >
                <span className="grid size-10 place-items-center rounded-full bg-water-soft text-water">
                  <Droplet size={item.size} aria-hidden="true" />
                </span>
                <span className="text-callout font-semibold tabular">
                  {item.amount} ml
                </span>
                <span className="text-caption text-ink-2">{item.label}</span>
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              add(custom);
            }}
          >
            <label className="relative flex-1">
              <span className="sr-only">Quantidade personalizada em ml</span>
              <NumericInput
                value={custom}
                max={3000}
                onValueChange={setCustom}
                className="text-body h-11 w-full rounded-md bg-raised pr-12 pl-3.5 font-semibold tabular outline-none focus:ring-2 focus:ring-brand-ink"
              />
              <span className="text-callout pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3">
                ml
              </span>
            </label>
            <Button
              type="submit"
              variant="secondary"
              icon={Plus}
              disabled={!(custom > 0)}
            >
              Adicionar
            </Button>
          </form>
        </section>

        <section aria-labelledby="water-today">
          <SectionHeader id="water-today" title={`Hoje (${today.length})`} />
          {today.length === 0 ? (
            <Card>
              <EmptyState
                icon={Droplet}
                title="Nenhum registro hoje"
                message="Toque em um dos atalhos acima a cada copo ou garrafa."
              />
            </Card>
          ) : (
            <Card as="div" className="divide-y divide-line">
              {today.map((log) => {
                const date = hydrationDate(log);
                return (
                  <div
                    key={log.id}
                    className="flex animate-fade-in items-center gap-3 py-2 pr-2 pl-4"
                  >
                    <Droplet
                      size={18}
                      className="text-water"
                      aria-hidden="true"
                    />
                    <span className="text-body flex-1 font-medium tabular">
                      +{formatNumber(log.amountMl, 0)} ml
                    </span>
                    <span className="text-footnote text-ink-2 tabular">
                      {date ? formatTime(date.toISOString()) : log.timestamp}
                    </span>
                    <IconButton
                      icon={Trash2}
                      label={`Remover ${log.amountMl} ml`}
                      size="sm"
                      variant="danger"
                      onClick={() => remove(log)}
                    />
                  </div>
                );
              })}
            </Card>
          )}
        </section>

        <section aria-labelledby="water-week">
          <SectionHeader id="water-week" title="Últimos 7 dias" />
          <Card className="p-4">
            <BarChart
              data={week}
              label="Água consumida por dia nos últimos 7 dias"
              formatValue={liters}
              formatTick={(value) => `${formatNumber(value / 1000)} L`}
              emptyMessage="Sem registros na semana"
            />
          </Card>
        </section>
      </div>
      <HydrationTargetSheet
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
      />
    </>
  );
}
