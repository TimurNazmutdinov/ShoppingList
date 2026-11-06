import { buildMonth, cardDateLabel, dayMarks, effectiveDate, groupByList, monthRange, splitDue } from '@/logic/schedule';
import { Category, categoryName, groupByCategory } from '@/logic/categories';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 6, 12)); // 6 ноября 2026
});
afterEach(() => jest.useRealTimers());

describe('effectiveDate', () => {
  it('своя дата главнее даты списка', () => {
    expect(effectiveDate('2026-11-08', '2026-11-10')).toBe('2026-11-08');
    expect(effectiveDate(null, '2026-11-10')).toBe('2026-11-10');
    expect(effectiveDate(null, null)).toBeNull();
  });
});

describe('buildMonth', () => {
  it('ноябрь 2026: 1-е — воскресенье, неделя с понедельника', () => {
    const weeks = buildMonth(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks.at(-1)?.includes('2026-11-30')).toBe(true);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('февраль високосного года — 29 дней', () => {
    expect(buildMonth(2028, 1).flat().filter(Boolean)).toHaveLength(29);
  });

  it('monthRange', () => {
    expect(monthRange(2026, 11)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('dayMarks', () => {
  it('цвета без повторов, не больше трёх', () => {
    const marks = dayMarks([
      { date: '2026-11-06', color: 'a' }, { date: '2026-11-06', color: 'a' }, { date: '2026-11-06', color: 'b' },
      { date: '2026-11-06', color: 'c' }, { date: '2026-11-06', color: 'd' },
    ]);
    expect(marks.get('2026-11-06')).toEqual(['a', 'b', 'c']);
  });
});

describe('cardDateLabel', () => {
  it('сегодня, завтра и обычная дата', () => {
    expect(cardDateLabel('2026-11-06', 'сегодня', 'завтра')).toBe('сегодня');
    expect(cardDateLabel('2026-11-07', 'сегодня', 'завтра')).toBe('завтра');
    expect(cardDateLabel('2026-11-08', 'сегодня', 'завтра')).toBe('вс, 8 ноя');
  });
});

describe('splitDue', () => {
  it('на сегодня и с прошлых дней', () => {
    const r = splitDue([{ effectiveDate: '2026-11-04' }, { effectiveDate: '2026-11-06' }, { effectiveDate: '2026-11-05' }], '2026-11-06');
    expect(r.today).toHaveLength(1);
    expect(r.overdue).toHaveLength(2);
  });
});

describe('категории', () => {
  const cats: Category[] = [
    { id: 1, key: 'veg', title: null, color: 'green', sort: 1 },
    { id: 2, key: 'dairy', title: null, color: 'sky', sort: 2 },
    { id: 9, key: null, title: 'Для кошки', color: 'slate', sort: 9 },
  ];

  it('группы по порядку категорий, без категории — в конце, пустые не показываем', () => {
    const items = [
      { id: 1, categoryId: 2 }, { id: 2, categoryId: null }, { id: 3, categoryId: 1 }, { id: 4, categoryId: 2 }, { id: 5, categoryId: 777 },
    ];
    const groups = groupByCategory(items, cats);
    expect(groups.map((g) => g.category?.id ?? null)).toEqual([1, 2, null]);
    expect(groups[1].items.map((i) => i.id)).toEqual([1, 4]);
    expect(groups[2].items.map((i) => i.id)).toEqual([2, 5]);
  });

  it('названия: встроенная — из словаря, своя — как есть', () => {
    expect(categoryName(cats[0])).toBe('Овощи и фрукты');
    expect(categoryName(cats[2])).toBe('Для кошки');
  });
});

describe('groupByList', () => {
  const row = (id: number, listId: number, listTitle: string) => ({ id, listId, listTitle, listColor: 'green' });

  test('товары собираются по спискам, порядок сохраняется', () => {
    const groups = groupByList([row(1, 10, 'Продукты'), row(2, 20, 'Хозтовары'), row(3, 10, 'Продукты'), row(4, 20, 'Хозтовары')]);
    expect(groups.map((g) => [g.listId, g.items.map((x) => x.id)])).toEqual([[10, [1, 3]], [20, [2, 4]]]);
    expect(groups[0]).toMatchObject({ title: 'Продукты', color: 'green' });
  });

  test('пусто → пусто', () => {
    expect(groupByList([])).toEqual([]);
  });
});
