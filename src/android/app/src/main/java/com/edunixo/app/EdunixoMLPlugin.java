package com.edunixo.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(
    name = "EdunixoML",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class EdunixoMLPlugin extends Plugin {

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("textRecognition", true);
        out.put("devanagariRecognition", true);
        out.put("translation", true);
        out.put("speechRecognition", SpeechRecognizer.isRecognitionAvailable(getContext()));
        out.put("offlineSpeechPreference", true);
        call.resolve(out);
    }

    @PluginMethod
    public void recognizeText(PluginCall call) {
        String dataUrl = call.getString("dataUrl", "");
        String script = call.getString("script", "latin");
        if (dataUrl == null || dataUrl.trim().isEmpty()) {
            call.reject("Image data is required for OCR.");
            return;
        }
        try {
            int comma = dataUrl.indexOf(',');
            String encoded = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
            byte[] bytes = Base64.decode(encoded.getBytes(StandardCharsets.UTF_8), Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("The selected image could not be decoded.");
                return;
            }
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = "devanagari".equalsIgnoreCase(script)
                ? TextRecognition.getClient(new DevanagariTextRecognizerOptions.Builder().build())
                : TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                .addOnSuccessListener(result -> {
                    JSObject out = new JSObject();
                    out.put("text", result.getText() == null ? "" : result.getText());
                    out.put("script", "devanagari".equalsIgnoreCase(script) ? "devanagari" : "latin");
                    call.resolve(out);
                    recognizer.close();
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    recognizer.close();
                    bitmap.recycle();
                    call.reject("On-device OCR failed.", error);
                });
        } catch (Exception error) {
            call.reject("On-device OCR could not read this image.", error);
        }
    }

    @PluginMethod
    public void translateText(PluginCall call) {
        String text = call.getString("text", "");
        String source = call.getString("sourceLanguage", "en");
        String target = call.getString("targetLanguage", "hi");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Text is required for translation.");
            return;
        }
        if (source == null || target == null || source.equalsIgnoreCase(target)) {
            call.reject("Choose two different translation languages.");
            return;
        }
        try {
            TranslatorOptions options = new TranslatorOptions.Builder()
                .setSourceLanguage(source.toLowerCase(Locale.ROOT))
                .setTargetLanguage(target.toLowerCase(Locale.ROOT))
                .build();
            Translator translator = Translation.getClient(options);
            DownloadConditions conditions = new DownloadConditions.Builder().build();
            translator.downloadModelIfNeeded(conditions)
                .continueWithTask(task -> {
                    if (!task.isSuccessful()) throw task.getException() != null ? task.getException() : new IllegalStateException("Language model download failed.");
                    return translator.translate(text);
                })
                .addOnSuccessListener(translated -> {
                    JSObject out = new JSObject();
                    out.put("text", translated == null ? "" : translated);
                    out.put("sourceLanguage", source);
                    out.put("targetLanguage", target);
                    out.put("modelDownloaded", true);
                    call.resolve(out);
                    translator.close();
                })
                .addOnFailureListener(error -> {
                    translator.close();
                    call.reject("On-device translation failed. The language model may need internet for its first download.", error);
                });
        } catch (Exception error) {
            call.reject("On-device translation could not start.", error);
        }
    }

    @PluginMethod
    public void recognizeSpeech(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }
        startSpeechRecognition(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) startSpeechRecognition(call);
        else call.reject("Microphone permission is required for lecture voice notes.");
    }

    private void startSpeechRecognition(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Speech recognition is not available on this Android device.");
            return;
        }
        String languageTag = call.getString("languageTag", "en-IN");
        boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", true));
        getActivity().runOnUiThread(() -> {
            final SpeechRecognizer recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            final AtomicBoolean finished = new AtomicBoolean(false);
            RecognitionListener listener = new RecognitionListener() {
                private void finishWithError(String message) {
                    if (!finished.compareAndSet(false, true)) return;
                    try { recognizer.destroy(); } catch (Exception ignored) {}
                    call.reject(message);
                }
                @Override public void onReadyForSpeech(Bundle params) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int error) { finishWithError(speechErrorMessage(error)); }
                @Override public void onResults(Bundle results) {
                    if (!finished.compareAndSet(false, true)) return;
                    ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    String text = matches == null || matches.isEmpty() ? "" : matches.get(0);
                    JSObject out = new JSObject();
                    out.put("text", text == null ? "" : text);
                    out.put("languageTag", languageTag);
                    out.put("offlinePreferred", preferOffline);
                    try { recognizer.destroy(); } catch (Exception ignored) {}
                    call.resolve(out);
                }
                @Override public void onPartialResults(Bundle partialResults) {}
                @Override public void onEvent(int eventType, Bundle params) {}
            };
            recognizer.setRecognitionListener(listener);
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
            try {
                recognizer.startListening(intent);
            } catch (Exception error) {
                try { recognizer.destroy(); } catch (Exception ignored) {}
                call.reject("Speech recognition could not start.", error);
            }
        });
    }

    private static String speechErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "Voice recognition audio error.";
            case SpeechRecognizer.ERROR_CLIENT: return "Voice recognition was interrupted.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Microphone permission is required.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "Offline speech model is unavailable and the network recognizer could not respond.";
            case SpeechRecognizer.ERROR_NO_MATCH: return "No clear speech was recognized. Try again closer to the microphone.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "Speech recognizer is busy. Try again in a moment.";
            case SpeechRecognizer.ERROR_SERVER: return "The device speech service could not complete recognition.";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "No speech was detected.";
            default: return "Voice recognition could not complete.";
        }
    }
}
