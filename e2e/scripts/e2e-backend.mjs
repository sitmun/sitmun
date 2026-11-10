#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeH2Changelog } from './e2e-h2-changelog.mjs';
import { attachChildLifecycle, fail, isWindows, spawnDetached } from './e2e-process.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackRoot = resolve(__dirname, '../..');
const backendRoot = join(stackRoot, 'sitmun-backend');
const prefix = 'e2e-backend';
const gradlew = join(stackRoot, isWindows ? 'gradlew.bat' : 'gradlew');

if (!existsSync(backendRoot)) {
  fail(prefix, `Backend module missing at ${backendRoot}`);
}
if (!existsSync(gradlew)) {
  fail(prefix, `Gradle wrapper missing at ${gradlew}`);
}
const externalUrl = process.env.SITMUN_E2E_DATASOURCE_URL;
const testChangelog = join(
  backendRoot,
  'src/test/resources/db/changelog-test/db.changelog-master.yaml',
);

if (externalUrl && !existsSync(testChangelog)) {
  fail(prefix, `Test Liquibase changelog missing at ${testChangelog}`);
}

let h2Changelog;
if (!externalUrl) {
  try {
    h2Changelog = writeH2Changelog(stackRoot, {
      firstRun: process.env.SITMUN_E2E_FIRST_RUN === '1',
    });
  } catch (error) {
    fail(prefix, error instanceof Error ? error.message : String(error));
  }
}

try {
  execSync('java -version 2>&1', { encoding: 'utf8' });
} catch {
  fail(
    prefix,
    'Java is not available on PATH. Install Java 17 (or a JDK that Gradle can use for the Java 17 toolchain).',
  );
}

const datasourceArgs = externalUrl
  ? [
      `--spring.datasource.url=${externalUrl}`,
      `--spring.datasource.driver-class-name=${process.env.SITMUN_E2E_DATASOURCE_DRIVER ?? 'org.postgresql.Driver'}`,
      `--spring.datasource.username=${process.env.SITMUN_E2E_DATASOURCE_USERNAME ?? 'sitmun3'}`,
      `--spring.datasource.password=${process.env.SITMUN_E2E_DATASOURCE_PASSWORD ?? 'sitmun3'}`,
      '--spring.liquibase.drop-first=false',
      `--spring.liquibase.change-log=file:${testChangelog}`,
    ]
  : [
      '--spring.datasource.url=jdbc:h2:mem:sitmun-e2e;DB_CLOSE_DELAY=-1',
      '--spring.datasource.driver-class-name=org.h2.Driver',
      '--spring.datasource.username=sa',
      '--spring.datasource.password=',
      `--spring.liquibase.change-log=file:${h2Changelog}`,
    ];

const springArgs = [
  '--spring.profiles.active=dev',
  '--server.port=18080',
  ...datasourceArgs,
  '--server.forward-headers-strategy=framework',
  '--sitmun.proxy-middleware.url=http://localhost:4400/middleware',
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
