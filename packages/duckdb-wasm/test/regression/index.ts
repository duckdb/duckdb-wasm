import * as duckdb from '../../src/';
import { test332 } from './github_332.test';
import { test334 } from './github_334.test';
import { test393 } from './github_393.test';

export function testRegressionAsync(adb: () => duckdb.AsyncDuckDB): void {
    test332(adb);
    test334(adb);
    test393(adb);
}
