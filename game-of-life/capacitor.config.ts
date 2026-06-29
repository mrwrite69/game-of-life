import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrwrite.gameoflife',
  appName: 'Game of Life',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
