import * as duckdb from '../src/';

export function testEXCEL(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection;
    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('EXCEL', () => {
        it('sample', async () => {
            expect(conn.query("SELECT text(1234567.897, 'h:mm:ss.00')").getChildAt(0)?.toArray()).toEqual([
                '21:31:40.80',
            ]);
            expect(conn.query("SELECT text(1234567.897, 'm/d/yyyy h:mm AM/PM')").getChildAt(0)?.toArray()).toEqual([
                '2/15/5280 9:31 PM',
            ]);
            expect(conn.query("SELECT text(1234567.897, 'dddd, dd of MMMM of YYYY')").getChildAt(0)?.toArray()).toEqual(
                ['Thursday, 15 of February of 5280'],
            );

            expect(conn.query("SELECT text(1234567.897, '# ??/??')").getChildAt(0)?.toArray()).toEqual([
                '1234567 61/68',
            ]);

            expect(conn.query("SELECT text(12345678912, '(###) ###-####')").getChildAt(0)?.toArray()).toEqual([
                '(1234) 567-8912',
            ]);
            expect(conn.query("SELECT text(1234567.897, '$#,##0')").getChildAt(0)?.toArray()).toEqual(['$1,234,568']);
            expect(
                conn
                    .query("SELECT excel_text(123456789123, '[<=9999999]##-####;[>9999999](###) ###-####')")
                    .getChildAt(0)
                    ?.toArray(),
            ).toEqual(['(12345) 678-9123']);
        });
    });
}
