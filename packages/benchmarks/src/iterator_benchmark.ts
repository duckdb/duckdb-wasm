/* eslint-disable @typescript-eslint/no-unused-vars */
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import { addBlocking, suite, cycle } from './bench';
import kleur from 'kleur';
import * as format from './utils/format';

const noop = () => {};

export function benchmarkIterator(db: () => duckdb.DuckDBBindings): void {
    const tupleCount = 1000000;
    let bytes = 0;

    suite(
        `Chunks | 1 column | 1m rows | materialized`,
        addBlocking('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 1;
        }),
        addBlocking('TINYINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 1;
        }),
        addBlocking('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 2;
        }),
        addBlocking('INTEGER', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 4;
        }),
        addBlocking('BIGINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 8;
        }),
        addBlocking('FLOAT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 4;
        }),
        addBlocking('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 8;
        }),
        addBlocking('STRING', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const v of result.getChildAt(0)!) {
                bytes += v!.length;
            }
            conn.close();
        }),
        cycle((result: any, _summary: any) => {
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
    suite(
        `Chunks | 1 column | 1m rows | materialized | only scanning`,
        addBlocking('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('TINYINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 2;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('INTEGER', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('BIGINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('FLOAT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        addBlocking('STRING', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            conn.close();
            return () => {
                bytes = 0;
                for (const v of result.getChildAt(0)!) {
                    bytes += v.length;
                }
            };
        }),
        cycle((result: any, _summary: any) => {
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

    suite(
        `Chunks | 1 column | 1m rows | streaming`,
        addBlocking('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('TINYINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('INTEGER', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('BIGINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('FLOAT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        addBlocking('STRING', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const batch of result) {
                for (const v of batch.getChildAt(0)!) {
                    bytes += v!.length;
                }
            }
            conn.close();
        }),

        cycle((result: any, _summary: any) => {
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
