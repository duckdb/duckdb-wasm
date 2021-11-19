import * as duckdb from './targets/duckdb';
import * as blocking_browser from './targets/duckdb-browser-blocking';
import * as blocking_node from './targets/duckdb-node-blocking';

exports = {
    duckdb,
    blocking_browser,
    blocking_node,
};
