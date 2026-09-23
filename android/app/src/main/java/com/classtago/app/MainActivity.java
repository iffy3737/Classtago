package com.classtago.app;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BellAlarmPlugin.class);
        registerPlugin(EdunixoMLPlugin.class);
        registerPlugin(EdunixoSmartPlugin.class);
        registerPlugin(EdunixoPushPlugin.class);
        registerPlugin(EdunixoSyncGuardianPlugin.class);
        registerPlugin(EdunixoSmsGatewayPlugin.class);
        super.onCreate(savedInstanceState);

        getBridge().getWebView().post(this::setupDownloadHandler);
    }

    private void setupDownloadHandler() {
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new DownloadBridge(), "AndroidDownloader");
    }

    public class DownloadBridge {
        @JavascriptInterface
        public void saveBase64(String base64Data, String filename, String mimeType) {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                String mime = mimeType != null && !mimeType.isEmpty() ? mimeType : "application/octet-stream";

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    saveViaMediaStore(bytes, filename, mime);
                } else {
                    saveViaFile(bytes, filename);
                }
            } catch (Exception e) {
                final String msg = "Save failed: " + e.getMessage();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
            }
        }

        private void saveViaMediaStore(byte[] bytes, String filename, String mimeType) throws Exception {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new Exception("MediaStore insert failed");

            OutputStream os = getContentResolver().openOutputStream(uri);
            if (os == null) throw new Exception("Cannot open output stream");
            os.write(bytes);
            os.flush();
            os.close();

            final String msg = "Saved to Downloads/" + filename;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
        }

        private void saveViaFile(byte[] bytes, String filename) throws Exception {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) downloadsDir.mkdirs();
            File outFile = new File(downloadsDir, filename);
            FileOutputStream fos = new FileOutputStream(outFile);
            fos.write(bytes);
            fos.close();

            final String msg = "Saved to Downloads/" + filename;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
        }

        @JavascriptInterface
        public void onError(String reason) {
            final String msg = "Download error: " + reason;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
        }
    }
}
