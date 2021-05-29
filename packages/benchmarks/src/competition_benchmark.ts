import { add, suite, cycle } from '@duckdb/benny';
import kleur from 'kleur';
import * as format from './utils/format';
import * as arrow from 'apache-arrow';
import { DBWrapper } from './db_wrappers';

function gaussSum(n: number): number {
    return Math.trunc(0.5 * n * (n + 1));
}

export async function benchmarkCompetitions(
    dbs: DBWrapper[],
    basedir: string,
    tableFetch: (path: string) => Promise<arrow.Table>,
) {
    /*const tupleCount = 10000;
    /////////////////////////////////////////////

    let col = [];
    for (let i = 0; i <= tupleCount; i++) {
        col.push(i);
    }

    const table = arrow.Table.new([arrow.Int32Vector.from(col)], ['a_value']);

    const scans = [];
    const sums = [];

    for (let db of dbs) {
        await db.init();

        await db.create(`scan_table`, {
            a_value: 'INTEGER',
        }, [[]]);

        await db.load(`scan_table`, null, table);

        if (db.implements('scanInt')) {
            scans.push(
                add(db.name, async () => {
                    await db.scanInt();
                }),
            );
        }

        if (db.implements('sum')) {
            sums.push(
                add(db.name, async () => {
                    const val = await db.sum();

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
    }*/

    /////////////////////////////////////////////

    const sf = '0_005';

    const keys: { [key: string]: string[][] } = {
        customer: [['c_custkey']],
        lineitem: [['l_orderkey', 'l_linenumber']],
        region: [['r_regionkey']],
        orders: [['o_orderkey']],
        nation: [['n_nationkey']],
        part: [['p_partkey']],
        partsupp: [],
        supplier: [['s_suppkey']],
    };

    let tables: { [key: string]: arrow.Table } = {};
    for (const k of Object.keys(keys)) {
        tables[k] = await tableFetch(`${basedir}/tpch/${sf}/parquet/${k}.parquet`);
    }

    const primaryJoins = [];
    const tpchs = [];
    console.log('Importing TPCH data');
    for (let db of dbs) {
        if (!db.implements('simpleJoin')) continue;

        console.log(db.name);
        await db.init();

        for (const [k, v] of Object.entries(tables)) {
            await db.create(k, v, keys[k]);
        }

        for (const [k, v] of Object.entries(tables)) {
            console.log(k);
            await db.load(k, `${basedir}/tpch/${sf}/parquet/${k}.parquet`, v);
        }

        primaryJoins.push(
            add(db.name, async () => {
                await db.join();
            }),
        );

        if (db.implements('tpch')) {
            tpchs.push(
                add(db.name, async () => {
                    await db.tpch();
                }),
            );
        }
    }

    await suite(
        `Simple primary key join`,
        ...primaryJoins,
        cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            console.log(`${kleur.cyan(result.name)} t: ${duration.toFixed(5)}s`);
        }),
    );

    await suite(
        `TPCH query`,
        ...tpchs,
        cycle((result: any, _summary: any) => {
            const duration = result.details.median;
            console.log(`${kleur.cyan(result.name)} t: ${duration.toFixed(5)}s`);
        }),
    );

    for (let db of dbs) {
        await db.close();
    }
}
