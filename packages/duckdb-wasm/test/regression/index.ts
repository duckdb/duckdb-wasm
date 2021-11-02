import * as duckdb from '../../src/';
import { testGitHubIssue332 } from './github_332.test';
import { testGitHubIssue334 } from './github_334.test';

export function testRegressionAsync(adb: () => duckdb.AsyncDuckDB): void {
    testGitHubIssue332(adb);
    testGitHubIssue334(adb);
}
