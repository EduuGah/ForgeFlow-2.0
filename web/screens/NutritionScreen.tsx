import { useMemo, useState } from 'react';
import { Plus, Settings2, Trash2, Utensils } from 'lucide-react';
import { actions, useAppStore } from '../store';
import { formatNumber, formatTime } from '../lib/format';
import { goalPercent, itemsOnDay, mealDate } from '../lib/training';
import type { MealItem, MealType } from '../lib/types';
import { useNavigation } from '../navigation/Navigator';
import { Button, IconButton } from '../ui/Button';
import {
  EmptyState,
  ProgressBar,
  ProgressRing,
  type ProgressTone,
} from '../ui/Feedback';
import { NumberField, SegmentedControl, TextField } from '../ui/Form';
import { Card, StackHeader } from '../ui/Layout';
import { Sheet, useToast } from '../ui/Overlay';
import { SwipeToDelete } from '../ui/Swipe';
import { NutritionTargetSheet } from './SettingsScreen';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

function mealTypeForNow(): MealType {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

export function NutritionScreen() {
  const store = useAppStore();
  const {
    meals,
    nutritionTargetKcal,
    nutritionTargetProtein,
    nutritionTargetCarbs,
    nutritionTargetFat,
  } = store;
  const { pop } = useNavigation();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);

  const today = useMemo(() => itemsOnDay(meals, mealDate, new Date()), [meals]);
  const totals = today.reduce(
    (sum, meal) => ({
      kcal: sum.kcal + meal.kcal,
      protein: sum.protein + meal.proteinG,
      carbs: sum.carbs + meal.carbsG,
      fat: sum.fat + meal.fatG,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const kcalPercent = goalPercent(totals.kcal, nutritionTargetKcal);
  const remaining = nutritionTargetKcal - totals.kcal;

  const macros: {
    label: string;
    value: number;
    target: number;
    tone: ProgressTone;
  }[] = [
    {
      label: 'Proteína',
      value: totals.protein,
      target: nutritionTargetProtein,
      tone: 'protein',
    },
    {
      label: 'Carboidratos',
      value: totals.carbs,
      target: nutritionTargetCarbs,
      tone: 'carbs',
    },
    {
      label: 'Gordura',
      value: totals.fat,
      target: nutritionTargetFat,
      tone: 'fat',
    },
  ];

  const remove = (meal: MealItem) => {
    const removed = actions.removeMeal(meal.id);
    if (!removed) return;
    toast({
      title: `${meal.name} removido`,
      action: {
        label: 'Desfazer',
        onPress: () => actions.restoreMeal(removed),
      },
    });
  };

  return (
    <>
      <StackHeader
        title="Nutrição"
        onBack={pop}
        right={
          <>
            <IconButton
              icon={Settings2}
              label="Metas de nutrição"
              onClick={() => setTargetsOpen(true)}
            />
            <IconButton
              icon={Plus}
              label="Registrar refeição"
              onClick={() => setAdding(true)}
            />
          </>
        }
      />
      <div className="app-column space-y-6 px-4 pt-5">
        <Card className="p-4">
          <div className="flex items-center gap-5">
            <ProgressRing
              value={kcalPercent}
              size={112}
              stroke={10}
              tone="brand"
              label={`${kcalPercent}% da meta de calorias`}
            >
              <div>
                <p className="font-metric text-metric-sm">
                  {formatNumber(totals.kcal, 0)}
                </p>
                <p className="text-caption text-ink-2">kcal</p>
              </div>
            </ProgressRing>
            <div className="min-w-0 space-y-1">
              <p className="text-caption text-ink-2">Meta diária</p>
              <p className="text-headline font-semibold tabular">
                {formatNumber(nutritionTargetKcal, 0)} kcal
              </p>
              <p
                className={
                  remaining >= 0
                    ? 'text-callout text-ink-2'
                    : 'text-callout text-warmup'
                }
              >
                {remaining >= 0
                  ? `Restam ${formatNumber(remaining, 0)} kcal`
                  : `${formatNumber(-remaining, 0)} kcal acima da meta`}
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 border-t border-line pt-4" role="list">
            {macros.map((macro) => (
              <li key={macro.label}>
                <div className="text-callout mb-1.5 flex items-baseline justify-between">
                  <span>{macro.label}</span>
                  <span className="text-ink-2 tabular">
                    <span className="font-semibold text-ink">
                      {formatNumber(macro.value, 0)}
                    </span>{' '}
                    / {formatNumber(macro.target, 0)} g
                  </span>
                </div>
                <ProgressBar
                  value={goalPercent(macro.value, macro.target)}
                  tone={macro.tone}
                  label={`${macro.label}: ${goalPercent(macro.value, macro.target)}% da meta`}
                />
              </li>
            ))}
          </ul>
        </Card>

        {today.length === 0 ? (
          <Card>
            <EmptyState
              icon={Utensils}
              title="Nenhuma refeição hoje"
              message="Registre calorias e macros para acompanhar sua alimentação."
              action={
                <Button icon={Plus} onClick={() => setAdding(true)}>
                  Registrar refeição
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            {MEAL_ORDER.map((type) => {
              const items = today.filter((meal) => meal.mealType === type);
              if (items.length === 0) return null;
              const kcal = items.reduce((sum, meal) => sum + meal.kcal, 0);
              return (
                <section key={type} aria-label={MEAL_LABELS[type]}>
                  <div className="flex min-h-11 items-center justify-between">
                    <h2 className="text-headline font-semibold">
                      {MEAL_LABELS[type]}
                    </h2>
                    <span className="text-callout text-ink-2 tabular">
                      {formatNumber(kcal, 0)} kcal
                    </span>
                  </div>
                  <Card
                    as="div"
                    className="divide-y divide-line overflow-hidden"
                  >
                    {items.map((meal) => {
                      const date = mealDate(meal);
                      return (
                        <SwipeToDelete
                          key={meal.id}
                          onDelete={() => remove(meal)}
                        >
                          <div className="flex animate-fade-in items-center gap-3 py-3 pr-2 pl-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-body truncate font-medium">
                                {meal.name}
                              </p>
                              <p className="text-footnote text-ink-2 tabular">
                                {date
                                  ? formatTime(date.toISOString())
                                  : meal.consumedAt}{' '}
                                · P {meal.proteinG}g · C {meal.carbsG}g · G{' '}
                                {meal.fatG}g
                              </p>
                            </div>
                            <span className="text-callout font-semibold tabular">
                              {formatNumber(meal.kcal, 0)} kcal
                            </span>
                            <IconButton
                              icon={Trash2}
                              label={`Remover ${meal.name}`}
                              size="sm"
                              variant="danger"
                              onClick={() => remove(meal)}
                            />
                          </div>
                        </SwipeToDelete>
                      );
                    })}
                  </Card>
                </section>
              );
            })}
            <Button
              variant="secondary"
              size="lg"
              block
              icon={Plus}
              onClick={() => setAdding(true)}
            >
              Registrar refeição
            </Button>
          </>
        )}
      </div>
      <AddMealSheet open={adding} onClose={() => setAdding(false)} />
      <NutritionTargetSheet
        open={targetsOpen}
        onClose={() => setTargetsOpen(false)}
      />
    </>
  );
}

function AddMealSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealType>(mealTypeForNow);
  const [kcal, setKcal] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName('');
      setMealType(mealTypeForNow());
      setKcal(0);
      setProtein(0);
      setCarbs(0);
      setFat(0);
      setSubmitted(false);
    }
  }

  const fromMacros = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const nameError =
    submitted && !name.trim() ? 'Descreva a refeição.' : undefined;

  const save = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    actions.addMeal({
      name: name.trim(),
      mealType,
      kcal: kcal > 0 ? kcal : fromMacros,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
    });
    toast({
      tone: 'success',
      title: 'Refeição registrada',
      description: name.trim(),
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar refeição"
      footer={
        <Button size="lg" block onClick={save}>
          Salvar refeição
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label="O que você comeu?"
          value={name}
          maxLength={120}
          placeholder="Ex.: Arroz, feijão e frango"
          onChange={(event) => setName(event.target.value)}
          error={nameError}
        />
        <div>
          <p className="text-footnote mb-1.5 font-medium text-ink-2">
            Refeição
          </p>
          <SegmentedControl
            label="Tipo de refeição"
            value={mealType}
            onChange={setMealType}
            options={MEAL_ORDER.map((value) => ({
              value,
              label: MEAL_LABELS[value],
            }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Proteína"
            suffix="g"
            value={protein}
            max={500}
            onValueChange={setProtein}
          />
          <NumberField
            label="Carbos"
            suffix="g"
            value={carbs}
            max={800}
            onValueChange={setCarbs}
          />
          <NumberField
            label="Gordura"
            suffix="g"
            value={fat}
            max={300}
            onValueChange={setFat}
          />
        </div>
        <NumberField
          label="Calorias"
          suffix="kcal"
          value={kcal}
          zeroAsEmpty
          placeholder={fromMacros > 0 ? String(fromMacros) : '0'}
          max={5000}
          onValueChange={setKcal}
          hint={
            fromMacros > 0 && kcal === 0
              ? `Em branco, usamos ${fromMacros} kcal calculadas pelos macros.`
              : undefined
          }
        />
      </form>
    </Sheet>
  );
}
