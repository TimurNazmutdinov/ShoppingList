import { copyTitle, selectForCopy } from '@/logic/copy';

describe('copyTitle', () => {
  it('добавляет «(копия)» и не дублирует', () => {
    expect(copyTitle('Продукты', 'копия')).toBe('Продукты (копия)');
    expect(copyTitle(' Продукты (копия) ', 'копия')).toBe('Продукты (копия)');
  });
});

describe('selectForCopy', () => {
  const items = [
    { id: 1, boughtAt: null },
    { id: 2, boughtAt: '2026-11-05T10:00:00.000Z' },
    { id: 3, boughtAt: null },
  ];
  it('все / не купленные / ничего', () => {
    expect(selectForCopy(items, 'all')).toEqual([1, 2, 3]);
    expect(selectForCopy(items, 'unbought')).toEqual([1, 3]);
    expect(selectForCopy(items, 'none')).toEqual([]);
  });
});
