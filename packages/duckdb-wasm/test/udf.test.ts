import * as duckdb from '../src/';
import { Int32 } from 'apache-arrow';

export function testUDF(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('UDF', () => {
        it('simple', async () => {
            conn.createScalarFunction('jsudf', new Int32(), (a, b) => a + b);
            const result = conn.query('select jsudf(v::INTEGER, 2) AS x from generate_series(1, 10) t(v)');

            expect(result.length).toEqual(10);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(10);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
        });
    });
}
