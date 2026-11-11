import type {Config} from 'jest';

export type JestRunMode = {
  readonly collectCoverage: boolean;
};

const HEAVY_GUI_STUBS: Record<string, string> = {
  '^@ag-grid-community/angular$': '<rootDir>/jest/stubs/ag-grid-angular.ts',
  '^@ag-grid-community/core$': '<rootDir>/jest/stubs/ag-grid-core.ts',
  '^@ag-grid-community/client-side-row-model$':
    '<rootDir>/jest/stubs/ag-grid-client-side-row-model.ts',
  '^@ag-grid-community/csv-export$': '<rootDir>/jest/stubs/ag-grid-csv-export.ts',
  '^@ag-grid-community/infinite-row-model$':
    '<rootDir>/jest/stubs/ag-grid-infinite-row-model.ts',
  '^echarts$': '<rootDir>/jest/stubs/echarts.ts',
  '^ngx-echarts$': '<rootDir>/jest/stubs/ngx-echarts.ts'
};

export function createJestConfig(mode: JestRunMode): Config {
  return {
    preset: 'jest-preset-angular',
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 30_000,
    collectCoverage: mode.collectCoverage,
    coverageDirectory: 'coverage/admin-app',
    coverageProvider: 'v8',
    coverageReporters: mode.collectCoverage ? ['lcovonly', 'text'] : undefined,
    coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/jest/'],
    reporters: ['default'],
    testEnvironment: 'jsdom',
    moduleNameMapper: {
      d3: '<rootDir>/node_modules/d3/dist/d3.min.js',
      '^@app/domain$': '<rootDir>/src/app/domain',
      '^@app/domain/(.*)$': '<rootDir>/src/app/domain/$1',
      '^@app/material-module$': '<rootDir>/jest/stubs/material-testing.module.ts',
      '[/\\\\]material-module$': '<rootDir>/jest/stubs/material-testing.module.ts',
      '^@app/frontend-gui/src/lib/public_api$':
        '<rootDir>/src/app/frontend-gui/src/lib/public_api',
      '^@app/core/config/external-configuration.service$':
        '<rootDir>/src/app/core/config/external-configuration.service',
      '^@app/core/hal/resource/resource.service$':
        '<rootDir>/src/app/core/hal/resource/resource.service',
      '^@app/core/hal/config/external.service$':
        '<rootDir>/src/app/core/hal/config/external.service',
      '^@app/(.*)$': '<rootDir>/src/app/$1',
      '^@config$': '<rootDir>/src/config.ts',
      '^@environments/(.*)$': '<rootDir>/src/environments/$1',
      ...HEAVY_GUI_STUBS
    },
    setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
    transformIgnorePatterns: [
      '/node_modules/(?!(\\.pnpm/(@angular\\+|rxjs@)|@angular/|rxjs/|.*\\.mjs$))'
    ],
    testMatch: ['**/*.spec.ts'],
    testPathIgnorePatterns: ['/node_modules/']
  };
}
