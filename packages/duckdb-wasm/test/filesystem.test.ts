import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

const decoder = new TextDecoder();

export function testFilesystem(
    db: () => duckdb.AsyncDuckDB,
    resolveData: (url: string) => Promise<Uint8Array | null>,
    baseDir: string,
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
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
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
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
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
                    SELECT studenten.matrnr, vorlesungen.titel
                    FROM parquet_scan('studenten.parquet') studenten
                    INNER JOIN parquet_scan('hoeren.parquet') hoeren ON (studenten.matrnr = hoeren.matrnr)
                    INNER JOIN parquet_scan('vorlesungen.parquet') vorlesungen ON (vorlesungen.vorlnr = hoeren.vorlnr);
                `);
            const table = await arrow.Table.from<{ matrnr: arrow.Int; titel: arrow.Utf8 }>(result);
            expect(table.numCols).toBe(2);
            const flat = [];
            for (const row of table) {
                flat.push({
                    matrnr: row.matrnr,
                    titel: row.titel?.toString(),
                });
            }
            expect(flat).toEqual([
                { matrnr: 26120, titel: 'Grundzüge' },
                { matrnr: 27550, titel: 'Grundzüge' },
                { matrnr: 27550, titel: 'Logik' },
                { matrnr: 28106, titel: 'Ethik' },
                { matrnr: 28106, titel: 'Wissenschaftstheorie' },
                { matrnr: 28106, titel: 'Bioethik' },
                { matrnr: 28106, titel: 'Der Wiener Kreis' },
                { matrnr: 29120, titel: 'Grundzüge' },
                { matrnr: 29120, titel: 'Ethik' },
                { matrnr: 29120, titel: 'Mäeutik' },
                { matrnr: 29555, titel: 'Glaube und Wissen' },
                { matrnr: 25403, titel: 'Glaube und Wissen' },
            ]);
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
            expect(text).toBe(`matrnr;name;semester
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
            const result = await conn.sendQuery(`SELECT matrnr FROM studenten4;`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });
    });

    describe('File access', () => {
        it('Small Parquet file', async () => {
            await db().addFilePath(`${baseDir}/uni/studenten.parquet`);
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('${baseDir}/uni/studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('Large Parquet file', async () => {
            await db().addFilePath(`${baseDir}/tpch/0_01/parquet/lineitem.parquet`);
            const result = await conn.sendQuery(
                `SELECT count(*)::INTEGER as cnt FROM parquet_scan('${baseDir}/tpch/0_01/parquet/lineitem.parquet');`,
            );
            const table = await arrow.Table.from<{ cnt: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });
}
