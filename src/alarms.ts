import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type AlarmsModule = {
  canScheduleExactAlarms(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openExactAlarmSettings(): void;
  openBatterySettings(): void;
  setLauncherIcon(key: string, all: string[]): void;
  setShortcuts(json: string): void;
};

// Локальный нативный модуль (modules/shoppinglist-alarms). В Expo Go и вне Android его нет:
// тогда состояние считаем нормальным, а кнопки ничего не делают.
const native: AlarmsModule | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<AlarmsModule>('ShoppingListAlarms') : null;

export function canScheduleExactAlarms(): boolean {
  try {
    return native ? native.canScheduleExactAlarms() : true;
  } catch (e) {
    console.warn('exact alarms', e);
    return true;
  }
}

export function isIgnoringBatteryOptimizations(): boolean {
  try {
    return native ? native.isIgnoringBatteryOptimizations() : true;
  } catch (e) {
    console.warn('battery', e);
    return true;
  }
}

export function openExactAlarmSettings(): void {
  native?.openExactAlarmSettings();
}

export function openBatterySettings(): void {
  native?.openBatterySettings();
}

// Ярлыки по долгому нажатию на иконку: подписи на языке приложения, ссылки вида shoppinglist://shortcut/<id>.
export function setShortcuts(items: { id: string; label: string; uri: string }[]): void {
  try {
    native?.setShortcuts(JSON.stringify(items));
  } catch (e) {
    console.warn('shortcuts', e);
  }
}

// Включает иконку рабочего стола: key — 'default' или ключ профиля, all — все возможные ключи.
export function setLauncherIcon(key: string, all: string[]): void {
  try {
    native?.setLauncherIcon(key, all);
  } catch (e) {
    console.warn('launcher icon', e);
  }
}
