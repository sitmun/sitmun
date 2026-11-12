import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sitmun.mobile.editor',
  appName: 'SITMUN Mobile Editor',
  webDir: 'www',
  server: {
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidDatabaseLocation: 'default',
      androidIsEncryption: false,
      web: {
        enabled: true
      }
    }
  }
};

export default config;
