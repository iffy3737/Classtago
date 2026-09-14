package com.classtago.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class EdunixoDocumentScanActivity extends AppCompatActivity {
    private ActivityResultLauncher<IntentSenderRequest> scannerLauncher;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        scannerLauncher = registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), result -> {
            if (result.getResultCode() != Activity.RESULT_OK) {
                setResult(Activity.RESULT_CANCELED);
                finish();
                return;
            }
            try {
                GmsDocumentScanningResult scan = GmsDocumentScanningResult.fromActivityResultIntent(result.getData());
                if (scan == null || scan.getPdf() == null) {
                    fail("Document scanner did not return a PDF.");
                    return;
                }
                Uri source = scan.getPdf().getUri();
                SaveResult saved = savePdf(source);
                Intent response = new Intent();
                response.putExtra("pageCount", scan.getPages() == null ? 0 : scan.getPages().size());
                response.putExtra("fileName", saved.fileName);
                response.putExtra("savedUri", saved.uri.toString());
                response.putExtra("savedTo", saved.location);
                setResult(Activity.RESULT_OK, response);
                finish();
            } catch (Exception error) {
                fail(error.getMessage() == null ? "Scanned PDF could not be saved." : error.getMessage());
            }
        });

        GmsDocumentScannerOptions options = new GmsDocumentScannerOptions.Builder()
            .setGalleryImportAllowed(true)
            .setPageLimit(20)
            .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_PDF)
            .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            .build();
        GmsDocumentScanner scanner = GmsDocumentScanning.getClient(options);
        scanner.getStartScanIntent(this)
            .addOnSuccessListener(intentSender -> scannerLauncher.launch(new IntentSenderRequest.Builder(intentSender).build()))
            .addOnFailureListener(error -> fail(error.getMessage() == null ? "ML Kit document scanner is unavailable on this device." : error.getMessage()));
    }

    private SaveResult savePdf(Uri source) throws Exception {
        String stamp = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(new Date());
        String fileName = "Classtago-Scan-" + stamp + ".pdf";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Classtago");
            Uri destination = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (destination == null) throw new IllegalStateException("Android Downloads storage is unavailable.");
            copy(source, destination);
            return new SaveResult(destination, fileName, "Downloads/Classtago");
        }
        File root = getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
        if (root == null) root = getFilesDir();
        File dir = new File(root, "Classtago");
        if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Classtago document folder could not be created.");
        File target = new File(dir, fileName);
        try (InputStream input = getContentResolver().openInputStream(source); OutputStream output = new FileOutputStream(target)) {
            if (input == null) throw new IllegalStateException("Scanned PDF could not be opened.");
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) output.write(buffer, 0, read);
        }
        return new SaveResult(Uri.fromFile(target), fileName, "Classtago app documents");
    }

    private void copy(Uri source, Uri destination) throws Exception {
        try (InputStream input = getContentResolver().openInputStream(source); OutputStream output = getContentResolver().openOutputStream(destination)) {
            if (input == null || output == null) throw new IllegalStateException("Scanned PDF could not be copied.");
            byte[] buffer = new byte[16 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) output.write(buffer, 0, read);
        }
    }

    private void fail(String message) {
        Intent response = new Intent();
        response.putExtra("error", message);
        setResult(Activity.RESULT_CANCELED, response);
        finish();
    }

    private static class SaveResult {
        final Uri uri;
        final String fileName;
        final String location;
        SaveResult(Uri uri, String fileName, String location) {
            this.uri = uri;
            this.fileName = fileName;
            this.location = location;
        }
    }
}
