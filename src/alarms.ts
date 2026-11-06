import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type AlarmsModule = {
  canScheduleExactAlarms(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openExactAlarmSettings(): void;
  openBatterySettings(): void;
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
