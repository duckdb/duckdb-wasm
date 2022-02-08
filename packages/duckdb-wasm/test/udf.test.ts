import * as duckdb from '../src/';
import {Float64, Int32} from 'apache-arrow';

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

        it('double', async () => {
            conn.createScalarFunction('jsudf2', new Float64(), a => a);

            const result = conn.query(
                'SELECT max(jsudf2(v::DOUBLE))::DOUBLE as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.length).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(1);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Float64Array([10000]));
        });

        it('twoargs', async () => {
            conn.createScalarFunction('jsudf3', new Int32(), (a, b) => a + b);

            const result = conn.query(
                'SELECT max(jsudf3(v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.length).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(1);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([20000]));
        });

        it('noargs', async () => {
            conn.createScalarFunction('jsudf4', new Int32(), () => 42);
            const result = conn.query(
                'SELECT max(jsudf4())::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.length).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(1);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([42]));
        });
        it('withnulls', async () => {
            conn.createScalarFunction('jsudf5', new Int32(), a => a == undefined ? -100 : a);
            const result = conn.query(
                'SELECT min(jsudf5((case when v % 2 = 0 then v else null end)::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.length).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getColumnAt(0)?.length).toEqual(1);
            expect(result.getColumnAt(0)?.toArray()).toEqual(new Int32Array([-100]));
        });
    });
}
