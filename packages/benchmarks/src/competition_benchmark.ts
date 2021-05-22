import add from 'benny/src/add';
import suite from 'benny/src/suite';
import cycle from 'benny/src/cycle';
import kleur from 'kleur';
import * as format from './utils/format';

import { DBWrapper } from './db_wrappers';

function gaussSum(n: number): number {
    return Math.trunc(0.5 * n * (n + 1));
}

export async function benchmarkCompetitions(dbs: DBWrapper[], basedir: string) {
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

            scans.push(
                add(db.name, async () => {
                    await db.scan_int(`test_table${tupleCount}`);
                }),
            );
            sums.push(
                add(db.name, async () => {
                    const val = await db.sum(`test_table${tupleCount}`, 'a_value');

                    if (val != gaussSum(tupleCount)) {
                        throw db.name + ' mismatch';
                    }
                }),
            );
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

        /////////////////////////////////////////////
    }*/

    for (let db of dbs) {
        await db.init();

        await db.importCSV('csv_table', `${basedir}/nation.tbl`, '|');

        await db.close();
    }
}
