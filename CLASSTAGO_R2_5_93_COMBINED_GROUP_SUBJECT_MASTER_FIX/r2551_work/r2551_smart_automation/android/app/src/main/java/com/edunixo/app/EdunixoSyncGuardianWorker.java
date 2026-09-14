package com.edunixo.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class EdunixoSyncGuardianWorker extends Worker {
    private static final String CHANNEL_ID = "edunixo_sync_guardian";
    public EdunixoSyncGuardianWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

    @NonNull @Override public Result doWork() {
        Context context=getApplicationContext();
        var prefs=context.getSharedPreferences("edunixo_sync_guardian",Context.MODE_PRIVATE);
        boolean enabled=prefs.getBoolean("enabled",true);
        int pending=prefs.getInt("pending_count",0);
        if(!enabled||pending<=0)return Result.success();
        if(Build.VERSION.SDK_INT>=33 && ContextCompat.checkSelfPermission(context,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return Result.success();
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){
            NotificationChannel channel=new NotificationChannel(CHANNEL_ID,"Offline sync reminders",NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Reminds you when encrypted EDUNIXO offline work is waiting for authenticated sync");
            manager.createNotificationChannel(channel);
        }
        Intent intent=new Intent(context,MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open=PendingIntent.getActivity(context,7741,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String body=pending==1?"1 encrypted offline change is waiting to sync.":pending+" encrypted offline changes are waiting to sync.";
        NotificationCompat.Builder builder=new NotificationCompat.Builder(context,CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("EDUNIXO Sync Guardian")
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body+" Open EDUNIXO while online; the normal authenticated sync engine will safely upload it."))
            .setAutoCancel(true).setContentIntent(open).addAction(0,"Open EDUNIXO",open).setPriority(NotificationCompat.PRIORITY_DEFAULT);
        manager.notify(7741,builder.build());
        prefs.edit().putBoolean("work_scheduled",false).apply();
        return Result.success();
    }
}
