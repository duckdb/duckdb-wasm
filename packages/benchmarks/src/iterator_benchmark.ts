/* eslint-disable @typescript-eslint/no-unused-vars */
import * as duckdb from '@duckdb/duckdb-wasm/src/';
import add from 'benny/src/add';
import suite from 'benny/src/suite';
import cycle from 'benny/src/cycle';
import kleur from 'kleur';
import * as format from './utils/format';

const noop = () => {};

export function benchmarkIterator(db: () => duckdb.DuckDBBindings) {
    const tupleCount = 1000000;
    let bytes = 0;

    suite(
        `Chunks | 1 column | 1m rows | materialized`,
        add('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 1;
        }),
        add('TINYINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 1;
        }),
        add('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 2;
        }),
        add('INTEGER', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 4;
        }),
        add('BIGINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),
        add('FLOAT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 4;
        }),
        add('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),
        add('STRING', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const v of result.getChildAt(0)!) {
                bytes += v!.length;
            }
            conn.disconnect();
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
        add('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('TINYINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 2;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('INTEGER', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('BIGINT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('FLOAT', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.disconnect();
            return () => {
                for (const _v of result.getChildAt(0)!) {
                    noop();
                }
            };
        }),
        add('STRING', () => {
            const conn = db().connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            conn.disconnect();
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
        add('BOOLEAN', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('TINYINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('SMALLINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('INTEGER', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('BIGINT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('FLOAT', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('DOUBLE', () => {
            const conn = db().connect();
            const result = conn.sendQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            conn.disconnect();

            bytes = tupleCount * 8;
        }),

        add('STRING', () => {
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
            conn.disconnect();
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
