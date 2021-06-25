import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

const decoder = new TextDecoder();

function itBrowser(expectation: string, assertion?: jasmine.ImplementationCallback, timeout?: number): void {
    if (typeof window !== 'undefined') {
        it(expectation, assertion, timeout);
    }
}

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
        await db().flushFiles();
        await db().dropFiles();
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
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await test();
        });
        it('File buffer used twice', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await test();
            await test();
        });
        itBrowser('Blob used once', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            const students_blob = new Blob([students!]);
            const students_url = URL.createObjectURL(students_blob);
            await db().registerFileURL('studenten.parquet', students_url, students_blob.size);
            await test();
            URL.revokeObjectURL(students_url);
        });
    });

    describe('Parquet Scans', () => {
        it('single table from buffer', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        itBrowser('single table from blob', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            const students_blob = new Blob([students!]);
            const students_url = URL.createObjectURL(students_blob);
            await db().registerFileURL('studenten.parquet', students_url, students_blob.size);
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
            URL.revokeObjectURL(students_url);
        });

        it('simple join', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            const hoeren = await resolveData('/uni/hoeren.parquet');
            const vorlesungen = await resolveData('/uni/vorlesungen.parquet');
            expect(students).not.toBeNull();
            expect(hoeren).not.toBeNull();
            expect(vorlesungen).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerFileBuffer('hoeren.parquet', hoeren!);
            await db().registerFileBuffer('vorlesungen.parquet', vorlesungen!);

            const result = await conn.sendQuery(`
                    SELECT students.matrnr, vorlesungen.titel
                    FROM parquet_scan('studenten.parquet') students
                    INNER JOIN parquet_scan('hoeren.parquet') hoeren ON (students.matrnr = hoeren.matrnr)
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
        it('Copy To CSV Buffer', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students.csv');
            await conn.runQuery(`CREATE TABLE students AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY students TO 'students.csv' WITH (HEADER 1, DELIMITER ';', FORMAT CSV);`);
            await conn.runQuery(`DROP TABLE IF EXISTS students`);
            const outBuffer = await db().copyFileToBuffer('students.csv');
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

        itBrowser('Copy To CSV Blob with COW', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            const dummy = new Blob(['foooooo']);
            const dummy_url = URL.createObjectURL(dummy);
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerFileURL('students.csv', dummy_url, dummy.size);
            await conn.runQuery(`CREATE TABLE students AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY students TO 'students.csv' WITH (HEADER 1, DELIMITER ';', FORMAT CSV);`);
            await conn.runQuery(`DROP TABLE IF EXISTS students`);
            const outBuffer = await db().copyFileToBuffer('students.csv');
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
            expect(await (await fetch(dummy_url)).text()).toBe('foooooo');
            URL.revokeObjectURL(dummy_url);
        });

        it('Copy To Parquet', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students2.parquet');
            await conn.runQuery(`CREATE TABLE students2 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY students2 TO 'students2.parquet' (FORMAT PARQUET);`);
            const url = await db().copyFileToBuffer('students2.parquet');
            expect(url).not.toBeNull();
        });

        it('Copy To Parquet And Load Again', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students3.parquet');
            await conn.runQuery(`CREATE TABLE students3 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.runQuery(`COPY students3 TO 'students3.parquet' (FORMAT PARQUET);`);
            const url = await db().copyFileToBuffer('students3.parquet');
            expect(url).not.toBeNull();
            await conn.runQuery(`CREATE TABLE students4 AS SELECT * FROM parquet_scan('students3.parquet');`);
            const result = await conn.sendQuery(`SELECT matrnr FROM students4;`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });
    });

    describe('File access', () => {
        it('Small Parquet file', async () => {
            await db().registerFileURL('studenten.parquet', `${baseDir}/uni/studenten.parquet`);
            const result = await conn.sendQuery(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const table = await arrow.Table.from<{ matrnr: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('Large Parquet file', async () => {
            await db().registerFileURL('lineitem.parquet', `${baseDir}/tpch/0_01/parquet/lineitem.parquet`);
            const result = await conn.sendQuery(
                `SELECT count(*)::INTEGER as cnt FROM parquet_scan('lineitem.parquet');`,
            );
            const table = await arrow.Table.from<{ cnt: arrow.Int }>(result);
            expect(table.getColumnAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });
}
