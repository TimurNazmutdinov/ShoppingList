import {
  ExportList, FormatContext, buildFile, countItems, fileSafeName, listToHtml, listToText, parseFile, totalOf,
} from '@/logic/exchange';

const NBSP = String.fromCharCode(160);

const list: ExportList = {
  title: 'Продукты',
  color: 'green',
  plannedDate: '2026-11-08',
  items: [
    { title: 'Молоко', qty: 1, unit: 'l', price: 450, note: null, category: { key: 'dairy' }, plannedDate: null, bought: false },
    { title: 'Хлеб', qty: null, unit: null, price: 120, note: 'свежий', category: { key: 'bread' }, plannedDate: null, bought: true },
    { title: 'Корм <Мурка>', qty: 2, unit: 'pack', price: null, note: null, category: { title: 'Для кошки' }, plannedDate: null, bought: false },
  ],
};

const ctx: FormatContext = {
  symbol: '₸',
  unitLabel: (u) => ({ l: 'л', pack: 'уп' } as Record<string, string>)[u] ?? u,
  categoryName: (c) => (c === null ? '' : 'key' in c ? c.key : c.title),
  totalLabel: 'Итого',
  dateLabel: '8 ноября',
};

describe('файл приложения', () => {
  const file = buildFile('list', [list], [], new Date('2026-11-07T10:00:00.000Z'));

  it('круг: собрали → разобрали → то же самое', () => {
    const r = parseFile(JSON.stringify(file));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.file.lists).toEqual([list]);
      expect(r.file.kind).toBe('list');
      expect(countItems(r.file)).toBe(3);
    }
  });

  it('не наш файл, не JSON и пустой — отказ с причиной', () => {
    expect(parseFile('не json')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseFile('{"app":"Other","format":1,"lists":[]}')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseFile('[]')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseFile(JSON.stringify({ ...file, lists: [] }))).toEqual({ ok: false, reason: 'empty' });
  });

  it('файл из более новой версии приложения', () => {
    expect(parseFile(JSON.stringify({ ...file, format: 99 }))).toEqual({ ok: false, reason: 'newer' });
  });

  it('мусор в полях очищается: цвет, единица, цена, дата, категория', () => {
    const dirty = {
      app: 'ShoppingList', format: 1, kind: 'backup',
      lists: [{
        title: '  Список  ', color: 'neon', plannedDate: 'вчера',
        items: [
          { title: 'Товар', qty: -3, unit: 'бочка', price: -1, note: 5, category: { key: 'nope' }, plannedDate: '2026-13', bought: 'да' },
          { title: '   ' },
          'строка',
          { title: 'Ок', category: { title: 'Своя' } },
        ],
      }],
    };
    const r = parseFile(JSON.stringify(dirty));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const l = r.file.lists[0];
    expect(l).toMatchObject({ title: 'Список', color: 'green', plannedDate: null });
    expect(l.items).toHaveLength(2);
    expect(l.items[0]).toEqual({ title: 'Товар', qty: null, unit: null, price: null, note: null, category: null, plannedDate: null, bought: false });
    expect(l.items[1].category).toEqual({ title: 'Своя' });
    expect(r.file.kind).toBe('backup');
  });

  it('резервная копия: история тоже очищается', () => {
    const r = parseFile(JSON.stringify({ app: 'ShoppingList', format: 1, kind: 'backup', lists: [], history: [{ title: 'Гречка', qty: 0.8, unit: 'kg', price: 600, usedCount: 3 }, { title: '' }] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.file.history).toEqual([{ title: 'Гречка', qty: 0.8, unit: 'kg', price: 600, category: null, usedCount: 3 }]);
  });
});

describe('текст и имя файла', () => {
  it('текст для мессенджера: галочки, количество, цена, итог', () => {
    const text = listToText(list, ctx);
    expect(text.split('\n')).toEqual([
      'Продукты (8 ноября)',
      '',
      '☐ Молоко — 1 л — 450' + NBSP + '₸',
      '✓ Хлеб — 120' + NBSP + '₸',
      '☐ Корм <Мурка> — 2 уп',
      '',
      'Итого: 570' + NBSP + '₸',
    ]);
  });

  it('без цен итога нет, без даты скобок нет', () => {
    const plain = { ...list, items: [list.items[2]] };
    const text = listToText(plain, { ...ctx, dateLabel: '' });
    expect(text).toBe('Продукты\n\n☐ Корм <Мурка> — 2 уп');
    expect(totalOf(plain)).toBeNull();
    expect(totalOf(list)).toBe(570);
  });

  it('HTML: экранирование, категории, итог', () => {
    const html = listToHtml(list, ctx);
    expect(html).toContain('Корм &lt;Мурка&gt;');
    expect(html).not.toContain('<Мурка>');
    expect(html).toContain('<h2>dairy</h2>');
    expect(html).toContain('Итого: 570');
  });

  it('безопасное имя файла', () => {
    expect(fileSafeName('Закупки: 8/11?')).toBe('Закупки_ 8_11_');
    expect(fileSafeName('   ')).toBe('list');
  });
});
