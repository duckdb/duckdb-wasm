import * as duckdb_blocking from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking';
import * as duckdb from '@duckdb/duckdb-wasm';
import { Benchmark } from 'buffalo-bench';

const noop = () => {};

export function benchmarkIterator(db: () => duckdb_blocking.DuckDBBindings): Benchmark[] {
    const tupleCount = 1000000;
    const benches = [];
    for (const [type, query] of [
        ['boolean', `SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['tinyint', `SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['smallint', `SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['integer', `SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['bigint', `SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['float', `SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['double', `SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['varchar', `SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);`],
    ]) {
        benches.push(
            new Benchmark(`chunks_materialized_${type}_${tupleCount}`, {
                fn: async () => {
                    const conn = db().connect();
                    const result = conn.query(query);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for (const _v of result.getChildAt(0)!) {
                        noop();
                    }
                    conn.close();
                },
            }),
        );
    }
    return benches;
}

export function benchmarkIteratorAsync(db: () => duckdb.AsyncDuckDB): Benchmark[] {
    const tupleCount = 1000000;
    const benches = [];
    for (const [type, query] of [
        ['boolean', `SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['tinyint', `SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['smallint', `SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['integer', `SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['bigint', `SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['float', `SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['double', `SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['varchar', `SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);`],
    ]) {
        benches.push(
            new Benchmark(`chunks_materialized_${type}_async_${tupleCount}`, {
                fn: async () => {
                    const conn = await db().connect();
                    const result = await conn.query(query);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    for (const _v of result.getChildAt(0)!) {
                        noop();
                    }
                    await conn.close();
                },
            }),
        );
    }
    return benches;
}
