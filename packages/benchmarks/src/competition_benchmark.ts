import { add, suite, cycle } from '@duckdb/benny';
import kleur from 'kleur';
import * as format from './utils/format';

import { DBWrapper } from './db_wrappers';

function gaussSum(n: number): number {
    return Math.trunc(0.5 * n * (n + 1));
}

export async function benchmarkCompetitions(
    dbs: DBWrapper[],
    basedir: string,
    dataFetch: (path: string) => Promise<any>,
) {
    /*for (const tupleCount of [100, 1000, 10000]) {
        console.log('Setting up tables');
        /////////////////////////////////////////////

        let plain_rows: { a_value: number }[] = [];
        for (let i = 0; i <= tupleCount; i++) {
            plain_rows.push({ a_value: i });
        }

        const scans = [];
        const sums = [];

        for (let db of dbs) {
            await db.init();

            await db.create(`test_table${tupleCount}`, {
                a_value: 'INTEGER',
            });

            await db.load(`test_table${tupleCount}`, plain_rows);

            if (db.implements('scanInt')) {
                scans.push(
                    add(db.name, async () => {
                        await db.scanInt(`test_table${tupleCount}`);
                    }),
                );
            }

            if (db.implements('sum')) {
                sums.push(
                    add(db.name, async () => {
                        const val = await db.sum(`test_table${tupleCount}`, 'a_value');

                        if (val != gaussSum(tupleCount)) {
                            throw db.name + ' mismatch';
                        }
                    }),
                );
            }
        }

        await suite(
            `Table Scan ${tupleCount} simple rows`,
            ...scans,
            cycle((result: any, _summary: any) => {
                const duration = result.details.median;
                console.log(
                    `${kleur.cyan(result.name)} t: ${duration.toFixed(5)}s ${format.formatThousands(
                        tupleCount / duration,
                    )} rows/s`,
                );
            }),
        );

        await suite(
            `Sum of ${tupleCount} int rows`,
            ...sums,
            cycle((result: any, _summary: any) => {
                const duration = result.details.median;
                console.log(`${kleur.cyan(result.name)} t: ${duration.toFixed(5)}s`);
            }),
        );

        for (let db of dbs) {
            await db.close();
        }
    }*/

    const imports = [];
    let i = 0;
    for (let db of dbs) {
        await db.init();
        if (db.implements('importCSV')) {
            imports.push(
                add(db.name, async () => {
                    await db.importCSV(`csv_table${i++}`, `${basedir}/tpch/0_01/tbl/lineitem.tbl`, '|', dataFetch);
                }),
            );
        }
    }
    await suite(
        `CSV Import`,
        ...imports,
        cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            console.log(`${kleur.cyan(result.name)} t: ${duration.toFixed(5)}s`);
        }),
    );
}
