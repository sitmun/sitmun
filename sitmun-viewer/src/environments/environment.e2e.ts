// E2E environment: same-origin /backend and /middleware proxied to local stack.

import { version } from '../../package.json';

export const environment = {
  production: false,
  hashLocationStrategy: false,
  hideBackgroundImage: true,
  hideDNIEAccess: true,
  apiUrl: '/backend',
  version,
  environmentName: 'E2E',
  buildTimestamp: new Date().toISOString(),
  loginBackgroundImageUrl: '',
  proxyTokenRefreshIntervalMs: 10 * 60 * 1000,
  sessionTokenRefreshIntervalMs: 10 * 60 * 1000,
};
