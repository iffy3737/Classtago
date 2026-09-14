package com.classtago.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

public class BellAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        Intent service = new Intent(context, BellAlarmService.class);
        service.putExtra("bell_title", intent != null ? intent.getStringExtra("bell_title") : "School Bell");
        ContextCompat.startForegroundService(context, service);
    }
}
