import { Capacitor, registerPlugin } from '@capacitor/core';

export type Phase2MlCapabilities = {
  native: boolean;
  textRecognition: boolean;
  devanagariRecognition: boolean;
  translation: boolean;
  speechRecognition: boolean;
  offlineSpeechPreference: boolean;
};

type RecognizeTextOptions = { dataUrl: string; script?: 'latin' | 'devanagari' };
type TranslateOptions = { text: string; sourceLanguage: string; targetLanguage: string };
type SpeechOptions = { languageTag?: string; preferOffline?: boolean };

interface EdunixoMlPluginContract {
  getCapabilities(): Promise<Phase2MlCapabilities>;
  recognizeText(options: RecognizeTextOptions): Promise<{ text: string; script: string }>;
  translateText(options: TranslateOptions): Promise<{ text: string; sourceLanguage: string; targetLanguage: string; modelDownloaded: boolean }>;
  recognizeSpeech(options: SpeechOptions): Promise<{ text: string; languageTag: string; offlinePreferred: boolean }>;
  requestMicrophonePermission(): Promise<{ granted: boolean }>;
}

const EdunixoML = registerPlugin<EdunixoMlPluginContract>('EdunixoML');

export function isPhase2NativeMlAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function getPhase2MlCapabilities(): Promise<Phase2MlCapabilities> {
  if (!Capacitor.isNativePlatform()) {
    return {
      native: false,
      textRecognition: false,
      devanagariRecognition: false,
      translation: false,
      speechRecognition: false,
      offlineSpeechPreference: false,
    };
  }
  return EdunixoML.getCapabilities();
}

function uniqueLines(texts: string[]) {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const text of texts) {
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      const key = line.toLocaleLowerCase();
      if (!line || seen.has(key)) continue;
      seen.add(key);
      rows.push(line);
    }
  }
  return rows.join('\n');
}

export async function recognizeAdmissionDocument(dataUrl: string, interfaceLanguage = 'en') {
  if (!Capacitor.isNativePlatform()) throw new Error('On-device OCR is available in the Classtago Android app.');
  const language = String(interfaceLanguage || 'en').toLowerCase().split('-')[0];
  const texts: string[] = [];

  // English/Latin is common on government/school documents even when the UI is
  // Hindi/Marathi. Run Latin first, then Devanagari for those scripts. No image
  // or OCR text leaves the device.
  const latin = await EdunixoML.recognizeText({ dataUrl, script: 'latin' });
  texts.push(latin.text || '');
  if (language === 'hi' || language === 'mr') {
    const devanagari = await EdunixoML.recognizeText({ dataUrl, script: 'devanagari' });
    texts.push(devanagari.text || '');
  }
  return uniqueLines(texts);
}

export async function translateOnDevice(text: string, sourceLanguage: string, targetLanguage: string) {
  if (!Capacitor.isNativePlatform()) throw new Error('On-device translation is available in the Classtago Android app.');
  if (!text.trim()) throw new Error('Enter text to translate.');
  if (!sourceLanguage || !targetLanguage || sourceLanguage === targetLanguage) throw new Error('Choose two different languages.');
  return EdunixoML.translateText({ text, sourceLanguage, targetLanguage });
}

export async function transcribeOnDevice(languageTag = 'en-IN', preferOffline = true) {
  if (!Capacitor.isNativePlatform()) throw new Error('Voice transcription is available in the Classtago Android app.');
  return EdunixoML.recognizeSpeech({ languageTag, preferOffline });
}

export async function requestNativeMicrophonePermission() {
  if (!Capacitor.isNativePlatform()) return { granted: true };
  return EdunixoML.requestMicrophonePermission();
}
