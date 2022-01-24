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
            conn.createScalarFunction('jsudf', new Int32(), a => a);
            const result = conn.query(
                'SELECT max(jsudf(v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.length).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(1);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([10000]));
        });
    });
}
