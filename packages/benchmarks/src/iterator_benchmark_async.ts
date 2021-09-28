/* eslint-disable @typescript-eslint/no-unused-vars */
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb.module';
import { addAsync, suite, cycle } from './bench';
import kleur from 'kleur';
import * as format from './utils/format';

const noop = () => {};

export async function benchmarkIteratorAsync(db: () => duckdb.AsyncDuckDB): Promise<void> {
    const tupleCount = 1000000;
    let bytes = 0;

    await suite(
        `Chunks | 1 column | 1m rows | materialized`,

        addAsync('BOOLEAN', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 1;
        }),

        addAsync('TINYINT', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
            SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 1;
        }),

        addAsync('SMALLINT', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 2;
        }),

        addAsync('INTEGER', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 4;
        }),

        addAsync('BIGINT', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 8;
        }),

        addAsync('FLOAT', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 4;
        }),

        addAsync('DOUBLE', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for (const _v of result.getChildAt(0)!) {
                noop();
            }
            await conn.close();
            bytes = tupleCount * 8;
        }),

        addAsync('STRING', async () => {
            const conn = await db().connect();
            const result = await conn.runQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for (const v of result.getChildAt(0)!) {
                noop();
                bytes += v!.length;
            }
            await conn.close();
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

    await suite(
        `Chunks | 1 column | 1m rows | streaming`,
        addAsync('BOOLEAN', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v > 0 FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 1;
        }),

        addAsync('TINYINT', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT (v & 127)::TINYINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 1;
        }),

        addAsync('SMALLINT', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT (v & 32767)::SMALLINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 2;
        }),

        addAsync('INTEGER', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v::INTEGER FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 4;
        }),

        addAsync('BIGINT', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v::BIGINT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 8;
        }),

        addAsync('FLOAT', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v::FLOAT FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 4;
        }),

        addAsync('DOUBLE', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v::DOUBLE FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            for await (const batch of result) {
                for (const _v of batch.getChildAt(0)!) {
                    noop();
                }
            }
            await conn.close();
            bytes = tupleCount * 8;
        }),

        addAsync('STRING', async () => {
            const conn = await db().connect();
            const result = await conn.sendQuery(`
                SELECT v::VARCHAR FROM generate_series(0, ${tupleCount}) as t(v);
            `);
            bytes = 0;
            for await (const batch of result) {
                for (const v of batch.getChildAt(0)!) {
                    bytes += v!.length;
                }
            }
            await conn.close();
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
