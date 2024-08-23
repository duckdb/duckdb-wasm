import * as duckdb from '../../src/';
import { test332 } from './github_332.test';
import { test334 } from './github_334.test';
import { test393 } from './github_393.test';
import { test448 } from './github_448.test';
import { test470 } from './github_470.test';
import { test477 } from './github_477.test';
import { test1467 } from './github_1467.test';
import { test1833 } from './github_1833.test';

export function testRegressionAsync(adb: () => duckdb.AsyncDuckDB): void {
    test332(adb);
    test334(adb);
    test393(adb);
    test448(adb);
    test470(adb);
    test477(adb);
    test1467(adb);
    test1833(adb);
}
