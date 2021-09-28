import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import * as arrow from 'apache-arrow';
import * as format from './utils/format';
import kleur from 'kleur';
import { addAsync, suite, cycle } from './bench';

export function benchmarkFormat(db: () => duckdb.DuckDBBindings): void {
    const tupleSize = 8;
    for (const tupleCount of [1000, 10000, 1000000, 10000000]) {
        suite(
            `Single DOUBLE column | ${tupleCount} rows`,
            addAsync('columns (iterator)', async () => {
                const conn = db().connect();
                const result = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                conn.close();
                return () => {
                    let sum = 0;
                    let count = 0;
                    for (const v of result.getColumnAt(0)!) {
                        sum += v!;
                        ++count;
                    }
                    if (count != tupleCount || sum != (tupleCount * (tupleCount + 1)) / 2) {
                        console.log(
                            `1 WRONG RESULT ${count} ${tupleCount} ${sum} ${(tupleCount * (tupleCount + 1)) / 2}`,
                        );
                    }
                };
            }),

            addAsync('rows (iterator)', async () => {
                const conn = db().connect();
                const result = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                conn.close();
                return () => {
                    let sum = 0;
                    let count = 0;
                    for (const row of result) {
                        sum += row.foo!;
                        ++count;
                    }
                    if (count != tupleCount || sum != (tupleCount * (tupleCount + 1)) / 2) {
                        console.log(
                            `2 WRONG RESULT ${count} ${tupleCount} ${sum} ${(tupleCount * (tupleCount + 1)) / 2}`,
                        );
                    }
                };
            }),

            addAsync('columns (scan + bind)', async () => {
                const conn = db().connect();
                const table = conn.runQuery<{ foo: arrow.Float64 }>(`
                    SELECT v::DOUBLE AS foo FROM generate_series(1, ${tupleCount}) as t(v);
                `);
                conn.close();
                return () => {
                    let sum = 0;
                    let count = 0;
                    let action: (index: number) => void;
                    table.scan(
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
                };
            }),

            cycle((result: any, _summary: any) => {
                const bytes = tupleCount * tupleSize;
                const duration = result.details.median;
                const tupleThroughput = tupleCount / duration;
                const dataThroughput = bytes / duration;
                console.log(
                    `${kleur.cyan(result.name)} t: ${duration.toFixed(3)} s ttp: ${format.formatThousands(
                        tupleThroughput,
                    )}/s dtp: ${format.formatBytes(dataThroughput)}/s`,
                );
            }),
        );
    }
}
