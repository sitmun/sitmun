import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * H2 end-to-end changelog. Liquibase resolves includes from the changelog file
 * or the Spring classpath, so the wrapper and the test changelog sit in one directory.
 */
export function writeH2Changelog(stackRoot, options = {}) {
  const testDir = join(
    stackRoot,
    'sitmun-backend/src/test/resources/db/changelog-test',
  );
  const menorca = join(stackRoot, 'e2e/fixtures/20_menorca_solrustic_mia_e2e.yaml');
  for (const file of [testDir, menorca]) {
    if (!existsSync(file)) {
      throw new Error(`Liquibase changelog missing at ${file}`);
    }
  }
  const dir = join(stackRoot, 'build', 'e2e-changelog');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(testDir, join(dir, 'changelog-test'), { recursive: true });
  cpSync(menorca, join(dir, '20_menorca_solrustic_mia_e2e.yaml'));
  const wrapper = join(dir, 'db.changelog-e2e.yaml');
  const lines = [
    'databaseChangeLog:',
    '  - include:',
    '      file: changelog-test/db.changelog-master.yaml',
    '      relativeToChangelogFile: true',
  ];
  if (options.firstRun) {
    lines.push(
      '  - changeSet:',
      '      id: e2e-first-run-available',
      '      author: sitmun',
      '      changes:',
      '        - sql:',
      "            sql: \"UPDATE stm_user SET use_pwd = NULL WHERE use_user = 'admin'\"",
    );
  }
  lines.push(
    '  - include:',
    '      file: 20_menorca_solrustic_mia_e2e.yaml',
    '      relativeToChangelogFile: true',
    '',
  );
  writeFileSync(wrapper, lines.join('\n'));
  return wrapper;
}
