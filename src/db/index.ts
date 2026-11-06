import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'shoppinglist.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  const database = await SQLite.openDatabaseAsync(DB_NAME);
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(database);
  db = database;
  return database;
}

export function getDb():SQLite.SQLiteDatabase {
  if (!db) throw new Error('Database is not open yet');
  return db;
}

async function migrate(database: SQLite.SQLiteDatabase) {
  await runMigrations({
    exec: (sql) => database.execAsync(sql),
    getUserVersion: async () => {
      const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      return row?.user_version ?? 0;
    },
  });
}

const changeListeners = new Set<() => void>();

// Подписка на любые записи в списки и товары (нужна, чтобы пересчитать напоминания).
export function onDataChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

// Запись в БД + сигнал «данные изменились».
export async function write(sql: string, ...params: SQLite.SQLiteBindValue[]) {
  const result = await getDb().runAsync(sql, ...params);
  changeListeners.forEach((listener) => listener());
  return result;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await getDb().getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key,
  );
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await getDb().runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    key,
    JSON.stringify(value),
  );
}
