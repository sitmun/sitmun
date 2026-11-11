import {readFileSync} from 'node:fs';

import {createJestConfig} from './create-jest-config';

const jestConfig = createJestConfig({collectCoverage: false});
const coverageConfig = createJestConfig({collectCoverage: true});

function packageScripts(): Record<string, string> {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
  };
  return pkg.scripts;
}

describe('Jest coverage contract', () => {
  const scripts = packageScripts();

  it('does not collect coverage on the default config pnpm test loads', () => {
    expect(jestConfig.collectCoverage).toBe(false);
  });

  it('writes lcov under coverage/admin-app from the coverage config', () => {
    expect(jestConfig.coverageDirectory).toBe('coverage/admin-app');
    expect(coverageConfig.coverageDirectory).toBe('coverage/admin-app');
    expect(coverageConfig.collectCoverage).toBe(true);
    expect(coverageConfig.coverageReporters).toEqual(['lcovonly', 'text']);
  });

  it('splits commands: local test never asks for coverage', () => {
    expect(scripts['test']).toBe('jest');
    expect(scripts['test:watch']).toBe('jest --watch');
    expect(scripts['test']).not.toMatch(/coverage/);
    expect(scripts['test:watch']).not.toMatch(/coverage/);
    expect(scripts['test:coverage']).toBeDefined();
    expect(scripts['test:coverage']).not.toMatch(/(?:^|\s)--coverage(?:\s|$)/);
    expect(scripts['test:coverage']).toMatch(/jest\.coverage\.config/);
  });

  it('keeps thin jest config entrypoints wired to the factory', () => {
    expect(readFileSync('jest.config.ts', 'utf8')).toContain(
      "createJestConfig({collectCoverage: false})"
    );
    expect(readFileSync('jest.coverage.config.ts', 'utf8')).toContain(
      "createJestConfig({collectCoverage: true})"
    );
  });

  it('maps AG Grid, echarts, and Material barrels onto Jest stubs', () => {
    const mapper = jestConfig.moduleNameMapper as Record<string, string>;
    expect(mapper['^@ag-grid-community/angular$']).toContain('jest/stubs/ag-grid-angular');
    expect(mapper['^@ag-grid-community/core$']).toContain('jest/stubs/ag-grid-core');
    expect(mapper['^echarts$']).toContain('jest/stubs/echarts');
    expect(mapper['^ngx-echarts$']).toContain('jest/stubs/ngx-echarts');
    expect(mapper['^@app/material-module$']).toContain('jest/stubs/material-testing.module');
    expect(mapper['[/\\\\]material-module$']).toContain('jest/stubs/material-testing.module');
  });

  it('keeps restoreMocks on for compile-once shared providers', () => {
    expect(jestConfig.restoreMocks).toBe(true);
    expect(coverageConfig.restoreMocks).toBe(true);
  });
});
