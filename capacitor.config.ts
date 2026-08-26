import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.everydriver.app',
  appName: 'Every Driver Pro',
  webDir: '.output/public',
  server: {
    url: 'https://app.everydriver.pro',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: '#F7FAFC',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
