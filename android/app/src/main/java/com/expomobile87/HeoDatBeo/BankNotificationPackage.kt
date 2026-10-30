package com.satsboy87.heodatbeo

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BankNotificationPackage : ReactPackage {
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            BankNotificationModule(reactContext),
            ScreenBrightnessModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}

