import * as duckdb from '../../src/';
import { testGitHubIssue332 } from './github_332.test';
import { testReadmeExamplesAsync } from './readme_release.test';

export function testRegressionAsync(adb: () => duckdb.AsyncDuckDB): void {
    testGitHubIssue332(adb);
    testReadmeExamplesAsync(adb);
}
