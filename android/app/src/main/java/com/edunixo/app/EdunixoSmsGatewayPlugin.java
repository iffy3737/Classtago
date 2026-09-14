package com.edunixo.app;

import android.Manifest;
import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.telephony.SmsManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(
    name = "EdunixoSmsGateway",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS })
    }
)
public class EdunixoSmsGatewayPlugin extends Plugin {
    private static final long SEND_TIMEOUT_MS = 60_000L;

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("telephonyAvailable", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING));
        out.put("permissionGranted", getPermissionState("sms") == PermissionState.GRANTED);
        out.put("deviceKey", buildDeviceKey());
        out.put("deviceName", buildDeviceName());
        call.resolve(out);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject out = new JSObject();
            out.put("permissionGranted", true);
            call.resolve(out);
            return;
        }
        requestPermissionForAlias("sms", call, "smsPermissionCallback");
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        JSObject out = new JSObject();
        out.put("permissionGranted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(out);
    }

    @PluginMethod
    public void sendSms(PluginCall call) {
        if (!getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_MESSAGING)) {
            call.reject("This Android device does not support SIM SMS messaging.");
            return;
        }
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission is required. Enable SMS Gateway from the authorized school device first.");
            return;
        }

        String destination = normalizeDestination(call.getString("destination", ""));
        String message = call.getString("message", "").trim();
        if (destination.isEmpty()) {
            call.reject("A valid SMS destination is required.");
            return;
        }
        if (message.isEmpty()) {
            call.reject("SMS message text is required.");
            return;
        }
        if (message.length() > 4000) {
            call.reject("SMS message exceeds the EDUNIXO gateway safety limit of 4000 characters.");
            return;
        }

        try {
            sendAndAwaitCarrier(call, destination, message);
        } catch (Exception error) {
            call.reject("Native SIM SMS could not be submitted.", error);
        }
    }

    private void sendAndAwaitCarrier(PluginCall call, String destination, String message) {
        final SmsManager manager = SmsManager.getDefault();
        final ArrayList<String> parts = manager.divideMessage(message);
        final int total = Math.max(1, parts.size());
        final String action = getContext().getPackageName() + ".EDUNIXO_SMS_SENT." + System.nanoTime();
        final AtomicInteger completed = new AtomicInteger(0);
        final AtomicBoolean failed = new AtomicBoolean(false);
        final AtomicBoolean finished = new AtomicBoolean(false);
        final String reference = "SIM-" + System.currentTimeMillis();
        final Handler handler = new Handler(Looper.getMainLooper());

        final BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (getResultCode() != Activity.RESULT_OK) failed.set(true);
                if (completed.incrementAndGet() >= total && finished.compareAndSet(false, true)) {
                    safeUnregister(this);
                    JSObject out = new JSObject();
                    out.put("success", !failed.get());
                    out.put("reference", reference);
                    out.put("parts", total);
                    out.put("destination", destination);
                    if (failed.get()) call.reject("Android telephony reported that the SMS could not be sent.");
                    else call.resolve(out);
                }
            }
        };

        IntentFilter filter = new IntentFilter(action);
        if (Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        else getContext().registerReceiver(receiver, filter);

        ArrayList<PendingIntent> sentIntents = new ArrayList<>();
        for (int i = 0; i < total; i++) {
            Intent sent = new Intent(action).setPackage(getContext().getPackageName());
            sent.putExtra("part", i);
            PendingIntent pending = PendingIntent.getBroadcast(
                getContext(),
                (int) ((System.currentTimeMillis() + i) & 0x7fffffff),
                sent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            sentIntents.add(pending);
        }

        handler.postDelayed(() -> {
            if (finished.compareAndSet(false, true)) {
                safeUnregister(receiver);
                call.reject("Timed out while waiting for Android SMS send confirmation.");
            }
        }, SEND_TIMEOUT_MS);

        if (total == 1) manager.sendTextMessage(destination, null, message, sentIntents.get(0), null);
        else manager.sendMultipartTextMessage(destination, null, parts, sentIntents, null);
    }

    private void safeUnregister(BroadcastReceiver receiver) {
        try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) { }
    }

    private String normalizeDestination(String value) {
        if (value == null) return "";
        String raw = value.trim();
        boolean plus = raw.startsWith("+");
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() < 10 || digits.length() > 15) return "";
        return plus ? "+" + digits : digits;
    }

    private String buildDeviceName() {
        String manufacturer = Build.MANUFACTURER == null ? "Android" : Build.MANUFACTURER.trim();
        String model = Build.MODEL == null ? "Device" : Build.MODEL.trim();
        String combined = (manufacturer + " " + model).trim();
        if (combined.isEmpty()) return "EDUNIXO Android Gateway";
        return combined.substring(0, Math.min(combined.length(), 120));
    }

    private String buildDeviceKey() {
        try {
            String androidId = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
            String source = getContext().getPackageName() + ":" + (androidId == null ? buildDeviceName() : androidId);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder("android-");
            for (int i = 0; i < Math.min(12, bytes.length); i++) out.append(String.format(Locale.US, "%02x", bytes[i]));
            return out.toString();
        } catch (Exception ignored) {
            return "android-" + Integer.toHexString((getContext().getPackageName() + buildDeviceName()).hashCode());
        }
    }
}
