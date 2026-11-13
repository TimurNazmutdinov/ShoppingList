import { CATALOG, findCatalog, matchCatalog } from '@/logic/catalog';
import { Category } from '@/logic/categories';
import { normTitle } from '@/logic/history';
import { languages } from '@/i18n';

const cats: Category[] = ['veg', 'dairy', 'bread', 'meat', 'grocery', 'drinks', 'household', 'other'].map((key, i) => ({
  id: i + 1, key, title: null, color: 'slate', sort: i + 1,
}));
const catId = (key: string) => cats.find((c) => c.key === key)?.id;

describe('каталог', () => {
  it('все названия заполнены на трёх языках, категории существуют, без повторов в языке', () => {
    const keys = new Set(cats.map((c) => c.key));
    for (const e of CATALOG) {
      expect(keys.has(e[0])).toBe(true);
      for (const name of e.slice(1)) expect(name.trim()).not.toBe('');
    }
    for (let i = 1; i <= 3; i++) {
      const names = CATALOG.map((e) => normTitle(e[i]));
      expect(new Set(names).size).toBe(names.length);
    }
    expect(languages).toHaveLength(3);
  });

  it('есть продукты, хозтовары и бытовая химия', () => {
    expect(CATALOG.some((e) => e[0] === 'household' && e[1] === 'Стиральный порошок')).toBe(true);
    expect(CATALOG.some((e) => e[0] === 'dairy' && e[1] === 'Молоко')).toBe(true);
    expect(CATALOG.length).toBeGreaterThan(80);
  });
});

describe('matchCatalog', () => {
  it('по первым буквам; категория подставляется', () => {
    const r = matchCatalog('мол', 'ru', cats);
    expect(r[0]).toMatchObject({ title: 'Молоко', categoryId: catId('dairy'), qty: null, unit: null });
  });

  it('по началу любого слова: «посуд» находит средства для посуды', () => {
    const titles = matchCatalog('посуд', 'ru', cats).map((r) => r.title);
    expect(titles).toContain('Средство для мытья посуды');
  });

  it('сначала совпадения с начала названия, потом по слову', () => {
    const titles = matchCatalog('масло', 'ru', cats).map((r) => r.title);
    expect(titles[0]).toBe('Масло сливочное');
    expect(titles).toContain('Масло растительное');
  });

  it('язык учитывается; регистр и ё не важны', () => {
    expect(matchCatalog('сү', 'kk', cats)[0].title).toBe('Сүт');
    expect(matchCatalog('MIL', 'en', cats)[0].title).toBe('Milk');
    // русские буквы вместо казахских и поиск по названию на другом языке
    expect(matchCatalog('сут', 'kk', cats)[0].title).toBe('Сүт');
    expect(matchCatalog('молоко', 'kk', cats)[0].title).toBe('Сүт');
    expect(matchCatalog('milk', 'ru', cats)[0].title).toBe('Молоко');
    expect(matchCatalog('свекл', 'ru', cats)).toHaveLength(1);
    expect(matchCatalog('свёкл', 'ru', cats)[0].title).toBe('Свёкла');
  });

  it('названия из истории пропускаются; пустой ввод и лимит', () => {
    expect(matchCatalog('мол', 'ru', cats, new Set(['молоко'])).map((r) => r.title)).not.toContain('Молоко');
    expect(matchCatalog('  ', 'ru', cats)).toEqual([]);
    expect(matchCatalog('к', 'ru', cats, new Set(), 3)).toHaveLength(3);
  });
});

describe('findCatalog', () => {
  it('точное совпадение даёт категорию, иначе null', () => {
    expect(findCatalog('  хлеб ', 'ru', cats)?.categoryId).toBe(catId('bread'));
    expect(findCatalog('Хлебушек', 'ru', cats)).toBeNull();
  });
});
