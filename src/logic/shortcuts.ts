// Ярлыки на иконке приложения: «Добавить товар», «Сегодня», «Новый список» — ссылки shoppinglist://shortcut/<действие>.
export type ShortcutAction = 'add' | 'today' | 'new';
export const SHORTCUT_ACTIONS: readonly ShortcutAction[] = ['add', 'today', 'new'];

const PREFIX = 'shoppinglist://shortcut/';

export const shortcutUri = (action: ShortcutAction) => `${PREFIX}${action}`;

export function isShortcutAction(value: unknown): value is ShortcutAction {
  return typeof value === 'string' && (SHORTCUT_ACTIONS as readonly string[]).includes(value);
}

// Ссылка, с которой открыли приложение, — это ярлык? (Тогда заставку не показываем.)
export function isShortcutUrl(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.toLowerCase().startsWith(PREFIX);
}

// Куда вести. «Добавить товар» — последний открытый список (нет такого — первый; списков нет — новый список).
export type ShortcutTarget = { kind: 'list'; id: number } | { kind: 'newList' } | { kind: 'today' };

export function shortcutTarget(action: ShortcutAction, lastListId: number | null, listIds: readonly number[]): ShortcutTarget {
  if (action === 'today') return { kind: 'today' };
  if (action === 'new') return { kind: 'newList' };
  if (lastListId !== null && listIds.includes(lastListId)) return { kind: 'list', id: lastListId };
  if (listIds.length > 0) return { kind: 'list', id: listIds[0] };
  return { kind: 'newList' };
}
