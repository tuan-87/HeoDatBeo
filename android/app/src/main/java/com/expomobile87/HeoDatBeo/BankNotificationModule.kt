package com.satsboy87.heodatbeo

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class BankNotificationModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        BankNotificationListenerService.activeModule = this
    }

    override fun getName(): String = "BankNotificationModule"

    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            val context = reactApplicationContext
            val packages = NotificationManagerCompat.getEnabledListenerPackages(context)
            val isGranted = packages.contains(context.packageName)
            if (isGranted) {
                rebindService()
            }
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_PERMISSION", e.message)
        }
    }

    @ReactMethod
    fun forceRebind(promise: Promise) {
        try {
            rebindService()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_REBIND", e.message)
        }
    }

    private fun rebindService() {
        try {
            val context = reactApplicationContext
            val componentName = ComponentName(context, BankNotificationListenerService::class.java)
            val pm = context.packageManager
            pm.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            )
            pm.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                NotificationListenerService.requestRebind(componentName)
            }
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun openAutostartSettings() {
        try {
            // Mở trực tiếp màn hình Tự khởi chạy trên Xiaomi (MIUI / HyperOS)
            val intent = Intent().apply {
                component = ComponentName(
                    "com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity"
                )
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (_: Exception) {
            openAppDetailsSettings()
        }
    }

    @ReactMethod
    fun openAppDetailsSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = android.net.Uri.parse("package:" + reactApplicationContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
        } catch (_: Exception) {
            openBatteryOptimizationSettings()
        }
    }

    @ReactMethod
    fun scanActiveNotifications(promise: Promise) {
        try {
            BankNotificationListenerService.scanActiveNotifications()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openBatteryOptimizationSettings() {
        try {
            val intent = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            } else {
                Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            try {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun getQueuedNotifications(promise: Promise) {
        try {
            val pref = reactApplicationContext.getSharedPreferences(
                "BankNotificationPref",
                Context.MODE_PRIVATE
            )
            val jsonStr = pref.getString("pending_notifications", "[]") ?: "[]"
            promise.resolve(jsonStr)
        } catch (e: Exception) {
            promise.reject("ERR_GET_QUEUED", e.message)
        }
    }

    @ReactMethod
    fun clearQueuedNotifications(promise: Promise) {
        try {
            val pref = reactApplicationContext.getSharedPreferences(
                "BankNotificationPref",
                Context.MODE_PRIVATE
            )
            pref.edit().putString("pending_notifications", "[]").apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CLEAR_QUEUED", e.message)
        }
    }

    @ReactMethod
    fun getAndClearIgnoredNotificationKeys(promise: Promise) {
        try {
            val pref = reactApplicationContext.getSharedPreferences(
                "BankNotificationPref",
                Context.MODE_PRIVATE
            )
            val ignoredSet = pref.getStringSet("ignored_keys", HashSet<String>()) ?: emptySet()
            val list = Arguments.createArray()
            for (key in ignoredSet) {
                list.pushString(key)
            }
            pref.edit().remove("ignored_keys").apply()
            promise.resolve(list)
        } catch (e: Exception) {
            promise.reject("ERR_GET_IGNORED_KEYS", e.message)
        }
    }

    @ReactMethod
    fun cancelNotificationByKey(notificationKey: String) {
        try {
            val notifId = (notificationKey.hashCode() and 0x7FFFFFFF)
            NotificationManagerCompat.from(reactApplicationContext).cancel(notifId)
        } catch (_: Exception) {}
    }

    fun emitServiceConnected() {
        if (!reactApplicationContext.hasActiveReactInstance()) return
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onBankServiceConnected", null)
    }

    fun emitNotification(
        packageName: String,
        title: String,
        content: String,
        postTime: Long,
        notificationKey: String
    ) {
        if (!reactApplicationContext.hasActiveReactInstance()) return

        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("title", title)
            putString("content", content)
            putDouble("postTime", postTime.toDouble())
            putString("notificationKey", notificationKey)
        }

        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onBankNotificationReceived", params)
    }

    fun emitOpenBankModal(notificationKey: String = "") {
        if (!reactApplicationContext.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putBoolean("openBankModal", true)
            putString("notificationKey", notificationKey)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onOpenBankModalRequest", params)
    }

    fun emitNotificationIgnored(notificationKey: String) {
        if (!reactApplicationContext.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putString("notificationKey", notificationKey)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("onBankNotificationIgnored", params)
    }

    @ReactMethod
    fun getInitialOpenBankModal(promise: Promise) {
        val intent = reactApplicationContext.currentActivity?.intent
        if (intent != null && intent.getBooleanExtra("open_bank_modal", false)) {
            intent.removeExtra("open_bank_modal")
            promise.resolve(true)
        } else {
            promise.resolve(false)
        }
    }

    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        if (BankNotificationListenerService.activeModule == this) {
            BankNotificationListenerService.activeModule = null
        }
    }

    override fun invalidate() {
        super.invalidate()
        if (BankNotificationListenerService.activeModule == this) {
            BankNotificationListenerService.activeModule = null
        }
    }
}

