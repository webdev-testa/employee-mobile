import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.absen.employee',
  appName: 'Dr.Meow',
  webDir: 'dist',
  plugins: {
    LiveUpdate: {
      readyTimeout: 10000,
      resetOnUpdateFailure: true,
    },
  },
};

export default config;
