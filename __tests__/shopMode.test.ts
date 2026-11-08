import { shopProgress } from '@/logic/shopMode';

const open = (price: number | null = null) => ({ price, boughtAt: null });
const done = (price: number | null = null) => ({ price, boughtAt: '2026-11-08T10:00:00.000Z' });

describe('режим «В магазине»: подсчёт', () => {
  it('«Осталось N из M» и полоса', () => {
    const p = shopProgress([open(), open(), done(), done(), done()]);
    expect(p).toMatchObject({ total: 5, bought: 3, left: 2, ratio: 0.6, done: false });
  });

  it('«ещё на X»: сумма цен того, что не куплено; сумма всего — для итога', () => {
    const p = shopProgress([open(450), open(1900), done(250), open(null)]);
    expect(p.leftPrice).toBe(2350);
    expect(p.sum).toBe(2600);
  });

  it('нет цен — суммы нулевые (экран не показывает «ещё на»)', () => {
    expect(shopProgress([open(), done()])).toMatchObject({ leftPrice: 0, sum: 0 });
  });

  it('всё куплено: done, полоса полная, «ещё на» нет', () => {
    const p = shopProgress([done(450), done(100.5)]);
    expect(p).toMatchObject({ total: 2, bought: 2, left: 0, ratio: 1, done: true, leftPrice: 0, sum: 550.5 });
  });

  it('пустой список — не «всё купили»', () => {
    expect(shopProgress([])).toEqual({ total: 0, bought: 0, left: 0, ratio: 0, leftPrice: 0, sum: 0, done: false });
  });

  it('копейки без артефактов float', () => {
    expect(shopProgress([open(0.1), open(0.2), done(0.3)]).leftPrice).toBe(0.3);
    expect(shopProgress([open(0.1), open(0.2)]).sum).toBe(0.3);
  });

  it('вернули товар из купленного — снова не done', () => {
    const items = [done(100), done(200)];
    expect(shopProgress(items).done).toBe(true);
    expect(shopProgress([items[0], { price: 200, boughtAt: null }])).toMatchObject({ done: false, left: 1, leftPrice: 200 });
  });
});
