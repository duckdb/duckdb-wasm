import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking';
import { Benchmark } from 'buffalo-bench';
import { Int32 } from 'apache-arrow';

interface Run {
    name: string;
    queryUDF: string;
    queryBaseline: string;
    udf: (...args: any[]) => any;
}

export function benchmarkUDF(db: () => duckdb.DuckDBBindings): Benchmark[] {
    const runs: Run[] = [];
    for (const tupleCount of [1000, 10000, 1000000, 10000000]) {
        const udf_name = `udf_scan_${tupleCount}`;
        runs.push({
            name: udf_name,
            queryUDF: `SELECT max(${udf_name}(v::INTEGER)) as foo FROM generate_series(1, ${tupleCount}) as t(v)`,
            queryBaseline: `SELECT max(v::INTEGER) as foo FROM generate_series(1, ${tupleCount}) as t(v)`,
            udf: (a: number, b: number, c: number) => a + b + c,
        });
    }

    const benches = [];
    for (const run of runs) {
        let conn: duckdb.DuckDBConnection;
        benches.push(
            new Benchmark(run.name, {
                before: () => {
                    conn = db().connect();
                    conn.createScalarFunction(run.name, new Int32(), run.udf);
                },
                fn: () => {
                    conn.query(run.queryUDF);
                },
                after: () => {
                    conn.close();
                },
                onError: e => {
                    console.log(e);
                },
            }),
        );
        benches.push(
            new Benchmark(`${run.name}_baseline`, {
                before: () => {
                    conn = db().connect();
                },
                fn: () => {
                    conn.query(run.queryBaseline);
                },
                after: () => {
                    conn.close();
                },
                onError: e => {
                    console.log(e);
                },
            }),
        );
    }
    return benches;
}
