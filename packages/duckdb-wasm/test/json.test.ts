import * as duckdb from '../src/';

export function testJSON(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('JSON', () => {
        it('sample', async () => {
            expect(conn.query('select to_json({n: 42})').getChildAt(0)?.toArray()).toEqual(['{"n":42}']);
            expect(conn.query("select json_object('duck', 42)").getChildAt(0)?.toArray()).toEqual(['{"duck":42}']);
        });
    });
}
