import * as duckdb from '../src/';

export function testPivot(db: () => duckdb.DuckDBBindings): void {
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
            expect(batch.getChildAt(2)?.toArray()).toEqual([1005, 564, 8015]);
            expect(batch.getChildAt(3)?.toArray()).toEqual([1065, 608, 8175]);
            expect(batch.getChildAt(4)?.toArray()).toEqual([1158, 738, 8772]);
        });
    });
}
