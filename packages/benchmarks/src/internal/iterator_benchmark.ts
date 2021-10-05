import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as format from '../utils/format';
import Benchmark from 'buffalo-bench/lib/index';

const noop = () => {};

export function benchmarkIterator(db: () => duckdb.DuckDBBindings): Benchmark[] {
    const tupleCount = 1000000;
    const benches = [];
    for (const [type, query] of [
        ['BOOLEAN', `SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['TINYINT', `SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['SMALLINT', `SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['INTEGER', `SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['BIGINT', `SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['FLOAT', `SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['DOUBLE', `SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['VARCHAR', `SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);`],
    ]) {
        benches.push(
            new Benchmark(`Chunks | 1 column | ${format.formatThousands(tupleCount)} rows | materialized | ${type}`, {
                fn: async () => {
                    const conn = db().connect();
                    const result = conn.runQuery(query);
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
        ['BOOLEAN', `SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['TINYINT', `SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['SMALLINT', `SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['INTEGER', `SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['BIGINT', `SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['FLOAT', `SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['DOUBLE', `SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);`],
        ['VARCHAR', `SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);`],
    ]) {
        benches.push(
            new Benchmark(`Chunks | 1 column | ${format.formatThousands(tupleCount)} rows | materialized | ${type}`, {
                fn: async () => {
                    const conn = await db().connect();
                    const result = await conn.runQuery(query);
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
