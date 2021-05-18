import * as duckdb from '../src/';

export function testBindings(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.disconnect();
    });

    describe('DuckDBBindings', () => {
        describe('error handling', () => {
            it('INVALID SQL', async () => {
                let error: Error | null = null;
                try {
                    conn.sendQuery('INVALID');
                } catch (e) {
                    error = e;
                }
                expect(error).not.toBe(null);
            });
        });
    });
}
