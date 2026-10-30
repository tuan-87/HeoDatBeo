package com.satsboy87.heodatbeo

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenBrightnessModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ScreenBrightnessModule"

    @ReactMethod
    fun setMaxBrightness() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            try {
                val window = activity.window ?: return@runOnUiThread
                val layoutParams = window.attributes
                layoutParams.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_FULL
                window.attributes = layoutParams
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun resetBrightness() {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            try {
                val window = activity.window ?: return@runOnUiThread
                val layoutParams = window.attributes
                layoutParams.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
                window.attributes = layoutParams
            } catch (_: Exception) {}
        }
    }
}

