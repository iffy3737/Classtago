package com.classtago.app;

import android.Manifest;
import android.content.Intent;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.os.Build;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;

import java.io.OutputStream;
import java.util.concurrent.Executor;

@CapacitorPlugin(
    name = "EdunixoSmart",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class EdunixoSmartPlugin extends Plugin {

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("codeScanner", true);
        out.put("documentScanner", true);
        out.put("biometric", biometricAvailable());
        out.put("deviceCredential", deviceCredentialAvailable());
        call.resolve(out);
    }

    @PluginMethod
    public void scanCode(PluginCall call) {
        try {
            GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(
                    Barcode.FORMAT_QR_CODE,
                    Barcode.FORMAT_AZTEC,
                    Barcode.FORMAT_DATA_MATRIX,
                    Barcode.FORMAT_PDF417,
                    Barcode.FORMAT_CODE_128,
                    Barcode.FORMAT_CODE_39,
                    Barcode.FORMAT_EAN_13,
                    Barcode.FORMAT_EAN_8,
                    Barcode.FORMAT_UPC_A,
                    Barcode.FORMAT_UPC_E
                )
                .enableAutoZoom()
                .build();
            GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(getContext(), options);
            scanner.startScan()
                .addOnSuccessListener(barcode -> {
                    JSObject out = new JSObject();
                    out.put("rawValue", barcode.getRawValue() == null ? "" : barcode.getRawValue());
                    out.put("displayValue", barcode.getDisplayValue() == null ? "" : barcode.getDisplayValue());
                    out.put("format", barcode.getFormat());
                    out.put("valueType", barcode.getValueType());
                    call.resolve(out);
                })
                .addOnCanceledListener(() -> call.reject("Scan cancelled."))
                .addOnFailureListener(error -> call.reject("Native code scanner could not complete.", error));
        } catch (Exception error) {
            call.reject("Native code scanner could not start.", error);
        }
    }

    @PluginMethod
    public void scanDocument(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), EdunixoDocumentScanActivity.class);
            startActivityForResult(call, intent, "documentScanFinished");
        } catch (Exception error) {
            call.reject("Native document scanner could not start.", error);
        }
    }

    @ActivityCallback
    private void documentScanFinished(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null) {
            call.reject("Document scan cancelled.");
            return;
        }
        Intent data = result.getData();
        JSObject out = new JSObject();
        out.put("pageCount", data.getIntExtra("pageCount", 0));
        out.put("fileName", data.getStringExtra("fileName"));
        out.put("savedUri", data.getStringExtra("savedUri"));
        out.put("savedTo", data.getStringExtra("savedTo"));
        call.resolve(out);
    }

    @PluginMethod
    public void savePdf(PluginCall call) {
        try {
            String base64 = call.getString("base64", "");
            String fileName = call.getString("fileName", "Classtago_Document.pdf");

            if (base64 == null || base64.trim().isEmpty()) {
                call.reject("PDF data is empty.");
                return;
            }

            if (!fileName.toLowerCase().endsWith(".pdf")) {
                fileName = fileName + ".pdf";
            }

            byte[] pdfBytes = Base64.decode(base64, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/pdf");
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Classtago");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = getContext().getContentResolver().insert(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    values
                );

                if (uri == null) {
                    call.reject("Android could not create the PDF in Downloads.");
                    return;
                }

                try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                    if (output == null) {
                        throw new IllegalStateException("Could not open the PDF destination.");
                    }
                    output.write(pdfBytes);
                    output.flush();
                }

                ContentValues completed = new ContentValues();
                completed.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, completed, null, null);

                JSObject out = new JSObject();
                out.put("saved", true);
                out.put("fileName", fileName);
                out.put("savedTo", "Downloads/Classtago");
                out.put("uri", uri.toString());
                call.resolve(out);
                return;
            }

            call.reject("PDF download requires Android 10 or newer.");
        } catch (Exception error) {
            call.reject("Could not save PDF to Downloads.", error);
        }
    }

    @PluginMethod
    public void authenticateDevice(PluginCall call) {
        if (!(getActivity() instanceof FragmentActivity)) {
            call.reject("Secure device verification is unavailable in this activity.");
            return;
        }
        final int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        int state = BiometricManager.from(getContext()).canAuthenticate(authenticators);
        if (state != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(biometricStateMessage(state));
            return;
        }
        getActivity().runOnUiThread(() -> {
            Executor executor = ContextCompat.getMainExecutor(getContext());
            BiometricPrompt prompt = new BiometricPrompt((FragmentActivity) getActivity(), executor, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    super.onAuthenticationSucceeded(result);
                    JSObject out = new JSObject();
                    out.put("verified", true);
                    out.put("authenticationType", result.getAuthenticationType());
                    call.resolve(out);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    super.onAuthenticationError(errorCode, errString);
                    call.reject(errString == null ? "Device verification was cancelled." : errString.toString());
                }
            });
            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Verify it is you")
                .setSubtitle("Protect sensitive Classtago school actions")
                .setAllowedAuthenticators(authenticators)
                .setConfirmationRequired(false)
                .build();
            prompt.authenticate(promptInfo);
        });
    }

    private boolean biometricAvailable() {
        int state = BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);
        return state == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private boolean deviceCredentialAvailable() {
        int state = BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL);
        return state == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private static String biometricStateMessage(int state) {
        switch (state) {
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED: return "No fingerprint, face or device credential is enrolled.";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE: return "This device does not have supported secure authentication hardware.";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE: return "Secure authentication hardware is temporarily unavailable.";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED: return "A device security update is required before biometric verification can be used.";
            case BiometricManager.BIOMETRIC_ERROR_UNSUPPORTED: return "This device does not support the requested secure authentication method.";
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN: return "Secure authentication availability could not be determined.";
            default: return "Secure device verification is unavailable.";
        }
    }
}
