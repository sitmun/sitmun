/** @jest-config-loader ts-node */
/** @jest-config-loader-options {"transpileOnly": true} */
import type {Config} from 'jest';

import {createJestConfig} from './jest/create-jest-config';

const config: Config = createJestConfig({collectCoverage: true});

export default config;
