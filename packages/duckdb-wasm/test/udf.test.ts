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
            conn.query('select jsudf(1, 2)');
        });
    });
}
