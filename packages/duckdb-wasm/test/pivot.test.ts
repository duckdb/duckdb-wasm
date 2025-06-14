import * as duckdb from '../src/';

export function testPivot(db: () => duckdb.DuckDBBindings, options?: { skipValuesCheck: boolean }): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('PIVOT', () => {
        it('with send', async () => {
            conn.query(`
CREATE TABLE cities (
  country VARCHAR, name VARCHAR, year INTEGER, population INTEGER
);`);
            conn.query(`
INSERT INTO cities VALUES
  ('NL', 'Amsterdam', 2000, 1005),
  ('NL', 'Amsterdam', 2010, 1065),
  ('NL', 'Amsterdam', 2020, 1158),
  ('US', 'Seattle', 2000, 564),
  ('US', 'Seattle', 2010, 608),
  ('US', 'Seattle', 2020, 738),
  ('US', 'New York City', 2000, 8015),
  ('US', 'New York City', 2010, 8175),
  ('US', 'New York City', 2020, 8772);`);

            const reader = await conn.send(`PIVOT cities ON year USING sum(population);`);
            const batches = reader.readAll();
            expect(batches.length).toBe(1);
            const batch = batches[0];
            expect(batch.numCols).toBe(5);
            expect(batch.numRows).toBe(3);
            expect(batch.getChildAt(0)?.toArray()).toEqual(['NL', 'US', 'US']);
            expect(batch.getChildAt(1)?.toArray()).toEqual(['Amsterdam', 'Seattle', 'New York City']);
            // On Node, the types of these columns are inconsistent in different builds, so we skip the check.
            if (!options?.skipValuesCheck) {
                // Pivoted columns are int128
                expect(batch.getChildAt(2)?.toArray()).toEqual(
                    new Uint32Array([1005, 0, 0, 0, 564, 0, 0, 0, 8015, 0, 0, 0]),
                );
                expect(batch.getChildAt(3)?.toArray()).toEqual(
                    new Uint32Array([1065, 0, 0, 0, 608, 0, 0, 0, 8175, 0, 0, 0]),
                );
                expect(batch.getChildAt(4)?.toArray()).toEqual(
                    new Uint32Array([1158, 0, 0, 0, 738, 0, 0, 0, 8772, 0, 0, 0]),
                );
            }
        });
    });
}
