package com.satsboy87.heodatbeo

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews

data class StreakLevelInfo(val name: String, val description: String, val colorHex: String)

val STREAK_LEVELS = mapOf(
    1 to StreakLevelInfo("Khai Tài Cảnh", "Bắt đầu nhận thức về tiền bạc, hiểu giá trị đồng tiền.", "#15803D"),
    2 to StreakLevelInfo("Tụ Khố Cảnh", "Biết tiết kiệm, tích lũy tài nguyên.", "#0F766E"),
    3 to StreakLevelInfo("Lý Kim Cảnh", "Bắt đầu quản lý thu chi, kiểm soát dòng tiền.", "#0369A1"),
    4 to StreakLevelInfo("Minh Trướng Cảnh", "Sổ sách minh bạch, hiểu cấu trúc tài chính cá nhân.", "#1D4ED8"),
    5 to StreakLevelInfo("Ngự Chi Cảnh", "Làm chủ chi tiêu, không còn tiêu tiền cảm tính.", "#4338CA"),
    6 to StreakLevelInfo("Dư Tài Cảnh", "Xuất hiện dòng tiền dư, có tài sản tích lũy thực sự.", "#6D28D9"),
    7 to StreakLevelInfo("Sinh Tức Cảnh", "Biết khiến tiền sinh lời.", "#7E22CE"),
    8 to StreakLevelInfo("Tài Mạch Cảnh", "Hiểu các dòng chảy tài chính và cơ hội tài vận.", "#A21CAF"),
    9 to StreakLevelInfo("Hóa Phú Cảnh", "Tài sản tăng trưởng mạnh, bắt đầu chuyển hóa thành của cải lớn.", "#BE185D"),
    10 to StreakLevelInfo("Ngưng Khố Cảnh", "Tài sản hình thành “kho nội lực” vững chắc.", "#BE123C"),
    11 to StreakLevelInfo("Chưởng Tài Cảnh", "Có năng lực điều phối tiền bạc và tài nguyên.", "#B91C1C"),
    12 to StreakLevelInfo("Tài Hải Cảnh", "Dòng tiền lớn như biển, nhiều nguồn thu nhập.", "#C2410C"),
    13 to StreakLevelInfo("Kim Đan Cảnh", "“Tài đạo” ngưng tụ thành hệ thống ổn định.", "#B45309"),
    14 to StreakLevelInfo("Phú Linh Cảnh", "Tiền bạc vận hành như có linh tính, đầu tư sắc bén.", "#A16207"),
    15 to StreakLevelInfo("Thiên Khố Cảnh", "Sở hữu nền tảng tài sản cực lớn.", "#4D7C0F"),
    16 to StreakLevelInfo("Tài Vương Cảnh", "Đứng đầu một phương về tài lực.", "#0E7490"),
    17 to StreakLevelInfo("Phú Thiên Cảnh", "Tài lực ảnh hưởng tới đại cục, phú khả địch quốc.", "#3730A3"),
    18 to StreakLevelInfo("Thiên Đạo Tài Tôn", "Cảnh giới tối cao, thấu hiểu quy luật vận hành của tài phú và tài vận.", "#9A3412")
)

class StreakWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val componentName = ComponentName(context, StreakWidgetProvider::class.java)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
        onUpdate(context, appWidgetManager, appWidgetIds)
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val sharedPref = context.getSharedPreferences("HeoDatBeoWidgetPref", Context.MODE_PRIVATE)
        val streakCount = sharedPref.getInt("streakCount", 0)
        val recordedToday = sharedPref.getBoolean("recordedToday", false)

        val level = if (streakCount <= 0) 1 else Math.min(18, (streakCount - 1) / 30 + 1)
        val levelInfo = STREAK_LEVELS[level] ?: STREAK_LEVELS[1]!!
        val levelColor = Color.parseColor(levelInfo.colorHex)

        val layoutId = if (recordedToday) R.layout.widget_streak_recorded else R.layout.widget_streak_unrecorded
        val views = RemoteViews(context.packageName, layoutId)

        if (recordedToday) {
            views.setTextViewText(R.id.widget_streak_count, "$streakCount ngày")
            views.setTextColor(R.id.widget_streak_count, levelColor)
            views.setTextColor(R.id.widget_status_title, levelColor)
            views.setTextViewText(R.id.widget_status_subtitle, "Cấp $level - ${levelInfo.name}: ${levelInfo.description}")
            views.setInt(R.id.widget_icon, "setColorFilter", levelColor)
        } else {
            val grayColor = Color.parseColor("#0F172A") // Slate 900
            val grayTitleColor = Color.parseColor("#1E293B") // Slate 800
            val dimmedIconColor = Color.parseColor("#475569") // Slate 600
            views.setTextViewText(R.id.widget_streak_count, "$streakCount ngày")
            views.setTextColor(R.id.widget_streak_count, grayColor)
            views.setTextColor(R.id.widget_status_title, grayTitleColor)
            views.setTextViewText(R.id.widget_status_subtitle, "Cấp $level - ${levelInfo.name}\nNhập chi tiêu để giữ chuỗi!")
            views.setInt(R.id.widget_icon, "setColorFilter", dimmedIconColor)
        }

        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
