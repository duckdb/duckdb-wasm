/* eslint-disable @typescript-eslint/no-unused-vars */
import * as duckdb from '../../duckdb-wasm/dist/duckdb-node-sync.js';
import * as utils from './utils';
import * as benny from 'benny';
import kleur from 'kleur';

const noop = () => {};

function main(db: duckdb.DuckDB) {
    const tupleCount = 1000000;
    let bytes = 0;

    benny.suite(
        `Chunks | 1 column | 1m rows | materialized`,
        benny.add('BOOLEAN', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 1;
        }),

        benny.add('TINYINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 1;
        }),

        benny.add('SMALLINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 2;
        }),

        benny.add('INTEGER', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 4;
        }),

        benny.add('BIGINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        benny.add('FLOAT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 4;
        }),

        benny.add('DOUBLE', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            conn.close();

            bytes = tupleCount * 8;
        }),

        benny.add('STRING', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const v of result.getChildAt(0)) {
                bytes += v!.length;
            }
            conn.close();
        }),

        benny.cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            const tupleThroughput = tupleCount / duration;
            const dataThroughput = bytes / duration;
            console.log(
                `${kleur.cyan(result.name)} t: ${duration.toFixed(3)} s ttp: ${utils.formatThousands(
                    tupleThroughput,
                )}/s dtp: ${utils.formatBytes(dataThroughput)}/s`,
            );
        }),
    );

    benny.suite(
        `Chunks | 1 column | 1m rows | materialized | only scanning`,
        benny.add('BOOLEAN', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('TINYINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 1;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('SMALLINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 2;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('INTEGER', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('BIGINT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('FLOAT', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 4;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('DOUBLE', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = tupleCount * 8;
            conn.close();
            return () => {
                for (const _v of result.getChildAt(0)) {
                    noop();
                }
            };
        }),

        benny.add('STRING', () => {
            const conn = db.connect();
            const result = conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            conn.close();
            return () => {
                bytes = 0;
                for (const v of result.getChildAt(0)) {
                    bytes += v.length;
                }
            };
        }),

        benny.cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            const tupleThroughput = tupleCount / duration;
            const dataThroughput = bytes / duration;
            console.log(
                `${kleur.cyan(result.name)} t: ${duration.toFixed(3)} s ttp: ${utils.formatThousands(
                    tupleThroughput,
                )}/s dtp: ${utils.formatBytes(dataThroughput)}/s`,
            );
        }),
    );

    benny.suite(
        `Chunks | 1 column | 1m rows | streaming`,
        benny.add('BOOLEAN', () => {
            const conn = db.connect();
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

        benny.add('TINYINT', () => {
            const conn = db.connect();
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

        benny.add('SMALLINT', () => {
            const conn = db.connect();
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

        benny.add('INTEGER', () => {
            const conn = db.connect();
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

        benny.add('BIGINT', () => {
            const conn = db.connect();
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

        benny.add('FLOAT', () => {
            const conn = db.connect();
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

        benny.add('DOUBLE', () => {
            const conn = db.connect();
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

        benny.add('STRING', () => {
            const conn = db.connect();
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

        benny.cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            const tupleThroughput = tupleCount / duration;
            const dataThroughput = bytes / duration;
            console.log(
                `${kleur.cyan(result.name)} t: ${duration.toFixed(3)} s ttp: ${utils.formatThousands(
                    tupleThroughput,
                )}/s dtp: ${utils.formatBytes(dataThroughput)}/s`,
            );
        }),
    );
}

const logger = new duckdb.VoidLogger();
const db = new duckdb.DuckDB(logger, duckdb.NODE_RUNTIME, '../duckdb-wasm/dist/duckdb-eh.wasm');
db.instantiate()
    .then(() => main(db))
    .catch(e => console.error(e));
