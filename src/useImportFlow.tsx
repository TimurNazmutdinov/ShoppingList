import { ReactNode, useState } from 'react';
import { Alert } from 'react-native';
import { t } from '@/i18n';
import { useSettings } from '@/AppSettings';
import { ExchangeFile, countItems } from '@/logic/exchange';
import { importExchangeFile, pickExchangeFile } from '@/logic/sharing';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Импорт файла приложения: выбор файла → проверка → «Добавить N списков?» → добавление.
export function useImportFlow(onDone: () => void): { start: () => void; dialog: ReactNode } {
  const [pending, setPending] = useState<ExchangeFile | null>(null);
  const { setThemeMode, setAccent } = useSettings();

  const start = async () => {
    const result = await pickExchangeFile();
    if (result.status === 'cancel') return;
    if (result.status === 'error') {
      Alert.alert(t(result.reason === 'newer' ? 'import.newer' : result.reason === 'empty' ? 'import.empty' : 'import.invalid'));
      return;
    }
    setPending(result.file);
  };

  const confirm = async () => {
    const file = pending;
    setPending(null);
    if (!file) return;
    const done = await importExchangeFile(file);
    // резервная копия возвращает и тему с цветом
    if (file.settings?.themeMode) setThemeMode(file.settings.themeMode);
    if (file.settings?.accent) setAccent(file.settings.accent);
    onDone();
    Alert.alert(t('import.done', { lists: done.lists }));
  };

  const dialog = (
    <ConfirmDialog
      visible={pending !== null}
      title={t('import.confirmTitle')}
      message={pending ? t('import.confirmText', { lists: pending.lists.length, items: countItems(pending) }) : undefined}
      icon="download-outline"
      cancelLabel={t('common.cancel')}
      confirmLabel={t('import.confirmOk')}
      onCancel={() => setPending(null)}
      onConfirm={() => {
        confirm().catch((e) => {
          console.warn(e);
          Alert.alert(t('import.failed'));
        });
      }}
    />
  );

  return {
    start: () => {
      start().catch((e) => {
        console.warn(e);
        Alert.alert(t('import.readFailed'));
      });
    },
    dialog,
  };
}
