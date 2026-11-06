import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { UPDATE_TIMEOUT_MS, UPDATE_URL } from '@/config';
import { CheckResult, UpdateInfo, evaluate } from '@/logic/updates';
import { appVersion, appVersionCode } from '@/version';

type UpdatesValue = {
  // Есть новая версия: приложение закрыто панелью, пока пользователь не обновится.
  required: UpdateInfo | null;
  checkNow: () => Promise<CheckResult>;
};

const UpdatesContext = createContext<UpdatesValue | null>(null);

export function useUpdates(): UpdatesValue {
  const value = useContext(UpdatesContext);
  if (!value) throw new Error('useUpdates outside UpdatesProvider');
  return value;
}

async function fetchCheck(): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);
  try {
    // Только GET без заголовков и данных пользователя.
    const response = await fetch(UPDATE_URL, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) return { status: 'error' };
    return evaluate(await response.json(), appVersionCode, appVersion);
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

// Проверка при запуске и при возврате в приложение. Ошибки и отсутствие сети молчат.
export function UpdatesProvider({ children }: { children: ReactNode }) {
  const [required, setRequired] = useState<UpdateInfo | null>(null);
  const busy = useRef(false);

  const checkNow = useCallback(async (): Promise<CheckResult> => {
    const result = await fetchCheck();
    if (result.status === 'update') setRequired(result.info);
    return result;
  }, []);

  useEffect(() => {
    const run = () => {
      if (busy.current) return;
      busy.current = true;
      checkNow().finally(() => {
        busy.current = false;
      });
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [checkNow]);

  const value = useMemo(() => ({ required, checkNow }), [required, checkNow]);
  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}
