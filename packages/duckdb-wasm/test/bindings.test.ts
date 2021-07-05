import * as duckdb from '../src/';

export function testBindings(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.disconnect();
        db().flushFiles();
        db().dropFiles();
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

        describe('Prepared Statement', () => {
            let stmt: number;

            beforeEach(() => {
                stmt = conn.createPreparedStatement(
                    'SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);',
                );
            });

            afterEach(() => {
                conn.closePreparedStatement(stmt);
            });

            it('Materialized', async () => {
                const result = conn.runPreparedStatement(stmt, [234]);
                expect(result.length).toBe(10001);
            });

            it('Streaming', async () => {
                const stream = conn.sendPreparedStatement(stmt, [234]);
                let size = 0;
                for (const batch of stream) {
                    size += batch.length;
                }
                expect(size).toBe(10001);
            });
        });
    });
}
