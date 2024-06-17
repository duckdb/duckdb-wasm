import * as duckdb from '../src';

// https://github.com/duckdb/duckdb-wasm/issues/393
export function longQueries(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection | null = null;
    beforeEach(async () => {
        await db().flushFiles();
    });
    afterEach(async () => {
        if (conn) {
            await conn.close();
            conn = null;
        }
        await db().flushFiles();
        await db().dropFiles();
    });
    describe('Very long queries', () => {
        it('1e6', async () => {
            await db().open({
                path: ':memory:',
                query: {
                    castTimestampToDate: false,
                },
            });
            conn = await db().connect();

            let str = `with big_expr as ( select `;
            let i = 1;
                while (str.length < 1e6) {
                str += ` ` + i + ` as col_` + i + `,`;
                i++;
            }
            str += ` NULL as col_NULL) select 99;`

            await conn.query(str);
        });
    });
}

