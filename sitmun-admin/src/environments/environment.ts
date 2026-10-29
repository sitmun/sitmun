// Development environment configuration.
// Uses the local docker-compose stack backend URL.

import { LogLevel } from '@app/services/log-level.enum';

import packageJson from '../../package.json';

export const environment = {
  production: false,
  apiBaseURL: 'http://localhost:9000/backend',
  logLevel: LogLevel.Debug,
  version: packageJson.version,
  buildTimestamp: new Date().toISOString(),
  environmentName: 'development',
  sessionTokenRefreshIntervalMs: 2 * 60 * 1000
};
