import { CATALOG } from '@/logic/catalog';
import { Category } from '@/logic/categories';
import { DISHES, dishName, dishRows } from '@/logic/dishes';

const cats: Category[] = ['veg', 'dairy', 'bread', 'meat', 'grocery', 'drinks', 'household', 'other'].map((key, i) => ({
  id: i + 1, key, title: null, color: 'slate', sort: i + 1,
}));

describe('блюда', () => {
  it('у каждого блюда названия на трёх языках и продукты', () => {
    expect(DISHES.length).toBeGreaterThanOrEqual(8);
    for (const d of DISHES) {
      for (const n of d.names) expect(n.trim()).not.toBe('');
      expect(d.ingredients.length).toBeGreaterThan(3);
    }
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
  });

  it('все продукты блюд есть в каталоге (по русскому названию)', () => {
    const ru = new Set(CATALOG.map((e) => e[1]));
    for (const d of DISHES) for (const [name] of d.ingredients) expect(ru.has(name)).toBe(true);
  });

  it('плов: продукты на языке приложения с категориями и количеством', () => {
    const plov = DISHES.find((d) => d.id === 'plov')!;
    const ru = dishRows(plov, 'ru', cats);
    expect(ru[0]).toMatchObject({ title: 'Баранина', qty: 0.8, unit: 'kg', categoryId: 4 });
    const kk = dishRows(plov, 'kk', cats);
    expect(kk[1].title).toBe('Күріш');
    const en = dishRows(plov, 'en', cats);
    expect(en[1].title).toBe('Rice');
    expect(dishName(plov, 'kk')).toBe('Палау');
  });

  it('ключи строк уникальны', () => {
    const rows = dishRows(DISHES[0], 'ru', cats);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});
