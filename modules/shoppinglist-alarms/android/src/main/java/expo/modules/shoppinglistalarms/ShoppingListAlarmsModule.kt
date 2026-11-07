package expo.modules.shoppinglistalarms

import android.app.AlarmManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
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

    // key - 'default' or a profile key; all - every key (including 'default').
    Function("setLauncherIcon") { key: String, all: List<String> ->
      setLauncherIcon(key, all)
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

  private fun setLauncherIcon(key: String, all: List<String>) {
    val pm = context.packageManager
    fun alias(k: String) = ComponentName(context.packageName, "${context.packageName}.icon.${k.replaceFirstChar { it.uppercase() }}")
    pm.setComponentEnabledSetting(alias(key), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
    for (k in all) {
      if (k != key) {
        pm.setComponentEnabledSetting(alias(k), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
      }
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
