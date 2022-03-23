import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-blocking';
import Benchmark from 'buffalo-bench/lib';

interface Run {
    name: string;
    data: string;
    reduceM4: string;
    reduceAM4: string;
}

export function benchmarkAM4(db: () => duckdb.DuckDBBindings): Benchmark[] {
    const runs: Run[] = [];
    const pixels = 1000;
    const base = 'make_timestamp(2022, 3, 24, 0, 0, 0)';
    for (const tupleCount of [1000, 10000, 1000000, 10000000]) {
        const name = `dimensionality_${tupleCount}`;
        runs.push({
            name: name,
            data: `
                create table data as select x, random() as y from generate_series(${base} - interval ${tupleCount} second, ${base}, interval 1 second) t(x);
            `,
            reduceM4: `
                with m4 as (
                    select min(x) as min_x, max(x) as max_x,
                        min(y) as min_y, max(y) as max_y,
                        round(${pixels} * date_part('epoch', x - (${base} - interval ${tupleCount} second)) / date_part('epoch', interval ${tupleCount} second)) AS bin
                    from data group by bin
                )
                select x, y from m4, data
                where bin = round(${pixels} * date_part('epoch', x - (${base} - interval ${tupleCount} second)) / date_part('epoch', interval ${tupleCount} second))
                and (y = min_y or y = max_y or x = min_x or x = max_x)
            `,
            reduceAM4: `
                select min(x), arg_min(y, x), max(x), arg_min(y, x),
                       min(y), arg_min(x, y), max(y), arg_max(x, y),
                       round(${pixels} * date_part('epoch', x - (${base} - interval ${tupleCount} second)) / date_part('epoch', interval ${tupleCount} second)) AS bin
                from data group by bin
            `,
        });
    }

    const benches = [];
    for (const run of runs) {
        let conn: duckdb.DuckDBConnection;
        benches.push(
            new Benchmark(`${run.name}_am4`, {
                before: () => {
                    conn = db().connect();
                    conn.query(run.data);
                },
                fn: () => {
                    conn.query(run.reduceAM4);
                },
                after: () => {
                    conn.query(`DROP TABLE IF EXISTS data`);
                    conn.close();
                },
                onError: e => {
                    console.log(e);
                },
            }),
        );
        benches.push(
            new Benchmark(`${run.name}_m4`, {
                before: () => {
                    conn = db().connect();
                    conn.query(run.data);
                },
                fn: () => {
                    conn.query(run.reduceM4);
                },
                after: () => {
                    conn.query(`DROP TABLE IF EXISTS data`);
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
