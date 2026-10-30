package com.satsboy87.heodatbeo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray

class BankNotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BankNotificationAction"
        const val ACTION_IGNORE = "com.satsboy87.heodatbeo.ACTION_IGNORE_BANK_TRANSACTION"
        const val EXTRA_NOTIFICATION_KEY = "notification_key"
        const val EXTRA_NOTIFICATION_ID = "notification_id"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_IGNORE) {
            val key = intent.getStringExtra(EXTRA_NOTIFICATION_KEY) ?: ""
            val notifId = intent.getIntExtra(EXTRA_NOTIFICATION_ID, -1)

            Log.d(TAG, "User clicked Ignore for notification key: $key (ID: $notifId)")

            // 1. Cancel the local notification
            if (notifId != -1) {
                try {
                    NotificationManagerCompat.from(context).cancel(notifId)
                } catch (e: Exception) {
                    Log.e(TAG, "Error cancelling notification", e)
                }
            }

            // 2. Remove the pending transaction from SharedPreferences and add to ignored_keys
            if (key.isNotEmpty()) {
                try {
                    val pref = context.getSharedPreferences("BankNotificationPref", Context.MODE_PRIVATE)

                    // A. Add to ignored_keys (stored for JS to sync even if app was killed)
                    val existingIgnored = pref.getStringSet("ignored_keys", HashSet<String>())?.toMutableSet() ?: mutableSetOf()
                    existingIgnored.add(key)
                    pref.edit().putStringSet("ignored_keys", existingIgnored).apply()

                    // B. Remove from pending_notifications queue
                    val jsonStr = pref.getString("pending_notifications", "[]") ?: "[]"
                    val currentArray = JSONArray(jsonStr)
                    val newArray = JSONArray()

                    for (i in 0 until currentArray.length()) {
                        val item = currentArray.getJSONObject(i)
                        val itemKey = item.optString("notificationKey")
                        if (itemKey != key) {
                            newArray.put(item)
                        }
                    }

                    pref.edit().putString("pending_notifications", newArray.toString()).apply()
                    Log.d(TAG, "Successfully removed ignored transaction: $key")

                    // 3. Notify React Native if app is running
                    BankNotificationListenerService.activeModule?.emitNotificationIgnored(key)
                } catch (e: Exception) {
                    Log.e(TAG, "Error updating pending queue on ignore", e)
                }
            }
        }
    }
}

