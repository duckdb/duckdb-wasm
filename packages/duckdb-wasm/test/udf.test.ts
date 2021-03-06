import * as duckdb from '../src/';
import { Float64, Int32, Utf8 } from 'apache-arrow';

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

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([10000]));
        });

        it('double', async () => {
            conn.createScalarFunction('jsudf2', new Float64(), a => a);

            const result = conn.query(
                'SELECT max(jsudf2(v::DOUBLE))::DOUBLE as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Float64Array([10000]));
        });

        it('2 args', async () => {
            conn.createScalarFunction('jsudf3', new Int32(), (a, b) => a + b);

            const result = conn.query(
                'SELECT max(jsudf3(v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([20000]));
        });

        it('3 args', async () => {
            conn.createScalarFunction('jsudf3args', new Int32(), (a, b, c) => a + b + c);

            const result = conn.query(
                'SELECT max(jsudf3args(v::INTEGER, v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([30000]));
        });

        it('4 args', async () => {
            conn.createScalarFunction('jsudf4args', new Int32(), (a, b, c, d) => a + b + c + d);

            const result = conn.query(
                'SELECT max(jsudf4args(v::INTEGER, v::INTEGER, v::INTEGER, v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([40000]));
        });

        it('noargs', async () => {
            conn.createScalarFunction('jsudf4', new Int32(), () => 42);
            const result = conn.query('SELECT max(jsudf4())::INTEGER as foo FROM generate_series(1, 10000) as t(v)');

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([42]));
        });
        it('withnulls', async () => {
            conn.createScalarFunction('jsudf5', new Int32(), a => (a == null ? -100 : a));
            const result = conn.query(
                'SELECT min(jsudf5((case when v % 2 = 0 then v else null end)::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
        });

        it('stringparam', async () => {
            function jsudf6(s: string) {
                return s.length;
            }
            conn.createScalarFunction('jsudf6', new Int32(), jsudf6);
            const result = conn.query(
                "SELECT max(jsudf6('str_' || v))::INTEGER as foo FROM generate_series(1, 10000) as t(v)",
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([9]));
        });

        it('stringparamnulls', async () => {
            function jsudf7(s: string) {
                if (s == undefined) {
                    return 0;
                } else {
                    return s.length;
                }
            }
            conn.createScalarFunction('jsudf7', new Int32(), jsudf7);
            const result = conn.query(
                "SELECT max(jsudf7((case when v % 2 = 0 then 'str_' || v else null end)::VARCHAR))::INTEGER as foo FROM generate_series(1, 10000) as t(v)",
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([9]));
        });

        it('nullintreturn', async () => {
            conn.createScalarFunction('jsudf8', new Int32(), a => undefined);

            const result = conn.query(
                'SELECT max(COALESCE(jsudf8(v::INTEGER), 42))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([42]));
        });

        it('stringreturn', async () => {
            conn.createScalarFunction('jsudf9', new Utf8(), a => 'Hello ' + a);

            const result = conn.query(
                'SELECT max(LENGTH(jsudf9(v::INTEGER)))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([11]));
        });

        it('nullstringreturn', async () => {
            conn.createScalarFunction('jsudf10', new Utf8(), a => (a % 2 == 0 ? 'Hello' : undefined));

            const result = conn.query(
                'SELECT COUNT(jsudf10(v::INTEGER))::INTEGER as foo FROM generate_series(1, 10000) as t(v)',
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([5000]));
        });

        it('struct', async () => {
            conn.createScalarFunction('jsudf11', new Int32(), a => (a.x == null ? -100 : a.x));
            const result = conn.query(
                `SELECT min(jsudf11({'x': (case when v % 2 = 0 then v else null end)::INTEGER, 'y': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`,
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
        });

        it('structnested', async () => {
            conn.createScalarFunction('jsudf12', new Int32(), a => (a.x.y == null ? -100 : a.x.y));
            const result = conn.query(
                `SELECT min(jsudf12({'x': {'y': (case when v % 2 = 0 then v else null end)::INTEGER }, 'z': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`,
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
        });

        it('structnestednull', async () => {
            conn.createScalarFunction('jsudf13', new Int32(), a => (a.x?.y == null ? -100 : a.x!.y));
            const result = conn.query(
                `SELECT min(jsudf13({'x': (case when v % 2 = 0 then {'y': v::INTEGER } else null end), 'z': 42}))::INTEGER as foo FROM generate_series(1, 10000) as t(v)`,
            );

            expect(result.numRows).toEqual(1);
            expect(result.numCols).toEqual(1);
            expect(result.getChildAt(0)?.length).toEqual(1);
            expect(result.getChildAt(0)?.toArray()).toEqual(new Int32Array([-100]));
        });
    });
}
