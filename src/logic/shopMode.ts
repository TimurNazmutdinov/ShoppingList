import { listTotals } from './money';

// Подсчёт для режима «В магазине»: «Осталось N из M», полоса, «ещё на X ₸», итог в конце.
export type ShopProgress = {
  total: number; // всего товаров
  bought: number;
  left: number; // осталось купить
  ratio: number; // доля купленного: 0…1
  leftPrice: number; // сумма цен того, что ещё не куплено
  sum: number; // сумма цен всех товаров
  done: boolean; // всё куплено (в пустом списке — нет)
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function shopProgress(items: readonly { price: number | null; boughtAt: string | null }[]): ShopProgress {
  const total = items.length;
  const bought = items.filter((i) => i.boughtAt !== null).length;
  const totals = listTotals(items);
  return {
    total,
    bought,
    left: total - bought,
    ratio: total === 0 ? 0 : bought / total,
    leftPrice: cents(totals.left),
    sum: cents(totals.total),
    done: total > 0 && bought === total,
  };
}
