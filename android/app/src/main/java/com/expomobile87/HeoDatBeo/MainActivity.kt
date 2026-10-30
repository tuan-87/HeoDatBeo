package com.satsboy87.heodatbeo

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import androidx.core.app.ActivityCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    handleBankIntent(intent)
    requestNotificationPermission()
  }

  private fun requestNotificationPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
      }
    }
  }

  override fun onResume() {
    super.onResume()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        val componentName = ComponentName(this, BankNotificationListenerService::class.java)
        NotificationListenerService.requestRebind(componentName)
      }
      BankNotificationListenerService.scanActiveNotifications()
    } catch (_: Exception) {}
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleBankIntent(intent)
  }

  private fun handleBankIntent(intent: Intent?) {
    if (intent != null && intent.getBooleanExtra("open_bank_modal", false)) {
      val notifId = intent.getIntExtra("notification_id", -1)
      if (notifId != -1) {
        try {
          androidx.core.app.NotificationManagerCompat.from(this).cancel(notifId)
        } catch (_: Exception) {}
      }
      val key = intent.getStringExtra("notification_key") ?: ""
      BankNotificationListenerService.activeModule?.emitOpenBankModal(key)
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      // Khi người dùng bấm Back ở màn hình chính, đưa app về background (tương tự bấm Home)
      // Giúp giữ dịch vụ ngầm luôn sẵn sàng và không bị huỷ tiến trình đột ngột
      moveTaskToBack(true)
  }
}
