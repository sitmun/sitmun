// E2E environment: same-origin /backend proxied to local backend.
import { LogLevel } from '@app/services/log-level.enum';

import packageJson from '../../package.json';

export const environment = {
  production: false,
  apiBaseURL: '/backend',
  logLevel: LogLevel.Error,
  version: packageJson.version,
  buildTimestamp: new Date().toISOString(),
  environmentName: 'e2e',
  sessionTokenRefreshIntervalMs: 10 * 60 * 1000
};
