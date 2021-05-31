/* eslint-disable @typescript-eslint/no-unused-vars */
import Worker from 'web-worker';
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-node-async.js';
import * as utils from './utils';
import * as benny from 'benny';
import kleur from 'kleur';

import path from 'path';
const workerPath = path.resolve(__dirname, '../../duckdb/dist/duckdb-node-async-eh.worker.js');
const wasmPath = path.resolve(__dirname, '../../duckdb/dist/duckdb.wasm');

const noop = () => {};

async function main(db: duckdb.AsyncDuckDB) {
    const tupleCount = 1000000;
    let bytes = 0;

    await benny.suite(
        `Chunks | 1 column | 1m rows | materialized`,
        benny.add('BOOLEAN', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 1;
        }),

        benny.add('TINYINT', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
            SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 1;
        }),

        benny.add('SMALLINT', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 2;
        }),

        benny.add('INTEGER', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 4;
        }),

        benny.add('BIGINT', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 8;
        }),

        benny.add('FLOAT', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 4;
        }),

        benny.add('DOUBLE', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)) {
                noop();
            }
            await conn.disconnect();
            bytes = tupleCount * 8;
        }),

        benny.add('STRING', async () => {
            const conn = await db.connect();
            const result = await conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const v of result.getChildAt(0)) {
                noop();
                bytes += v!.length;
            }
            await conn.disconnect();
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

    await benny.suite(
        `Chunks | 1 column | 1m rows | streaming`,
        benny.add('BOOLEAN', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 1;
        }),

        benny.add('TINYINT', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 1;
        }),

        benny.add('SMALLINT', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 2;
        }),

        benny.add('INTEGER', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 4;
        }),

        benny.add('BIGINT', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 8;
        }),

        benny.add('FLOAT', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 4;
        }),

        benny.add('DOUBLE', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.disconnect();
            bytes = tupleCount * 8;
        }),

        benny.add('STRING', async () => {
            const conn = await db.connect();
            const result = await conn.sendQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for await (const batch of result) {
                for (const v of batch.getChildAt(0)!) {
                    bytes += v!.length;
                }
            }
            await conn.disconnect();
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
const worker = new Worker(workerPath);
const db = new duckdb.AsyncDuckDB(logger, worker);
db.open(wasmPath)
    .then(() => main(db))
    .then(() => db.terminate())
    .catch(e => console.error(e));
