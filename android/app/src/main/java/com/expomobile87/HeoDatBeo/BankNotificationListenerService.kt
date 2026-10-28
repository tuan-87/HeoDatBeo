package com.satsboy87.heodatbeo

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class BankNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "BankNotification"
        private const val PREF_NAME = "BankNotificationPref"
        private const val KEY_PENDING_LIST = "pending_notifications"
        private const val MAX_SAVED = 50

        var activeModule: BankNotificationModule? = null

        // Supported Vietnamese Banking & E-wallet package names
        val SUPPORTED_BANK_PACKAGES = setOf(
            "com.VCB",                         // Vietcombank Digibank
            "com.tcb",                         // Techcombank Mobile
            "vn.com.techcombank.bb.app",       // Techcombank Mobile mới
            "com.mbmobile",                    // MB Bank
            "com.tpb.mb.gprsandroid",          // TPBank Mobile
            "com.vietinbank.ipay",             // VietinBank iPay
            "mobile.acb.com.vn",               // ACB ONE
            "com.vnpay.vpbankonline",          // VPBank NEO
            "com.vnpay.bidv",                  // BIDV SmartBanking
            "com.mservice.momotransfer",       // MoMo
            "vn.com.vng.zalopay",              // ZaloPay
            "com.shb.mobile",                  // SHB Mobile
            "com.seabank.mb",                  // SeABank
            "vn.com.scb.mb",                   // SCB Mobile
            "com.vnpay.hdbank",                // HDBank
            "com.ocb.omni.app",                // OCB OMNI
            "vn.lienvietpostbank.mobile",      // LPBank
            "com.vnpay.msbbanking",            // MSB mBank
            "com.cake.mobile",                 // Cake by VPBank
            "com.vibe.tnex",                   // TNEX
            "vn.vib.mobile",                   // MyVIB
            "vn.viettel.viettelpay"            // Viettel Money
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        if (!SUPPORTED_BANK_PACKAGES.contains(packageName)) {
            return
        }

        val extras = sbn.notification?.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getString(Notification.EXTRA_TEXT) ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: extras.getString(Notification.EXTRA_BIG_TEXT) ?: ""

        val content = if (bigText.isNotEmpty()) bigText else text
        if (content.isEmpty() && title.isEmpty()) return

        val postTime = sbn.postTime
        val notificationKey = sbn.key ?: "${packageName}_${postTime}"

        Log.d(TAG, "Captured bank notification: [$packageName] $title: $content")

        // 1. Save to SharedPreferences queue so JS can drain when opened
        saveToQueue(packageName, title, content, postTime, notificationKey)

        // 2. If app is active, emit directly to JS
        activeModule?.emitNotification(packageName, title, content, postTime, notificationKey)
    }

    private fun saveToQueue(
        packageName: String,
        title: String,
        content: String,
        postTime: Long,
        notificationKey: String
    ) {
        try {
            val pref = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            val existingJson = pref.getString(KEY_PENDING_LIST, "[]") ?: "[]"
            val jsonArray = JSONArray(existingJson)

            val item = JSONObject().apply {
                put("packageName", packageName)
                put("title", title)
                put("content", content)
                put("postTime", postTime)
                put("notificationKey", notificationKey)
            }

            // Insert to front, keeping max MAX_SAVED
            val newArray = JSONArray()
            newArray.put(item)
            for (i in 0 until minOf(jsonArray.length(), MAX_SAVED - 1)) {
                newArray.put(jsonArray.getJSONObject(i))
            }

            pref.edit().putString(KEY_PENDING_LIST, newArray.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error saving notification to queue", e)
        }
    }
}

