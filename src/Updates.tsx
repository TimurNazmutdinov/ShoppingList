import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { UPDATE_TIMEOUT_MS, UPDATE_URL } from '@/config';
import { loadUpdateSeen, saveUpdateSeen } from '@/db/updateSeen';
import { CheckResult, UpdateInfo, evaluate } from '@/logic/updates';
import { canDefer, deadlineLabel, registerSeen, shouldShowUpdate } from '@/logic/updateDefer';
import { appVersion, appVersionCode } from '@/version';

type UpdatesValue = {
  // Есть новая версия: приложение закрыто панелью, пока пользователь не обновится (или не нажмёт «Позже» — не дольше 3 суток).
  required: UpdateInfo | null;
  canDefer: boolean; // «Позже» ещё можно
  deadline: string; // последний день отсрочки: «11 ноября»
  postpone: () => void; // «Позже»
  checkNow: () => Promise<CheckResult>; // ручная проверка: экран обновления показывается всегда
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
  const [defer, setDefer] = useState({ can: false, deadline: '' });
  const postponed = useRef(false); // нажали «Позже»: автопроверки не показывают экран, пока отсрочка действует
  const busy = useRef(false);

  const check = useCallback(async (manual: boolean): Promise<CheckResult> => {
    const result = await fetchCheck();
    if (result.status === 'update') {
      const now = Date.now();
      const prev = await loadUpdateSeen().catch(() => null);
      const seen = registerSeen(prev, result.info.versionCode, now);
      if (seen !== prev) saveUpdateSeen(seen).catch((e) => console.warn(e));
      const deferrable = canDefer(seen, now);
      setDefer({ can: deferrable, deadline: deadlineLabel(seen) });
      if (shouldShowUpdate({ manual, postponed: postponed.current, deferrable })) {
        postponed.current = false;
        setRequired(result.info);
      }
    }
    return result;
  }, []);

  const checkNow = useCallback(() => check(true), [check]);

  const postpone = useCallback(() => {
    postponed.current = true;
    setRequired(null);
  }, []);

  useEffect(() => {
    const run = () => {
      if (busy.current) return;
      busy.current = true;
      check(false).finally(() => {
        busy.current = false;
      });
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [check]);

  const value = useMemo(
    () => ({ required, canDefer: defer.can, deadline: defer.deadline, postpone, checkNow }),
    [required, defer, postpone, checkNow],
  );
  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}
