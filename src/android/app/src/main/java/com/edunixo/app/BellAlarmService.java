package com.edunixo.app;
import com.classtago.app.R;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

public class BellAlarmService extends Service {
    private static final String CHANNEL_ID = "edunixo_school_bell";
    private Ringtone ringtone;

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "EDUNIXO School Bell", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Mandatory school bell alarms controlled by the Headmaster schedule.");
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra("bell_title") : null;
        if (title == null || title.trim().isEmpty()) title = "School Bell";
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("EDUNIXO Bell")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(false)
            .setAutoCancel(true)
            .build();
        startForeground(2536, notification);

        AudioManager audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        boolean explicitlySilent = audio != null && audio.getRingerMode() == AudioManager.RINGER_MODE_SILENT;
        if (!explicitlySilent) {
            try {
                Uri uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                ringtone = RingtoneManager.getRingtone(this, uri);
                if (ringtone != null) {
                    ringtone.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                    ringtone.play();
                }
            } catch (Exception ignored) {}
        }
        new Handler(Looper.getMainLooper()).postDelayed(this::stopSelf, 15000L);
        return START_NOT_STICKY;
    }

    @Override public void onDestroy() {
        try { if (ringtone != null && ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
