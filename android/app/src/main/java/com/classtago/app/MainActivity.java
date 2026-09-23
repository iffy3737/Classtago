package com.classtago.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    private static final int STORAGE_PERMISSION_CODE = 1001;

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
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url != null && url.startsWith("blob:")) {
                handleBlobDownload(url, mimeType);
            } else {
                handleUrlDownload(url, contentDisposition, mimeType);
            }
        });
    }

    private void handleBlobDownload(String blobUrl, String mimeType) {
        String ext = ".bin";
        if (mimeType != null) {
            if (mimeType.contains("pdf")) ext = ".pdf";
            else if (mimeType.contains("sheet") || mimeType.contains("excel")) ext = ".xlsx";
            else if (mimeType.contains("csv")) ext = ".csv";
        }
        String filename = "classtago_" + System.currentTimeMillis() + ext;
        String mime = mimeType != null ? mimeType : "application/octet-stream";

        String js = "(function(){var xhr=new XMLHttpRequest();xhr.open('GET','" + blobUrl + "',true);" +
                "xhr.responseType='blob';xhr.onload=function(){" +
                "if(xhr.status===200||xhr.status===0){" +
                "var r=new FileReader();r.onloadend=function(){" +
                "var b64=r.result.split(',')[1];" +
                "AndroidDownloader.saveBase64(b64,'" + filename + "','" + mime + "');};" +
                "r.readAsDataURL(xhr.response);}else{" +
                "AndroidDownloader.onError('blob read failed');}};" +
                "xhr.onerror=function(){AndroidDownloader.onError('network');};" +
                "xhr.send();})();";

        getBridge().getWebView().evaluateJavascript(js, null);
    }

    private void handleUrlDownload(String url, String contentDisposition, String mimeType) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            request.addRequestHeader("User-Agent", "Android");
            String filename = "classtago_" + System.currentTimeMillis();
            if (contentDisposition != null && contentDisposition.contains("filename=")) {
                filename = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9).replace("\"", "").trim();
            }
            if (mimeType != null && mimeType.contains("pdf") && !filename.endsWith(".pdf")) filename += ".pdf";
            if (mimeType != null && (mimeType.contains("sheet") || mimeType.contains("excel")) && !filename.endsWith(".xlsx")) filename += ".xlsx";

            request.setTitle(filename);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) dm.enqueue(request);
            Toast.makeText(this, "Downloading " + filename, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    public class DownloadBridge {
        @JavascriptInterface
        public void saveBase64(String base64Data, String filename, String mimeType) {
            try {
                byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File outFile = new File(downloadsDir, filename);
                FileOutputStream fos = new FileOutputStream(outFile);
                fos.write(bytes);
                fos.close();

                final String msg = "Saved to Downloads/" + filename;
                runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
            } catch (Exception e) {
                final String msg = "Save failed: " + e.getMessage();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void onError(String reason) {
            final String msg = "Download error: " + reason;
            runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
        }
    }
}
