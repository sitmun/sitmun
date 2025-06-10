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
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidDatabaseLocation: 'default',
      web: {
        enabled: true
      }
    }
  }
};

export default config;
