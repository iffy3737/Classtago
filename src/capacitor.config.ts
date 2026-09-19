import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.classtago.app',
  appName: 'Classtago',
  webDir: 'mobile-dist',
  server: {
    // R2.5.98 URL mode: the native shell loads the live Classtago website so
    // every web/backend update is reflected instantly without an APK rebuild.
    url: 'https://classtago.in/?edunixoApp=1',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'edunixo-production-final.onrender.com',
      '*.onrender.com',
      '*.supabase.co',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    CapacitorHttp: {
      // R2.5.98 URL mode keeps native fetch override disabled so that the live
      // website's own /api routing and cookie handling work unchanged.
      enabled: false,
    },
    SystemBars: {
      insetsHandling: 'css',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 800,
      backgroundColor: '#F7F9FF',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#F7F9FF',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
