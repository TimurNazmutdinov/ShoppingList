/** @jest-environment node */
import { getDb, initDb } from '@/db';
import { createList, rememberLastList, resolveShortcut } from '@/logic/shopping';
import { SHORTCUT_ACTIONS, isShortcutAction, isShortcutUrl, shortcutTarget, shortcutUri } from '@/logic/shortcuts';

jest.mock('expo-sqlite', () => jest.requireActual('./helpers/fakeSqlite'));

beforeAll(async () => {
  await initDb();
});

beforeEach(async () => {
  await getDb().execAsync('DELETE FROM items; DELETE FROM lists; DELETE FROM settings;');
});

describe('ярлыки: ссылки', () => {
  it('три действия, ссылка shoppinglist://shortcut/<действие>', () => {
    expect(SHORTCUT_ACTIONS).toEqual(['add', 'today', 'new']);
    expect(shortcutUri('add')).toBe('shoppinglist://shortcut/add');
    expect(shortcutUri('new')).toBe('shoppinglist://shortcut/new');
  });

  it('вход через ярлык узнаётся по ссылке; обычный запуск и чужие ссылки — нет', () => {
    expect(isShortcutUrl('shoppinglist://shortcut/today')).toBe(true);
    expect(isShortcutUrl('SHOPPINGLIST://shortcut/add')).toBe(true);
    expect(isShortcutUrl('shoppinglist://list/5')).toBe(false);
    expect(isShortcutUrl('https://example.com/shortcut/add')).toBe(false);
    expect(isShortcutUrl(null)).toBe(false);
    expect(isShortcutUrl(undefined)).toBe(false);
  });

  it('неизвестное действие не проходит', () => {
    expect(isShortcutAction('add')).toBe(true);
    expect(isShortcutAction('delete')).toBe(false);
    expect(isShortcutAction(undefined)).toBe(false);
  });
});

describe('ярлыки: куда вести', () => {
  it('«Добавить товар»: последний открытый список', () => {
    expect(shortcutTarget('add', 7, [3, 7, 9])).toEqual({ kind: 'list', id: 7 });
  });

  it('последнего списка уже нет — первый из имеющихся', () => {
    expect(shortcutTarget('add', 99, [3, 7])).toEqual({ kind: 'list', id: 3 });
    expect(shortcutTarget('add', null, [4])).toEqual({ kind: 'list', id: 4 });
  });

  it('списков нет — новый список', () => {
    expect(shortcutTarget('add', null, [])).toEqual({ kind: 'newList' });
    expect(shortcutTarget('add', 5, [])).toEqual({ kind: 'newList' });
  });

  it('«Сегодня» и «Новый список» не зависят от списков', () => {
    expect(shortcutTarget('today', 7, [7])).toEqual({ kind: 'today' });
    expect(shortcutTarget('new', 7, [7])).toEqual({ kind: 'newList' });
  });
});

describe('ярлыки: последний открытый список в БД', () => {
  it('запоминается и находится; удалённый список — берём первый', async () => {
    const a = await createList('Первый', 'green');
    const b = await createList('Второй', 'green');
    await rememberLastList(b);
    expect(await resolveShortcut('add')).toEqual({ kind: 'list', id: b });
    await getDb().runAsync('DELETE FROM lists WHERE id = ?', b);
    expect(await resolveShortcut('add')).toEqual({ kind: 'list', id: a });
  });

  it('ничего не открывали — первый список; списков нет — новый', async () => {
    expect(await resolveShortcut('add')).toEqual({ kind: 'newList' });
    const a = await createList('Единственный', 'green');
    expect(await resolveShortcut('add')).toEqual({ kind: 'list', id: a });
  });
});
