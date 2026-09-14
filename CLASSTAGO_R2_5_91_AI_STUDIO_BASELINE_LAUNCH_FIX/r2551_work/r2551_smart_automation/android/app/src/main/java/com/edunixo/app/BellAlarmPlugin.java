package com.edunixo.app;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "BellAlarm")
public class BellAlarmPlugin extends Plugin {
    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("exactAlarmAllowed", BellAlarmStore.canScheduleExact(getContext()));
        boolean notificationsAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        result.put("notificationsAllowed", notificationsAllowed);
        result.put("scheduledCount", BellAlarmStore.read(getContext()).length());
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmAccess(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !BellAlarmStore.canScheduleExact(getContext())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            }
            JSObject out = new JSObject(); out.put("opened", true); call.resolve(out);
        } catch (Exception error) {
            call.reject("Exact alarm settings could not be opened.", error);
        }
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            getActivity().startActivity(intent);
            JSObject out = new JSObject(); out.put("opened", true); call.resolve(out);
        } catch (Exception error) {
            call.reject("Notification settings could not be opened.", error);
        }
    }

    @PluginMethod
    public void replaceSchedule(PluginCall call) {
        if (!BellAlarmStore.canScheduleExact(getContext())) {
            JSObject out = new JSObject(); out.put("scheduled", 0); out.put("exactAlarmAllowed", false); call.resolve(out); return;
        }
        try {
            JSArray alarms = call.getArray("alarms", new JSArray());
            BellAlarmStore.cancelAll(getContext());
            JSONArray persisted = new JSONArray();
            int scheduled = 0;
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject row = alarms.optJSONObject(i);
                if (row == null) continue;
                String id = row.optString("id", "bell-" + i);
                String title = row.optString("title", "School Bell");
                long epochMs = row.optLong("epochMs", 0L);
                if (epochMs <= System.currentTimeMillis() - 30_000L) continue;
                BellAlarmStore.schedule(getContext(), id, title, epochMs);
                JSONObject saved = new JSONObject(); saved.put("id", id); saved.put("title", title); saved.put("epochMs", epochMs); persisted.put(saved);
                scheduled++;
            }
            BellAlarmStore.save(getContext(), persisted);
            JSObject out = new JSObject(); out.put("scheduled", scheduled); out.put("exactAlarmAllowed", true); call.resolve(out);
        } catch (Exception error) {
            call.reject("Bell alarms could not be scheduled.", error);
        }
    }
}
