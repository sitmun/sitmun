import { readFileSync } from 'node:fs';
import path from 'node:path';

import { scanSql } from './sql-placeholder-scanner';

describe('scanSql', () => {
  const cases = JSON.parse(
    readFileSync(
      path.resolve(
        __dirname,
        '../../../../../sitmun-backend/src/test/resources/sql/placeholder-cases.json'
      ),
      'utf8'
    )
  ) as Array<{
    sql: string;
    declared: string[];
    system: string[];
    placements: Array<Record<string, string | number>>;
    violations: Array<Record<string, string | number | null>>;
  }>;

  it('matches the shared placeholder cases', () => {
    expect(cases).toHaveLength(7);
    for (const item of cases) {
      const scan = scanSql(item.sql, item.declared, item.system);
      expect(scan.placements).toEqual(item.placements);
      expect(scan.violations).toEqual(item.violations);
    }
  });
});
