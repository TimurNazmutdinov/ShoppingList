import { parsePrice } from './money';

// Бюджет списка сравнивается со всей суммой списка (купленное + осталось).
export type BudgetStatus = {
  budget: number;
  total: number;
  ratio: number; // доля бюджета, потраченная списком: 0…1 (больше бюджета — 1)
  left: number; // осталось в бюджете (0, если превышен)
  over: number; // на сколько превышен бюджет (0, если в пределах)
};

const cents = (n: number) => Math.round(n * 100) / 100;

// Нет бюджета (пусто или 0) → null: внизу списка остаётся только обычная сумма.
export function budgetStatus(total: number, budget: number | null | undefined): BudgetStatus | null {
  if (budget === null || budget === undefined || !(budget > 0)) return null;
  return {
    budget,
    total,
    ratio: Math.min(1, Math.max(0, total / budget)),
    left: cents(Math.max(0, budget - total)),
    over: cents(Math.max(0, total - budget)),
  };
}

// Поле «Бюджет» в окне списка: пусто, ноль и всё нечисловое → без бюджета.
export function parseBudget(input: string): number | null {
  const value = parsePrice(input);
  return value !== null && value > 0 ? value : null;
}
