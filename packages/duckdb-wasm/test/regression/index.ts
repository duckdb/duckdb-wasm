import * as duckdb from '../../src/';
import { test332 } from './github_332.test';
import { test334 } from './github_334.test';
import { test393 } from './github_393.test';
import { test448 } from './github_448.test';

export function testRegressionAsync(adb: () => duckdb.AsyncDuckDB): void {
    test332(adb);
    test334(adb);
    test393(adb);
    test448(adb);
}
