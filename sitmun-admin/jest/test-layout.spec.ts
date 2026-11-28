import * as fs from 'fs';
import * as path from 'path';

import {createJestConfig} from './create-jest-config';

const ROOT = path.join(__dirname, '..');

function specsUnder(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return specsUnder(full);
    }
    return entry.name.endsWith('.spec.ts') ? [path.relative(ROOT, full)] : [];
  });
}

describe('admin test layout (#428)', () => {
  it('keeps specs out of src/assets, which every build copies', () => {
    expect(specsUnder(path.join(ROOT, 'src', 'assets'))).toEqual([]);
  });

  it('does not run specs from build output', () => {
    expect(createJestConfig({collectCoverage: false}).testPathIgnorePatterns).toContain('<rootDir>/dist/');
  });
});
