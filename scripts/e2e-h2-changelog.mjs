import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * H2 end-to-end changelog. Liquibase resolves includes from the changelog file
 * or the Spring classpath, so the wrapper and the test changelog sit in one directory.
 */
export function writeH2Changelog(stackRoot) {
  const testDir = join(
    stackRoot,
    'sitmun-backend/src/test/resources/db/changelog-test',
  );
  const menorca = join(stackRoot, 'e2e/fixtures/20_menorca_solrustic_mia_e2e.yaml');
  const documentExport = join(stackRoot, 'e2e/fixtures/ensure-document-export-task-type.yaml');
  const documentExportSpec = join(
    stackRoot,
    'e2e/fixtures/ensure-document-export-task-type',
  );
  for (const file of [testDir, menorca, documentExport, documentExportSpec]) {
    if (!existsSync(file)) {
      throw new Error(`Liquibase changelog missing at ${file}`);
    }
  }
  const dir = join(stackRoot, 'build', 'e2e-changelog');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(testDir, join(dir, 'changelog-test'), { recursive: true });
  cpSync(menorca, join(dir, '20_menorca_solrustic_mia_e2e.yaml'));
  cpSync(documentExport, join(dir, 'ensure-document-export-task-type.yaml'));
  cpSync(documentExportSpec, join(dir, 'ensure-document-export-task-type'), { recursive: true });
  const wrapper = join(dir, 'db.changelog-e2e.yaml');
  writeFileSync(
    wrapper,
    [
      'databaseChangeLog:',
      '  - include:',
      '      file: changelog-test/db.changelog-master.yaml',
      '      relativeToChangelogFile: true',
      '  - include:',
      '      file: 20_menorca_solrustic_mia_e2e.yaml',
      '      relativeToChangelogFile: true',
      '  - include:',
      '      file: ensure-document-export-task-type.yaml',
      '      relativeToChangelogFile: true',
      '',
    ].join('\n'),
  );
  return wrapper;
}
