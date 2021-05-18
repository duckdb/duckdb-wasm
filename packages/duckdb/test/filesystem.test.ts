import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

const decoder = new TextDecoder();

export function testFilesystem(
    db: () => duckdb.AsyncDuckDB,
    resolveData: (url: string) => Promise<Uint8Array | null>,
): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        conn = await db().connect();
    });

    afterEach(async () => {
        await conn.disconnect();
    });

    describe('File buffer registration', () => {
        const test = async () => {
            const result = await conn.sendQuery(`SELECT MatrNr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ MatrNr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        };
        it('File buffer used once', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            await test();
        });
        it('File buffer re-registered', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            await test();
            await db().addFileBuffer('studenten.parquet', studenten!);
            await test();
        });
        it('File buffer used twice', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            await test();
            await test();
        });
    });

    describe('Parquet Scans', () => {
        it('single table', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            const result = await conn.sendQuery(`SELECT MatrNr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ MatrNr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('simple join', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            const hoeren = await resolveData('/uni/hoeren.parquet');
            const vorlesungen = await resolveData('/uni/vorlesungen.parquet');
            expect(studenten).not.toBeNull();
            expect(hoeren).not.toBeNull();
            expect(vorlesungen).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            await db().addFileBuffer('hoeren.parquet', hoeren!);
            await db().addFileBuffer('vorlesungen.parquet', vorlesungen!);

            const result = await conn.sendQuery(`
                    SELECT studenten.MatrNr, vorlesungen.Titel
                    FROM parquet_scan('studenten.parquet') studenten
                    INNER JOIN parquet_scan('hoeren.parquet') hoeren ON (studenten.MatrNr = hoeren.MatrNr)
                    INNER JOIN parquet_scan('vorlesungen.parquet') vorlesungen ON (vorlesungen.VorlNr = hoeren.VorlNr);
                `);
            const table = await arrow.Table.from<{ MatrNr: arrow.Int; Titel: arrow.Utf8 }>(result);
            expect(table.numCols).toBe(2);
            const flat = [];
            for (const row of table) {
                flat.push({
                    MatrNr: row.MatrNr,
                    Titel: row.Titel?.toString(),
                });
            }
            expect(flat).toEqual([
                { MatrNr: 26120, Titel: 'Grundzüge' },
                { MatrNr: 27550, Titel: 'Grundzüge' },
                { MatrNr: 27550, Titel: 'Logik' },
                { MatrNr: 28106, Titel: 'Ethik' },
                { MatrNr: 28106, Titel: 'Wissenschaftstheorie' },
                { MatrNr: 28106, Titel: 'Bioethik' },
                { MatrNr: 28106, Titel: 'Der Wieer Kreis' },
                { MatrNr: 29120, Titel: 'Grundzüge' },
                { MatrNr: 29120, Titel: 'Ethik' },
                { MatrNr: 29120, Titel: 'Mäeutik' },
                { MatrNr: 29555, Titel: 'Glaube und Wissen' },
                { MatrNr: 25403, Titel: 'Glaube und Wissen' },
            ]);
        });

        it('Huge file', async () => {
            const orders = await resolveData('/tpch/5/orders.parquet');
            if (!orders) {
                pending('Missing TPCH files');
            } else {
                await db().addFileBuffer('orders.parquet', orders);
                const result = await conn.sendQuery(`
                    SELECT o_orderkey
                    FROM parquet_scan('orders.parquet');
                `);
                let num = 0;
                let maxV = 0;
                for await (const batch of result) {
                    expect(batch.numCols).toBe(1);
                    for (const v of batch.getChildAt(0)!) {
                        num++;
                        maxV = Math.max(maxV, v);
                    }
                }
                expect(num).toBe(7500000);
            }
        });
    });

    describe('Writing', () => {
        it('Copy To CSV', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            const outID = await db().addFile('studenten.csv');
            await conn.runQuery(`CREATE TABLE studenten AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY studenten TO 'studenten.csv' WITH (HEADER 1, DELIMITER ';', FORMAT CSV);`);
            const outBuffer = await db().getFileBuffer(outID);
            expect(outBuffer).not.toBeNull();
            const text = decoder.decode(outBuffer!);
            expect(text).toBe(`MatrNr;Name;Semester
24002;Xenokrates;18
25403;Jonas;12
26120;Fichte;10
26830;Aristoxenos;8
27550;Schopenhauer;6
28106;Carnap;3
29120;Theophrastos;2
29555;Feuerbach;2
`);
        });
        it('Copy To Parquet', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            const outID = await db().addFile('studenten2.parquet');
            await conn.runQuery(`CREATE TABLE studenten2 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY studenten2 TO 'studenten2.parquet' (FORMAT PARQUET);`);
            const url = await db().getFileObjectURL(outID);
            expect(url).not.toBeNull();
        });

        it('Copy To Parquet And Load Again', async () => {
            const studenten = await resolveData('/uni/studenten.parquet');
            expect(studenten).not.toBeNull();
            await db().addFileBuffer('studenten.parquet', studenten!);
            const outID = await db().addFile('studenten3.parquet');
            await conn.runQuery(`CREATE TABLE studenten3 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY studenten3 TO 'studenten3.parquet' (FORMAT PARQUET);`);
            const url = await db().getFileObjectURL(outID);
            expect(url).not.toBeNull();
            await conn.runQuery(`CREATE TABLE studenten4 AS SELECT * FROM parquet_scan('studenten3.parquet');`);
            const result = await conn.sendQuery(`SELECT MatrNr FROM studenten4;`);
            const table = await arrow.Table.from<{ MatrNr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });
    });
}
