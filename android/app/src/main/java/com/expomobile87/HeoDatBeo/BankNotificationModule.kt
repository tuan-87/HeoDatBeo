package com.satsboy87.heodatbeo

import android.content.Context
import android.content.Intent
import android.provider.Settings
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
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_PERMISSION", e.message)
        }
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

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        if (BankNotificationListenerService.activeModule == this) {
            BankNotificationListenerService.activeModule = null
        }
    }
}

