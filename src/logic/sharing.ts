// Действия «Поделиться», резервная копия и импорт: собирают данные, форматируют и передают в системное меню.
import { StringKey, t } from '@/i18n';
import { loadExportDishes, loadExportHistory, loadExportLists, importExchange } from '@/db/exchange';
import { pickFileText, shareFile, sharePdf, shareText } from '@/sharing';
import { ExchangeFile, ExportCategory, FormatContext, buildFile, fileSafeName, listToHtml, listToText, parseFile } from './exchange';
import { formatLong } from './dates';
import { UNITS } from './history';

export type ShareKind = 'text' | 'file' | 'txt' | 'pdf';

const unitLabel = (u: string) => ((UNITS as readonly string[]).includes(u) ? t(`unitShort.${u}` as StringKey) : u);
const categoryName = (c: ExportCategory) => (c === null ? '' : 'key' in c ? t(`cat.${c.key}` as StringKey) : c.title);

export const formatContext = (symbol: string, plannedDate: string | null): FormatContext => ({
  symbol,
  unitLabel,
  categoryName,
  totalLabel: t('share.total'),
  dateLabel: plannedDate ? formatLong(plannedDate) : '',
});

export async function shareList(listId: number, kind: ShareKind, symbol: string): Promise<void> {
  const [list] = await loadExportLists(listId);
  if (!list) return;
  const ctx = formatContext(symbol, list.plannedDate);
  const name = fileSafeName(list.title);
  if (kind === 'text') await shareText(listToText(list, ctx));
  else if (kind === 'txt') await shareFile(`${name}.txt`, listToText(list, ctx), 'text/plain');
  else if (kind === 'pdf') await sharePdf(listToHtml(list, ctx), list.title);
  else await shareFile(`ShoppingList-${name}.json`, JSON.stringify(buildFile('list', [list], [], new Date())), 'application/json');
}

// Резервная копия: все списки, история покупок и свои блюда одним файлом.
export async function backupAll(): Promise<void> {
  const [lists, history, dishes] = await Promise.all([loadExportLists(), loadExportHistory(), loadExportDishes()]);
  const day = new Date().toISOString().slice(0, 10);
  await shareFile(`ShoppingList-backup-${day}.json`, JSON.stringify(buildFile('backup', lists, history, new Date(), dishes)), 'application/json');
}

export type PickResult = { status: 'cancel' } | { status: 'error'; reason: 'invalid' | 'newer' | 'empty' } | { status: 'ok'; file: ExchangeFile };

export async function pickExchangeFile(): Promise<PickResult> {
  const text = await pickFileText();
  if (text === null) return { status: 'cancel' };
  const parsed = parseFile(text);
  return parsed.ok ? { status: 'ok', file: parsed.file } : { status: 'error', reason: parsed.reason };
}

export const importExchangeFile = importExchange;
