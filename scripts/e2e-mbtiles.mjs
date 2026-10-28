#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachChildLifecycle, fail, isWindows, spawnDetached } from './e2e-process.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackRoot = resolve(__dirname, '..');
const mbtilesRoot = join(stackRoot, 'sitmun-addons', 'sitmun-mbtiles');
const prefix = 'e2e-mbtiles';
const gradlew = join(stackRoot, isWindows ? 'gradlew.bat' : 'gradlew');

if (!existsSync(mbtilesRoot) || !existsSync(gradlew)) {
  fail(prefix, `MBTiles module or Gradle wrapper missing at ${mbtilesRoot}`);
}

const child = spawnDetached(gradlew, [':sitmun-mbtiles:bootRun', '--no-daemon', '--args=--server.port=18084'], {
  cwd: stackRoot,
  env: { ...process.env },
});

attachChildLifecycle(child, { prefix });
