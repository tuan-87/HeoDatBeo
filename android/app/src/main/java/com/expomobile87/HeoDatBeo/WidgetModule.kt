package com.satsboy87.heodatbeo

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WidgetModule"

    @ReactMethod
    fun updateWidget(streakCount: Int, recordedToday: Boolean) {
        val context = reactApplicationContext
        val sharedPref = context.getSharedPreferences("HeoDatBeoWidgetPref", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putInt("streakCount", streakCount)
            putBoolean("recordedToday", recordedToday)
            apply()
        }

        // Trigger widget update by sending broadcast to StreakWidgetProvider
        val intent = Intent(context, StreakWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
            ComponentName(context, StreakWidgetProvider::class.java)
        )
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }
}
