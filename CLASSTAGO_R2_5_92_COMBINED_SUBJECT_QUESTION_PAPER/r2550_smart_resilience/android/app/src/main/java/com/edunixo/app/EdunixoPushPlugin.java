package com.edunixo.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(
    name = "EdunixoPush",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class EdunixoPushPlugin extends Plugin {

    @PluginMethod
    public void getState(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("firebaseConfigured", FirebaseOptions.fromResource(getContext()) != null);
        out.put("notificationPermission", notificationPermissionGranted());
        call.resolve(out);
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        if (FirebaseOptions.fromResource(getContext()) == null) {
            call.reject("Firebase Android configuration is pending. Add the approved google-services.json during final Android activation.");
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        resolveToken(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) resolveToken(call);
        else call.reject("Notification permission is required for native Android push.");
    }

    private void resolveToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnSuccessListener(token -> {
                JSObject out = new JSObject();
                out.put("token", token == null ? "" : token);
                out.put("notificationPermission", notificationPermissionGranted());
                call.resolve(out);
            })
            .addOnFailureListener(error -> call.reject("Native push token could not be created.", error));
    }

    private boolean notificationPermissionGranted() {
        return Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }
}
