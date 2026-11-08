package expo.modules.shoppinglistalarms

import android.app.AlarmManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.content.pm.PackageManager
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

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

    // Ярлыки по долгому нажатию на иконку: json — массив {id, label, uri}.
    Function("setShortcuts") { json: String ->
      setShortcuts(json)
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

  // Подписи приходят на языке приложения. Значок ярлыка — ресурс ic_shortcut_<id> (если есть).
  // Ярлык привязан к активной иконке рабочего стола (она может быть одной из alias), поэтому вызывается заново после смены иконки.
  private fun setShortcuts(json: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return
    try {
      val manager = context.getSystemService(ShortcutManager::class.java) ?: return
      val activity = context.packageManager.getLaunchIntentForPackage(context.packageName)?.component
      val array = JSONArray(json)
      val shortcuts = (0 until array.length()).map { i ->
        val item = array.getJSONObject(i)
        val id = item.getString("id")
        val label = item.getString("label")
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(item.getString("uri"))).setPackage(context.packageName)
        val builder = ShortcutInfo.Builder(context, id)
          .setShortLabel(label)
          .setLongLabel(label)
          .setIntent(intent)
          .setRank(i)
        val icon = context.resources.getIdentifier("ic_shortcut_$id", "drawable", context.packageName)
        if (icon != 0) builder.setIcon(Icon.createWithResource(context, icon))
        if (activity != null) builder.setActivity(activity)
        builder.build()
      }
      manager.setDynamicShortcuts(shortcuts)
    } catch (e: Exception) {
      // ярлыки — удобство: ошибка не должна ронять приложение
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
