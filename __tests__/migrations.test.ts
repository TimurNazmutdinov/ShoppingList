/** @jest-environment node */
import initSqlJs, { Database } from 'sql.js';
import { MIGRATIONS, MigrationDb, MigrationError, runMigrations } from '@/db/migrations';

function adapter(db: Database): MigrationDb {
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    getUserVersion: async () => Number(db.exec('PRAGMA user_version')[0].values[0][0]),
  };
}

function rows(db: Database, sql: string) {
  const res = db.exec(sql);
  return res.length ? res[0].values : [];
}

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => {
  SQL = await initSqlJs();
});

const NOW = '2026-11-06T09:00:00.000Z';

describe('миграции', () => {
  it('v4: цена у товаров и в истории необязательна, старые данные целы', async () => {
    const db = new SQL.Database();
    for (let i = 0; i < 3; i++) db.exec(MIGRATIONS[i]);
    db.exec('PRAGMA user_version = 3');
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Список', '${NOW}')`);
    db.exec(`INSERT INTO items (list_id, title, qty, unit, created_at) VALUES (1, 'Молоко', 1, 'l', '${NOW}')`);
    db.exec(`INSERT INTO history (title_norm, title, last_used_at) VALUES ('молоко', 'Молоко', '${NOW}')`);
    await runMigrations(adapter(db));
    expect(rows(db, 'SELECT title, qty, unit, price FROM items')).toEqual([['Молоко', 1, 'l', null]]);
    expect(rows(db, 'SELECT title, price FROM history')).toEqual([['Молоко', null]]);
    db.exec("UPDATE items SET price = 450.5");
    expect(rows(db, 'SELECT price FROM items')).toEqual([[450.5]]);
  });

  it('v3: восемь встроенных категорий по ключам, повторный запуск их не дублирует', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    expect(rows(db, 'SELECT key FROM categories ORDER BY sort').map((r) => r[0])).toEqual([
      'veg', 'dairy', 'bread', 'meat', 'grocery', 'drinks', 'household', 'other',
    ]);
    db.exec(MIGRATIONS[2]);
    expect(rows(db, 'SELECT COUNT(*) FROM categories')).toEqual([[8]]);
  });

  it('БД версии 2 с товарами → версия 3: товары целы, категории добавлены', async () => {
    const db = new SQL.Database();
    db.exec(MIGRATIONS[0]);
    db.exec(MIGRATIONS[1]);
    db.exec('PRAGMA user_version = 2');
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Список', '${NOW}')`);
    db.exec(`INSERT INTO items (list_id, title, created_at) VALUES (1, 'Соль', '${NOW}')`);
    await runMigrations(adapter(db));
    expect(rows(db, 'SELECT title, category_id FROM items')).toEqual([['Соль', null]]);
    expect(rows(db, 'SELECT COUNT(*) FROM categories')).toEqual([[8]]);
  });

  it('пустая БД → последняя версия, таблицы и индексы на месте', async () => {
    const db = new SQL.Database();
    const version = await runMigrations(adapter(db));
    expect(version).toBe(MIGRATIONS.length);
    expect(Number(rows(db, 'PRAGMA user_version')[0][0])).toBe(MIGRATIONS.length);

    const names = rows(db, "SELECT name FROM sqlite_master WHERE type IN ('table','index')").map((r) => r[0]);
    expect(names).toEqual(
      expect.arrayContaining(['lists', 'items', 'categories', 'history', 'settings', 'idx_items_list', 'idx_items_planned', 'idx_items_bought']),
    );
  });

  it('товар можно сохранить только с названием: остальные поля необязательны', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Продукты', '${NOW}')`);
    db.exec(`INSERT INTO items (list_id, title, created_at) VALUES (1, 'Соль', '${NOW}')`);
    expect(rows(db, 'SELECT title, qty, unit, category_id, planned_date, remind, bought_at FROM items')).toEqual([
      ['Соль', null, null, null, null, 0, null],
    ]);
  });

  it('история запоминает параметры последней покупки (гречка 0,8 кг)', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    db.exec(`INSERT INTO history (title_norm, title, qty, unit, last_used_at) VALUES ('гречка', 'Гречка', 0.8, 'кг', '${NOW}')`);
    expect(rows(db, "SELECT title, qty, unit, used_count FROM history WHERE title_norm = 'гречка'")).toEqual([
      ['Гречка', 0.8, 'кг', 1],
    ]);
  });

  it('удаление списка удаляет его товары, а история остаётся', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Продукты', '${NOW}')`);
    db.exec(`INSERT INTO items (list_id, title, created_at) VALUES (1, 'Молоко', '${NOW}')`);
    db.exec(`INSERT INTO history (title_norm, title, last_used_at) VALUES ('молоко', 'Молоко', '${NOW}')`);
    db.exec('DELETE FROM lists WHERE id = 1');
    expect(rows(db, 'SELECT COUNT(*) FROM items')).toEqual([[0]]);
    expect(rows(db, 'SELECT COUNT(*) FROM history')).toEqual([[1]]);
  });

  it('БД версии 1 (без индексов) → последняя версия, данные на месте', async () => {
    const db = new SQL.Database();
    db.exec(MIGRATIONS[0]);
    db.exec('PRAGMA user_version = 1');
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Хозтовары', '${NOW}')`);
    db.exec(`INSERT INTO items (list_id, title, qty, unit, created_at) VALUES (1, 'Порошок', 1, 'уп', '${NOW}')`);

    await runMigrations(adapter(db));

    expect(Number(rows(db, 'PRAGMA user_version')[0][0])).toBe(MIGRATIONS.length);
    expect(rows(db, 'SELECT title, qty, unit FROM items')).toEqual([['Порошок', 1, 'уп']]);
    const idx = rows(db, "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'").map((r) => r[0]);
    expect(idx).toHaveLength(4);
  });

  it('повторный запуск ничего не ломает', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Список', '${NOW}')`);
    await runMigrations(adapter(db));
    expect(rows(db, 'SELECT COUNT(*) FROM lists')).toEqual([[1]]);
  });

  it('ошибка в шаге → откат этого шага, данные и версия целы, понятная ошибка', async () => {
    const db = new SQL.Database();
    await runMigrations(adapter(db));
    db.exec(`INSERT INTO lists (title, created_at) VALUES ('Список', '${NOW}')`);

    const broken = [...MIGRATIONS, 'CREATE TABLE half_done (id INTEGER); INSERT INTO no_such_table VALUES (1);'];
    await expect(runMigrations(adapter(db), broken)).rejects.toBeInstanceOf(MigrationError);

    expect(Number(rows(db, 'PRAGMA user_version')[0][0])).toBe(MIGRATIONS.length);
    expect(rows(db, "SELECT name FROM sqlite_master WHERE name = 'half_done'")).toEqual([]);
    expect(rows(db, 'SELECT title FROM lists')).toEqual([['Список']]);
  });

  it('MigrationError называет версию', async () => {
    const db = new SQL.Database();
    await expect(runMigrations(adapter(db), ['SELECT * FROM nope'])).rejects.toMatchObject({
      name: 'MigrationError',
      version: 1,
    });
  });
});
