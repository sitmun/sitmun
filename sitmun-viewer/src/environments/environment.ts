// Development environment configuration.
// Uses the local docker-compose stack backend URL.

import packageJson from '../../package.json';

export const environment = {
  production: false,
  hashLocationStrategy: false,
  hideBackgroundImage: false,
  hideDNIEAccess: true,
  apiUrl: 'http://localhost:9000/backend',
  version: packageJson.version,
  environmentName: 'Development',
  buildTimestamp: new Date().toISOString(),
  loginBackgroundImageUrl: 'assets/logos/barcelona_background.jpg',
  proxyTokenRefreshIntervalMs: 2 * 60 * 1000,
  sessionTokenRefreshIntervalMs: 2 * 60 * 1000
};
