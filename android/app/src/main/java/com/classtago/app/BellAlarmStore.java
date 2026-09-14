package com.classtago.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

final class BellAlarmStore {
    private static final String PREFS = "edunixo_bell_alarms";
    private static final String KEY = "schedule";
    private BellAlarmStore() {}

    static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return manager != null && manager.canScheduleExactAlarms();
    }

    static int requestCode(String id) {
        return (id == null ? "bell" : id).hashCode() & 0x7fffffff;
    }

    static PendingIntent pendingIntent(Context context, String id, String title) {
        Intent intent = new Intent(context, BellAlarmReceiver.class);
        intent.setAction("com.classtago.app.BELL_ALARM");
        intent.putExtra("bell_id", id);
        intent.putExtra("bell_title", title);
        return PendingIntent.getBroadcast(
            context,
            requestCode(id),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void schedule(Context context, String id, String title, long epochMs) {
        if (epochMs <= System.currentTimeMillis() - 30_000L || !canScheduleExact(context)) return;
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent pi = pendingIntent(context, id, title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, epochMs, pi);
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, epochMs, pi);
        }
    }

    static void cancelAll(Context context) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        JSONArray rows = read(context);
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            String id = row.optString("id", "");
            String title = row.optString("title", "School Bell");
            manager.cancel(pendingIntent(context, id, title));
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply();
    }

    static JSONArray read(Context context) {
        try {
            String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
            return new JSONArray(json == null ? "[]" : json);
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    static void save(Context context, JSONArray rows) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, rows.toString()).apply();
    }

    static int reschedule(Context context) {
        if (!canScheduleExact(context)) return 0;
        JSONArray rows = read(context);
        int count = 0;
        for (int i = 0; i < rows.length(); i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            long epochMs = row.optLong("epochMs", 0L);
            if (epochMs <= System.currentTimeMillis() - 30_000L) continue;
            schedule(context, row.optString("id", "bell-" + i), row.optString("title", "School Bell"), epochMs);
            count++;
        }
        return count;
    }
}
