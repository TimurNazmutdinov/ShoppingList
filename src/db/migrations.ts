// Миграции: шаг i (с нуля) поднимает БД до версии i + 1 (PRAGMA user_version).
// Уже выпущенные шаги не менять — только добавлять новые в конец.
export const MIGRATIONS: readonly string[] = [
  // v1: таблицы
  `
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'green',
    sort INTEGER NOT NULL DEFAULT 0,
    planned_date TEXT,
    remind INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT,
    title TEXT,
    color TEXT NOT NULL DEFAULT 'slate',
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    qty REAL,
    unit TEXT,
    note TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    planned_date TEXT,
    remind INTEGER NOT NULL DEFAULT 0,
    bought_at TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    title_norm TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    qty REAL,
    unit TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    used_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  `,
  // v2: индексы
  `
  CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);
  CREATE INDEX IF NOT EXISTS idx_items_planned ON items(planned_date);
  CREATE INDEX IF NOT EXISTS idx_items_bought ON items(bought_at);
  CREATE INDEX IF NOT EXISTS idx_history_last ON history(last_used_at);
  `,
  // v3: встроенные категории (названия — в i18n по ключу)
  `
  INSERT INTO categories (key, color, sort) SELECT 'veg', 'green', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'veg');
  INSERT INTO categories (key, color, sort) SELECT 'dairy', 'sky', 2 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'dairy');
  INSERT INTO categories (key, color, sort) SELECT 'bread', 'amber', 3 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'bread');
  INSERT INTO categories (key, color, sort) SELECT 'meat', 'red', 4 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'meat');
  INSERT INTO categories (key, color, sort) SELECT 'grocery', 'coral', 5 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'grocery');
  INSERT INTO categories (key, color, sort) SELECT 'drinks', 'teal', 6 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'drinks');
  INSERT INTO categories (key, color, sort) SELECT 'household', 'violet', 7 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'household');
  INSERT INTO categories (key, color, sort) SELECT 'other', 'slate', 8 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE key = 'other');
  `,
];

// Минимум, который нужен миграциям от БД (реализуют expo-sqlite и тест на sql.js).
export type MigrationDb = {
  exec(sql: string): Promise<void>;
  getUserVersion(): Promise<number>;
};

export class MigrationError extends Error {
  constructor(
    public readonly version: number,
    public readonly reason: unknown,
  ) {
    super(`Миграция до версии ${version} не выполнена: ${String(reason)}`);
    this.name = 'MigrationError';
  }
}

// Каждый шаг в своей транзакции. Ошибка → откат, данные остаются как были.
export async function runMigrations(
  db: MigrationDb,
  steps: readonly string[] = MIGRATIONS,
): Promise<number> {
  const current = await db.getUserVersion();
  for (let i = current; i < steps.length; i++) {
    const version = i + 1;
    await db.exec('BEGIN');
    try {
      await db.exec(steps[i]);
      await db.exec(`PRAGMA user_version = ${version}`);
      await db.exec('COMMIT');
    } catch (e) {
      try {
        await db.exec('ROLLBACK');
      } catch {
        // транзакция уже закрыта — откатывать нечего
      }
      throw new MigrationError(version, e);
    }
  }
  return Math.max(current, steps.length);
}
