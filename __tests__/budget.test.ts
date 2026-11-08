import { budgetStatus, parseBudget } from '@/logic/budget';

describe('бюджет списка', () => {
  it('в пределах: доля, остаток, превышения нет', () => {
    expect(budgetStatus(12500, 15000)).toEqual({ budget: 15000, total: 12500, ratio: 12500 / 15000, left: 2500, over: 0 });
  });

  it('больше бюджета: полоса полная, остатка нет, есть превышение', () => {
    expect(budgetStatus(17000, 15000)).toEqual({ budget: 15000, total: 17000, ratio: 1, left: 0, over: 2000 });
  });

  it('ровно в бюджет: остаток 0 и превышения нет', () => {
    expect(budgetStatus(15000, 15000)).toMatchObject({ ratio: 1, left: 0, over: 0 });
  });

  it('пустой список: полоса пустая, весь бюджет остался', () => {
    expect(budgetStatus(0, 5000)).toMatchObject({ ratio: 0, left: 5000, over: 0 });
  });

  it('копейки без артефактов float', () => {
    expect(budgetStatus(0.1 + 0.2, 1)).toMatchObject({ left: 0.7, over: 0 });
    expect(budgetStatus(1.1, 1)).toMatchObject({ left: 0, over: 0.1 });
  });

  it('нет бюджета (null, undefined, 0, отрицательный) → null', () => {
    expect(budgetStatus(100, null)).toBeNull();
    expect(budgetStatus(100, undefined)).toBeNull();
    expect(budgetStatus(100, 0)).toBeNull();
    expect(budgetStatus(100, -5)).toBeNull();
  });
});

describe('поле «Бюджет»', () => {
  it('число с пробелами и запятой', () => {
    expect(parseBudget('15 000')).toBe(15000);
    expect(parseBudget('12500,5')).toBe(12500.5);
  });

  it('пусто, ноль и не число → без бюджета', () => {
    expect(parseBudget('')).toBeNull();
    expect(parseBudget('   ')).toBeNull();
    expect(parseBudget('0')).toBeNull();
    expect(parseBudget('много')).toBeNull();
    expect(parseBudget('-100')).toBeNull();
  });
});
