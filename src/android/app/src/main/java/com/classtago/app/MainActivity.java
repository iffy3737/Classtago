package com.classtago.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int MIC_PERMISSION_REQUEST = 9001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BellAlarmPlugin.class);
        registerPlugin(EdunixoMLPlugin.class);
        registerPlugin(EdunixoSmartPlugin.class);
        registerPlugin(EdunixoPushPlugin.class);
        registerPlugin(EdunixoSyncGuardianPlugin.class);
        registerPlugin(EdunixoSmsGatewayPlugin.class);
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{ Manifest.permission.RECORD_AUDIO },
                    MIC_PERMISSION_REQUEST);
            }
        }

        final Bridge bridge = getBridge();
        if (bridge != null) {
            final WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
                webView.setWebChromeClient(new BridgeWebChromeClient(bridge) {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    request.grant(request.getResources());
                                } catch (Exception e) {
                                    request.deny();
                                }
                            }
                        });
                    }
                });
            }
        }
    }

    @Override
    public void onBackPressed() {
        // R2.5.98 URL mode: honor the WebView history instead of exiting the app.
        // If the WebView can go back, do so; otherwise minimize the app (never
        // hard-exit) so the user's place is preserved.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }
}
