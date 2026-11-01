#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeH2Changelog } from './e2e-h2-changelog.mjs';
import { attachChildLifecycle, fail, isWindows, spawnDetached } from './e2e-process.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackRoot = resolve(__dirname, '..');
const backendRoot = join(stackRoot, 'sitmun-backend');
const prefix = 'e2e-backend-mobile';
const gradlew = join(stackRoot, isWindows ? 'gradlew.bat' : 'gradlew');

if (!existsSync(backendRoot)) {
  fail(prefix, `Backend module missing at ${backendRoot}`);
}
if (!existsSync(gradlew)) {
  fail(prefix, `Gradle wrapper missing at ${gradlew}`);
}
let changelog;
try {
  changelog = writeH2Changelog(stackRoot);
} catch (error) {
  fail(prefix, error instanceof Error ? error.message : String(error));
}

const springArgs = [
  '--spring.profiles.active=dev',
  '--server.port=18080',
  '--spring.datasource.url=jdbc:h2:mem:sitmun-e2e-mobile;DB_CLOSE_DELAY=-1',
  '--spring.datasource.driver-class-name=org.h2.Driver',
  '--spring.datasource.username=sa',
  '--spring.datasource.password=',
  `--spring.liquibase.change-log=file:${changelog}`,
  '--server.forward-headers-strategy=framework',
  '--sitmun.proxy-middleware.url=http://localhost:18081/middleware',
].join(' ');

const child = spawnDetached(gradlew, [':sitmun-backend:bootRun', '--no-daemon', `--args=${springArgs}`], {
  cwd: stackRoot,
  env: {
    ...process.env,
    SITMUN_USER_SECRET: 'test-only-insecure-user-secret-32-bytes',
    SITMUN_PROXY_MIDDLEWARE_SECRET: 'test-only-insecure-middleware-secret',
  },
});

attachChildLifecycle(child, { prefix });
