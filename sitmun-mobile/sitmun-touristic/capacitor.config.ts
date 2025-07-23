import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'touristic-mobile-app',
  webDir: 'www',
  server: {
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Http: {
      allowCleartext: true,
      disableIntercept: true,
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidDatabaseLocation: 'default',
      web: {
        enabled: true
      },
      androidIsEncryption: false
    }
  }
};

export default config;
