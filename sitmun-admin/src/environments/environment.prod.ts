// Production environment configuration (static fallback).
// For Docker builds, use the environment.prod.ts.template with envsubst.

import { LogLevel } from '@app/services/log-level.enum';

import packageJson from '../../package.json';

export const environment = {
  production: true,
  apiBaseURL: '/backend', // Change this when there is a real production environment
  logLevel: LogLevel.Error,
  version: packageJson.version,
  buildTimestamp: new Date().toISOString(),
  environmentName: 'production',
  sessionTokenRefreshIntervalMs: 2 * 60 * 1000,
  // Interface languages on the waiting page. The rest of the app uses the database list.
  waitingPageLanguages: ['es', 'en', 'fr', 'ca', 'oc-aranes', 'pt-PT']
};
