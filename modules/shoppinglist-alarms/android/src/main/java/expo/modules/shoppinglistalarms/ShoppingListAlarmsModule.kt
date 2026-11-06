package expo.modules.shoppinglistalarms

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Состояние и системные настройки, нужные для точных напоминаний (без сети и данных).
class ShoppingListAlarmsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context lost")

  override fun definition() = ModuleDefinition {
    Name("ShoppingListAlarms")

    // До Android 12 точные будильники разрешены всегда.
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        true
      } else {
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
      }
    }

    Function("isIgnoringBatteryOptimizations") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager)
        .isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        launch(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")))
      }
    }

    // Список «Оптимизация батареи»; если экрана нет, открываем страницу приложения.
    Function("openBatterySettings") {
      launch(
        Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")),
      )
    }
  }

  private fun launch(vararg intents: Intent) {
    for (intent in intents) {
      try {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return
      } catch (e: Exception) {
        // пробуем следующий экран
      }
    }
  }
}
