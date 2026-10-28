#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachChildLifecycle, fail, isWindows, spawnDetached } from './e2e-process.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackRoot = resolve(__dirname, '..');
const adminRoot = join(stackRoot, 'sitmun-admin');
const prefix = 'e2e-admin';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

if (!existsSync(adminRoot)) {
  fail(prefix, `Admin module missing at ${adminRoot}`);
}
if (!existsSync(join(adminRoot, 'package.json'))) {
  fail(prefix, `Admin package.json missing at ${adminRoot}`);
}
if (!existsSync(join(adminRoot, 'node_modules'))) {
  fail(prefix, `Admin dependencies missing. Run: cd ${adminRoot} && pnpm ci`);
}

const child = spawnDetached(pnpmCmd, ['run', 'start:e2e', '--', '--port', '4300'], {
  cwd: adminRoot,
  env: process.env,
});

attachChildLifecycle(child, { prefix });
