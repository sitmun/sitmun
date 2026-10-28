#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachChildLifecycle, fail, isWindows, spawnDetached } from './e2e-process.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stackRoot = resolve(__dirname, '..');
const viewerRoot = join(stackRoot, 'sitmun-viewer');
const prefix = 'e2e-viewer';
const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

if (!existsSync(viewerRoot)) {
  fail(prefix, `Viewer module missing at ${viewerRoot}`);
}
if (!existsSync(join(viewerRoot, 'package.json'))) {
  fail(prefix, `Viewer package.json missing at ${viewerRoot}`);
}
if (!existsSync(join(viewerRoot, 'node_modules'))) {
  fail(prefix, `Viewer dependencies missing. Run: cd ${viewerRoot} && pnpm ci`);
}

function withViewerMemory(env) {
  const prior = env.NODE_OPTIONS || '';
  const nodeOptions = prior.includes('max-old-space-size')
    ? prior
    : `${prior} --max-old-space-size=8192`.trim();
  return { ...env, NODE_OPTIONS: nodeOptions };
}

function envWithViewerNode(env = process.env) {
  const nvmrcPath = join(stackRoot, '.nvmrc');
  if (!existsSync(nvmrcPath)) {
    return withViewerMemory(env);
  }
  const version = readFileSync(nvmrcPath, 'utf8').trim().replace(/^v/, '');
  const required = `v${version}`;
  if (process.version === required) {
    return withViewerMemory(env);
  }
  const nvmDir = env.NVM_DIR || join(homedir(), '.nvm');
  const bin = join(nvmDir, 'versions', 'node', required, 'bin');
  if (!existsSync(join(bin, 'node'))) {
    fail(
      prefix,
      `Viewer requires Node ${required} (${nvmrcPath}). The running Node is ${process.version}.`,
    );
  }
  return withViewerMemory({
    ...env,
    PATH: `${bin}${delimiter}${env.PATH || ''}`,
  });
}

const childEnv = envWithViewerNode(process.env);
console.error('[e2e-viewer] Starting viewer on port 4400...');

const child = spawnDetached(pnpmCmd, ['run', 'start:e2e', '--', '--port', '4400'], {
  cwd: viewerRoot,
  env: childEnv,
});

attachChildLifecycle(child, { prefix });
