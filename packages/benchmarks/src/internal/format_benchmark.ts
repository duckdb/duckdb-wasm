import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as arrow from 'apache-arrow';
import Benchmark from 'buffalo-bench/lib/index';

interface Container<T> {
    value: T | null;
}

export function benchmarkFormat(db: () => duckdb.DuckDBBindings): Benchmark[] {
    const benches = [];
    for (const tupleCount of [1000, 10000, 1000000, 10000000]) {
        let container: Container<arrow.Table<{ foo: arrow.Float64 }>> = {
            value: null,
        };
        benches.push(
            new Benchmark(`scan_double_columns_iterator_${tupleCount}`, {
                before: async () => {
                    const conn = db().connect();
                    container.value = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                    conn.close();
                },
                fn: async () => {
                    let sum = 0;
                    let count = 0;
                    for (const v of container.value!.getColumnAt(0)!) {
                        sum += v!;
                        ++count;
                    }
                    if (count != tupleCount || sum != (tupleCount * (tupleCount + 1)) / 2) {
                        console.log(
                            `1 WRONG RESULT ${count} ${tupleCount} ${sum} ${(tupleCount * (tupleCount + 1)) / 2}`,
                        );
                    }
                },
            }),
        );
        container = {
            value: null,
        };
        benches.push(
            new Benchmark(`scan_double_rows_iterator_${tupleCount}`, {
                before: async () => {
                    const conn = db().connect();
                    container.value = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                    conn.close();
                },
                fn: async () => {
                    let sum = 0;
                    let count = 0;
                    for (const row of container.value!) {
                        sum += row.foo!;
                        ++count;
                    }
                    if (count != tupleCount || sum != (tupleCount * (tupleCount + 1)) / 2) {
                        console.log(
                            `2 WRONG RESULT ${count} ${tupleCount} ${sum} ${(tupleCount * (tupleCount + 1)) / 2}`,
                        );
                    }
                },
            }),
        );
        container = {
            value: null,
        };
        benches.push(
            new Benchmark(`scan_double_rows_iterator_bind_${tupleCount}`, {
                before: async () => {
                    const conn = db().connect();
                    container.value = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                    conn.close();
                },
                fn: async () => {
                    let sum = 0;
                    let count = 0;
                    let action: (index: number) => void;
                    container.value!.scan(
                        index => {
                            action(index);
                        },
                        batch => {
                            action = (index: number) => {
                                sum += batch.getChildAt(0)!.get(index);
                                ++count;
                            };
                        },
                    );
                    if (count != tupleCount || sum != (tupleCount * (tupleCount + 1)) / 2) {
                        console.log(
                            `3 WRONG RESULT ${count} ${tupleCount} ${sum} ${(tupleCount * (tupleCount + 1)) / 2}`,
                        );
                    }
                },
            }),
        );
    }
    return benches;
}
