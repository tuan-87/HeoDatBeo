package com.satsboy87.heodatbeo

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.PowerManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

class BankNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "BankNotification"
        private const val PREF_NAME = "BankNotificationPref"
        private const val KEY_PENDING_LIST = "pending_notifications"
        private const val KEY_IGNORED_KEYS = "ignored_keys"
        private const val KEY_PROCESSED_KEYS = "processed_keys"
        private const val MAX_SAVED = 50
        private const val CHANNEL_ID = "bank_transaction_channel_v3"

        var activeModule: BankNotificationModule? = null
        var instance: BankNotificationListenerService? = null

        /**
         * Quét tất cả thông báo hiện có trên khay hệ thống (Active Notifications).
         * Giúp bắt ngay các thông báo ngân hàng bị lỡ khi app vừa mở lên.
         */
        fun scanActiveNotifications() {
            try {
                val service = instance ?: return
                val activeNotifs = service.activeNotifications ?: return
                Log.d(TAG, "Scanning active notifications count: ${activeNotifs.size}")
                for (sbn in activeNotifs) {
                    service.processNotification(sbn, fromScan = true)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error scanning active notifications", e)
            }
        }

        // Supported Vietnamese Banking & E-wallet package names
        val SUPPORTED_BANK_PACKAGES = setOf(
            "com.VCB",                         // Vietcombank Digibank
            "com.tcb",                         // Techcombank Mobile cũ
            "vn.com.techcombank.bb.app",       // Techcombank Mobile mới
            "com.techcombank.mobile",          // Techcombank Mobile variant
            "vn.com.techcombank.business",     // Techcombank Business
            "com.mbmobile",                    // MB Bank
            "com.tpb.mb.gprsandroid",          // TPBank Mobile
            "com.vietinbank.ipay",             // VietinBank iPay
            "mobile.acb.com.vn",               // ACB ONE
            "com.vnpay.vpbankonline",          // VPBank NEO
            "com.vnpay.bidv",                  // BIDV SmartBanking
            "com.mservice.momotransfer",       // MoMo
            "vn.com.vng.zalopay",              // ZaloPay
            "com.zing.zalo",                   // Zalo (ZaloPay OTT)
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

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.d(TAG, "BankNotificationListenerService CONNECTED successfully!")
        scanActiveNotifications()
        activeModule?.emitServiceConnected()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "onTaskRemoved - requesting rebind to keep BankNotificationListenerService alive")
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                requestRebind(ComponentName(this, BankNotificationListenerService::class.java))
            }
            // Tái kích hoạt component state để hệ điều hành Android tự động bind lại Service
            val pm = packageManager
            val componentName = ComponentName(this, BankNotificationListenerService::class.java)
            pm.setComponentEnabledSetting(componentName, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
            pm.setComponentEnabledSetting(componentName, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
        } catch (_: Exception) {}
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        if (instance == this) {
            instance = null
        }
        Log.w(TAG, "BankNotificationListenerService DISCONNECTED! Requesting rebind...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, BankNotificationListenerService::class.java))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    private fun acquireWakeLock() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            val wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "HeoDatBeo:BankNotifWakeLock"
            )
            wakeLock?.acquire(3000) // Giữ CPU chạy 3 giây để tránh bị Android Doze ngắt giữa chừng
        } catch (e: Exception) {
            Log.w(TAG, "Could not acquire WakeLock", e)
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        // 1. Kích hoạt WakeLock 3s ngay lập tức để CPU không rơi vào trạng thái ngủ sâu (Doze mode)
        acquireWakeLock()

        // 2. Xử lý thông báo
        processNotification(sbn, fromScan = false)
    }

    private fun isKeyAlreadyHandled(notificationKey: String): Boolean {
        try {
            val pref = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

            // Kiểm tra trong danh sách đã bị người dùng bỏ qua
            val ignoredSet = pref.getStringSet(KEY_IGNORED_KEYS, emptySet()) ?: emptySet()
            if (ignoredSet.contains(notificationKey)) return true

            // Kiểm tra trong danh sách đã xử lý
            val processedSet = pref.getStringSet(KEY_PROCESSED_KEYS, emptySet()) ?: emptySet()
            if (processedSet.contains(notificationKey)) return true

            // Kiểm tra trong hàng đợi chờ xử lý
            val existingJson = pref.getString(KEY_PENDING_LIST, "[]") ?: "[]"
            val jsonArray = JSONArray(existingJson)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                if (obj.optString("notificationKey") == notificationKey) {
                    return true
                }
            }
        } catch (_: Exception) {}
        return false
    }

    private fun markKeyHandled(notificationKey: String) {
        try {
            val pref = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
            val processedSet = HashSet(pref.getStringSet(KEY_PROCESSED_KEYS, emptySet()) ?: emptySet())
            processedSet.add(notificationKey)
            if (processedSet.size > 200) {
                val trimmed = processedSet.toList().takeLast(100).toSet()
                pref.edit().putStringSet(KEY_PROCESSED_KEYS, trimmed).apply()
            } else {
                pref.edit().putStringSet(KEY_PROCESSED_KEYS, processedSet).apply()
            }
        } catch (_: Exception) {}
    }

    private fun processNotification(sbn: StatusBarNotification, fromScan: Boolean) {
        try {
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
            val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
                ?.filterNotNull()
                ?.joinToString(" ") { it.toString() } ?: ""

            val contentParts = listOf(text, bigText, textLines).filter { it.isNotBlank() }.distinct()
            val content = contentParts.joinToString(" ").trim()
            if (content.isEmpty() && title.isEmpty()) return

            // Nếu là ứng dụng Zalo, chỉ nhận nếu liên quan tới ZaloPay / Giao dịch tiền
            if (packageName == "com.zing.zalo") {
                val combo = "$title $content".lowercase(Locale.getDefault())
                val isZaloPay = combo.contains("zalopay") ||
                        combo.contains("chuyển tiền") || combo.contains("chuyen tien") ||
                        combo.contains("nhận tiền") || combo.contains("nhan tien") ||
                        combo.contains("thanh toán") || combo.contains("thanh toan") ||
                        combo.contains("số dư") || combo.contains("so du")
                if (!isZaloPay) return
            }

            val postTime = sbn.postTime
            val notificationKey = sbn.key ?: "${packageName}_${postTime}"

            // Tránh xử lý trùng lặp nếu thông báo đã được lưu hoặc đã bị bỏ qua
            if (isKeyAlreadyHandled(notificationKey)) {
                return
            }

            Log.d(TAG, "Captured bank notification: [$packageName] $title: $content")

            // Đánh dấu key đã được tiếp nhận
            markKeyHandled(notificationKey)

            // 1. Lưu vào hàng đợi SharedPreferences (đồng bộ tức thì bằng commit để đảm bảo dữ liệu ghi vào đĩa trước khi CPU tắt)
            saveToQueue(packageName, title, content, postTime, notificationKey)

            // 2. Nếu app đang mở, đẩy sự kiện thời gian thực sang JavaScript
            activeModule?.emitNotification(packageName, title, content, postTime, notificationKey)

            // 3. Hiển thị thông báo tương tác Heads-Up trên thanh thông báo / màn hình khóa (nếu không phải quét nền khi app đã mở)
            if (!fromScan) {
                showInteractiveNotification(packageName, title, content, notificationKey)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in processNotification", e)
        }
    }

    private fun showInteractiveNotification(
        packageName: String,
        title: String,
        content: String,
        notificationKey: String
    ) {
        try {
            val fullText = "$title $content".trim()
            val lower = fullText.lowercase(Locale.getDefault())

            // 1. Chỉ bỏ qua tin OTP thuần tuý (không chứa số tiền biến động) hoặc cảnh báo bảo mật/đăng nhập
            val hasOtpKeyword = lower.contains("ma otp") || lower.contains("mã otp") || lower.contains("otp:")
            val hasBalanceKeywords = lower.contains("so du") || lower.contains("số dư") ||
                    lower.contains("bien dong") || lower.contains("biến động") ||
                    lower.contains("+") || lower.contains("-")
            if (hasOtpKeyword && !hasBalanceKeywords) {
                return
            }

            val isLoginAlert = lower.contains("đăng nhập trên thiết bị mới") ||
                    lower.contains("dang nhap tren thiet bi moi") ||
                    lower.contains("cảnh báo đăng nhập") ||
                    lower.contains("canh bao dang nhap") ||
                    lower.contains("khóa thẻ thành công") ||
                    lower.contains("khoa the thanh cong")

            if (isLoginAlert) {
                return
            }

            // 2. Xác định tên ngân hàng hiển thị
            val bankName = when (packageName) {
                "com.VCB" -> "Vietcombank"
                "com.tcb", "vn.com.techcombank.bb.app", "com.techcombank.mobile", "vn.com.techcombank.business" -> "Techcombank"
                "com.mbmobile" -> "MB Bank"
                "com.tpb.mb.gprsandroid" -> "TPBank"
                "com.vietinbank.ipay" -> "VietinBank"
                "mobile.acb.com.vn" -> "ACB"
                "com.vnpay.vpbankonline" -> "VPBank"
                "com.cake.mobile" -> "Cake by VPBank"
                "com.vnpay.bidv" -> "BIDV"
                "com.mservice.momotransfer" -> "MoMo"
                "vn.com.vng.zalopay", "com.zing.zalo" -> "ZaloPay"
                "com.shb.mobile" -> "SHB"
                "com.seabank.mb" -> "SeABank"
                "com.vnpay.hdbank" -> "HDBank"
                "com.ocb.omni.app" -> "OCB"
                "vn.vib.mobile" -> "MyVIB"
                "vn.viettel.viettelpay" -> "Viettel Money"
                else -> "Ngân hàng"
            }

            // 3. Bóc tách số tiền và dấu +/-
            val currencyPattern = "(?:VND|đ|VNĐ|đồng|dong|d\\b)"
            val currencyBefore = "(?:VND|đ|VNĐ|đồng|dong)"
            val numberPattern = "([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)"

            // Case A1: + VND 15,000 hoặc - VND 50,000 (Techcombank)
            val explicitCurrFirst = Regex("([+-])\\s*$currencyBefore\\s*$numberPattern", RegexOption.IGNORE_CASE).find(fullText)

            // Case A2: + 15,000 VND hoặc - 50.000đ (VCB, MB...)
            val explicitWithUnit = if (explicitCurrFirst == null) {
                Regex("([+-])\\s*$numberPattern\\s*$currencyPattern", RegexOption.IGNORE_CASE).find(fullText)
            } else null

            // Case A3: + 15,000 hoặc - 50.000
            val explicitWithoutUnit = if (explicitCurrFirst == null && explicitWithUnit == null) {
                Regex("([+-])\\s*([0-9]{1,3}(?:[.,][0-9]{3})+)", RegexOption.IGNORE_CASE).find(fullText)
            } else null

            val explicitMatch = explicitCurrFirst ?: explicitWithUnit ?: explicitWithoutUnit

            var isIncome = false
            var amountStr = ""
            var signStr = "-"

            if (explicitMatch != null) {
                signStr = explicitMatch.groupValues[1]
                isIncome = (signStr == "+")
                amountStr = explicitMatch.groupValues[2]
            } else {
                val isIncomeKeyword = lower.contains("nhận được") || lower.contains("nhan duoc") ||
                        lower.contains("nhận tiền") || lower.contains("cộng tiền") ||
                        lower.contains("cong tien") || lower.contains("hoàn tiền")
                isIncome = isIncomeKeyword
                signStr = if (isIncome) "+" else "-"

                val generalCurrFirst = Regex("(?:GD|thanh toán|chuyển|nhận|tiền|thành công|biến động|trừ|cộng)?[\\s:]*$currencyBefore\\s*$numberPattern", RegexOption.IGNORE_CASE).find(fullText)
                val generalMatch = generalCurrFirst ?: Regex("(?:GD|thanh toán|chuyển|nhận|tiền|thành công|biến động|trừ|cộng)?[\\s:]*$numberPattern\\s*$currencyPattern", RegexOption.IGNORE_CASE).find(fullText)
                if (generalMatch != null) {
                    amountStr = generalMatch.groupValues[1]
                }
            }

            val cleanDigits = amountStr.replace(Regex("[^0-9]"), "")
            val amountLong = cleanDigits.toLongOrNull() ?: 0L
            if (amountLong <= 0L) {
                return // Không trích xuất được số tiền hợp lệ -> không tạo thông báo
            }

            // Định dạng số tiền kiểu Việt Nam: 10.000 hoặc 20.000
            val symbols = DecimalFormatSymbols(Locale.forLanguageTag("vi-VN")).apply {
                groupingSeparator = '.'
            }
            val formattedAmount = DecimalFormat("#,###", symbols).format(amountLong)

            // 4. Trích xuất nội dung / ghi chú
            val noteRegex = Regex("(?:ND|Noi dung|Nội dung|Lời nhắn|cho|tại|từ)[\\s:]*([^\\n.;]{3,80})", RegexOption.IGNORE_CASE)
            val noteMatch = noteRegex.find(fullText)
            val note = if (noteMatch != null) {
                noteMatch.groupValues[1].trim()
            } else {
                if (title.isNotEmpty() && title != bankName) title.trim()
                else if (isIncome) "Thu tiền $bankName" else "Chi tiêu $bankName"
            }

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val vibratePattern = longArrayOf(0, 300, 200, 300)

            // 5. Tạo Notification Channel với âm thanh và rung để kích hoạt Heads-Up Banner (Android 8.0+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                    .build()

                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Giao dịch ngân hàng (Duyệt thu chi)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Thông báo nổi tức thì khi có biến động số dư ngân hàng"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = vibratePattern
                    setSound(soundUri, audioAttributes)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                    setShowBadge(true)
                    setBypassDnd(true)
                }
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                manager.createNotificationChannel(channel)
            }

            val notifId = (notificationKey.hashCode() and 0x7FFFFFFF)
            val immutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

            // Nút 1: "Bỏ qua" -> Gửi Broadcast tới BankNotificationActionReceiver
            val ignoreIntent = Intent(this, BankNotificationActionReceiver::class.java).apply {
                action = BankNotificationActionReceiver.ACTION_IGNORE
                putExtra(BankNotificationActionReceiver.EXTRA_NOTIFICATION_KEY, notificationKey)
                putExtra(BankNotificationActionReceiver.EXTRA_NOTIFICATION_ID, notifId)
            }
            val pendingIgnore = PendingIntent.getBroadcast(
                this,
                notifId,
                ignoreIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag
            )

            // Nút 2: "Duyệt" -> Mở MainActivity và điều hướng tới MoneyDiaryScreen
            val reviewIntent = Intent(this, MainActivity::class.java).apply {
                action = "com.satsboy87.heodatbeo.ACTION_REVIEW_BANK_TRANSACTION"
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("open_bank_modal", true)
                putExtra("notification_key", notificationKey)
                putExtra("notification_id", notifId)
            }
            val pendingReview = PendingIntent.getActivity(
                this,
                notifId + 1,
                reviewIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag
            )

            // 6. Xây dựng Notification ở mức PRIORITY_MAX, CATEGORY_EVENT, Sound & Vibrate để hiện banner Heads-Up nổi
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("$bankName: $signStr$formattedAmount VND")
                .setContentText(note)
                .setStyle(NotificationCompat.BigTextStyle().bigText(note))
                .setSubText("Heo Đất Béo")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(soundUri)
                .setVibrate(vibratePattern)
                .setDefaults(NotificationCompat.DEFAULT_LIGHTS or NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
                .setAutoCancel(true)
                .setContentIntent(pendingReview)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Bỏ qua", pendingIgnore)
                .addAction(android.R.drawable.ic_input_add, "Duyệt", pendingReview)
                .build()

            // Kiểm tra quyền POST_NOTIFICATIONS trên Android 13+
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                ActivityCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            ) {
                NotificationManagerCompat.from(this).notify(notifId, notification)
                Log.d(TAG, "Sent interactive notification: $bankName: $signStr$formattedAmount VND")
            } else {
                Log.w(TAG, "POST_NOTIFICATIONS permission not granted. Notification suppressed by Android OS.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error showing interactive notification", e)
        }
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

            pref.edit().putString(KEY_PENDING_LIST, newArray.toString()).commit()
        } catch (e: Exception) {
            Log.e(TAG, "Error saving notification to queue", e)
        }
    }
}
