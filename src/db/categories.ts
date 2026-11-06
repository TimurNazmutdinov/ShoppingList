import { getDb, write } from './index';
import { Category } from '@/logic/categories';

type Row = { id: number; key: string | null; title: string | null; color: string; sort: number };

export async function loadCategories(): Promise<Category[]> {
  return getDb().getAllAsync<Row>('SELECT id, key, title, color, sort FROM categories ORDER BY sort, id');
}

// Своя категория: после встроенных, цвет по умолчанию.
export async function createCategory(title: string): Promise<number> {
  const res = await write(
    "INSERT INTO categories (key, title, color, sort) VALUES (NULL, ?, 'slate', (SELECT COALESCE(MAX(sort), 0) + 1 FROM categories))",
    title.trim(),
  );
  return res.lastInsertRowId;
}
