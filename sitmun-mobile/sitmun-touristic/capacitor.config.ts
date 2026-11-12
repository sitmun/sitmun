import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.sitmun.mobile.touristic',
  appName: 'SITMUN Touristic',
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
      androidDatabaseLocation: 'default',
      web: {
        enabled: true
      },
      androidIsEncryption: false
    },
    Geolocation: {}
  }
};

export default config;
