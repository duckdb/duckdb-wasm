import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

const decoder = new TextDecoder();

export function testFilesystem(
    db: () => duckdb.AsyncDuckDB,
    resolveData: (url: string) => Promise<Uint8Array | null>,
    baseDir: string,
    baseDirProto: duckdb.DuckDBDataProtocol,
): void {
    let conn: duckdb.AsyncDuckDBConnection;

    beforeEach(async () => {
        conn = await db().connect();
    });

    afterEach(async () => {
        await conn.close();
        await db().flushFiles();
        await db().dropFiles();
    });

    describe('File buffer registration', () => {
        const test = async () => {
            const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ matrnr: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        };
        it('File buffer used once', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await test();
        });
        it('File buffer registered twice', async () => {
            const students0 = await resolveData('/uni/studenten.parquet');
            const students1 = await resolveData('/uni/studenten.parquet');
            expect(students0).not.toBeNull();
            expect(students1).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students0!);
            await test();
            await db().registerFileBuffer('studenten.parquet', students1!);
            await test();
        });
        it('File buffer used twice', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await test();
            await test();
        });
    });

    describe('Parquet Scans', () => {
        it('single table from buffer', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ matrnr: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
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

            const result = await conn.send(`
                    SELECT students.matrnr, vorlesungen.titel
                    FROM parquet_scan('studenten.parquet') students
                    INNER JOIN parquet_scan('hoeren.parquet') hoeren ON (students.matrnr = hoeren.matrnr)
                    INNER JOIN parquet_scan('vorlesungen.parquet') vorlesungen ON (vorlesungen.vorlnr = hoeren.vorlnr) ORDER BY ALL;
                `);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ matrnr: arrow.Int; titel: arrow.Utf8 }>(batches);
            expect(table.numCols).toBe(2);
            const flat = [];
            for (const row of table) {
                flat.push({
                    matrnr: row?.matrnr,
                    titel: row?.titel?.toString(),
                });
            }
            expect(flat).toEqual([
                { matrnr: 25403, titel: 'Glaube und Wissen' },
                { matrnr: 26120, titel: 'Grundzüge' },
                { matrnr: 27550, titel: 'Grundzüge' },
                { matrnr: 27550, titel: 'Logik' },
                { matrnr: 28106, titel: 'Bioethik' },
                { matrnr: 28106, titel: 'Der Wiener Kreis' },
                { matrnr: 28106, titel: 'Ethik' },
                { matrnr: 28106, titel: 'Wissenschaftstheorie' },
                { matrnr: 29120, titel: 'Ethik' },
                { matrnr: 29120, titel: 'Grundzüge' },
                { matrnr: 29120, titel: 'Mäeutik' },
                { matrnr: 29555, titel: 'Glaube und Wissen' },
            ]);
        });
    });

    describe('Writing', () => {
        it('Copy To CSV Buffer', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students.csv');
            await conn.query(`CREATE TABLE students AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.query(`COPY students TO 'students.csv' WITH (HEADER 1, DELIMITER ';', FORMAT CSV);`);
            await conn.query(`DROP TABLE IF EXISTS students`);
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

        it('Copy To Parquet', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students2.parquet');
            await conn.query(`CREATE TABLE students2 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.query(`COPY students2 TO 'students2.parquet' (FORMAT PARQUET);`);
            const url = await db().copyFileToBuffer('students2.parquet');
            expect(url).not.toBeNull();
        });

        it('Copy To Parquet And Load Again', async () => {
            const students = await resolveData('/uni/studenten.parquet');
            expect(students).not.toBeNull();
            await db().registerFileBuffer('studenten.parquet', students!);
            await db().registerEmptyFileBuffer('students3.parquet');
            await conn.query(`CREATE TABLE students3 AS SELECT * FROM parquet_scan('studenten.parquet');`);
            await conn.query(`COPY students3 TO 'students3.parquet' (FORMAT PARQUET);`);
            const url = await db().copyFileToBuffer('students3.parquet');
            expect(url).not.toBeNull();
            await conn.query(`CREATE TABLE students4 AS SELECT * FROM parquet_scan('students3.parquet');`);
            const result = await conn.send(`SELECT matrnr FROM students4;`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ matrnr: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });
    });

    describe('File access', () => {
        it('Small Parquet file', async () => {
            await db().registerFileURL('studenten.parquet', `${baseDir}/uni/studenten.parquet`, baseDirProto, true);
            const result = await conn.send(`SELECT matrnr FROM parquet_scan('studenten.parquet');`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ matrnr: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.toArray()).toEqual(
                new Int32Array([24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            );
        });

        it('Large Parquet file', async () => {
            await db().registerFileURL(
                'lineitem.parquet',
                `${baseDir}/tpch/0_01/parquet/lineitem.parquet`,
                baseDirProto,
                true,
            );
            const result = await conn.send(`SELECT count(*)::INTEGER as cnt FROM parquet_scan('lineitem.parquet');`);
            const batches = [];
            for await (const batch of result) {
                batches.push(batch);
            }
            const table = await new arrow.Table<{ cnt: arrow.Int }>(batches);
            expect(table.getChildAt(0)?.get(0)).toBeGreaterThan(60_000);
        });
    });

    describe('Export', () => {
        it('Generate Series as CSV', async () => {
            await conn.query('CREATE TABLE foo AS SELECT * FROM generate_series(1, 5) t(v)');
            await conn.query(`EXPORT DATABASE '/tmp/duckdbexportcsv'`);

            const results = await db().globFiles('/tmp/duckdbexportcsv/*');
            expect(results).not.toEqual([]);
            // expect(results.length).toEqual(3); Can be 4 if the tmp file is still around waiting for destructor
            const filenames = results.map(file => file.fileName).sort();
            expect(filenames.includes('/tmp/duckdbexportcsv/foo.csv')).toEqual(true);
            expect(filenames.includes('/tmp/duckdbexportcsv/load.sql')).toEqual(true);
            expect(filenames.includes('/tmp/duckdbexportcsv/schema.sql')).toEqual(true);

            const csv_buffer_utf8 = await db().copyFileToBuffer('/tmp/duckdbexportcsv/foo.csv');
            const load_script_utf8 = await db().copyFileToBuffer('/tmp/duckdbexportcsv/load.sql');
            const schema_script_utf8 = await db().copyFileToBuffer('/tmp/duckdbexportcsv/schema.sql');
            expect(load_script_utf8.length).not.toEqual(0);
            expect(schema_script_utf8.length).not.toEqual(0);
            expect(csv_buffer_utf8.length).not.toEqual(0);

            //const load_script = decoder.decode(load_script_utf8);
            //const schema_script = decoder.decode(schema_script_utf8);
            //const csv_buffer = decoder.decode(csv_buffer_utf8);
            //expect(load_script.trim()).toEqual(
            //    `COPY foo FROM '/tmp/duckdbexportcsv/foo.csv' (FORMAT 'csv', quote '"', delimiter ',', header 0);`,
            //);
            //expect(schema_script.trim()).toEqual(`CREATE TABLE foo(v BIGINT);`);
            //expect(csv_buffer.trim()).toEqual(`1\n2\n3\n4\n5`);
        });

        it('Generate Series as Parquet', async () => {
            await conn.query('CREATE TABLE foo AS SELECT * FROM generate_series(1, 5) t(v)');
            await conn.query(`EXPORT DATABASE '/tmp/duckdbexportparquet' (FORMAT PARQUET)`);

            const results = await db().globFiles('/tmp/duckdbexportparquet/*');
            expect(results).not.toEqual([]);
            // expect(results.length).toEqual(3); Can be 4 if the tmp file is still around waiting for destructor
            const filenames = results.map(file => file.fileName).sort();
            expect(filenames.includes('/tmp/duckdbexportparquet/foo.parquet')).toEqual(true);
            expect(filenames.includes('/tmp/duckdbexportparquet/load.sql')).toEqual(true);
            expect(filenames.includes('/tmp/duckdbexportparquet/schema.sql')).toEqual(true);

            const parquet_buffer = await db().copyFileToBuffer('/tmp/duckdbexportparquet/foo.parquet');
            const load_script_utf8 = await db().copyFileToBuffer('/tmp/duckdbexportparquet/load.sql');
            const schema_script_utf8 = await db().copyFileToBuffer('/tmp/duckdbexportparquet/schema.sql');
            expect(load_script_utf8.length).not.toEqual(0);
            expect(schema_script_utf8.length).not.toEqual(0);
            expect(parquet_buffer.length).not.toEqual(0);

            const content = await conn.query(
                `SELECT v::integer FROM parquet_scan('/tmp/duckdbexportparquet/foo.parquet')`,
            );
            expect(content.nullCount).toEqual(0);
            expect(content.numRows).toEqual(5);
            expect(content.getChildAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 3, 4, 5]));
        });
    });

    describe('Copy', () => {
        it('Generate Series as Parquet', async () => {
            await conn.query(
                `COPY (SELECT * FROM generate_series(1, 5) t(v)) TO '/tmp/duckdbcopytest.parquet' (FORMAT 'parquet')`,
            );
            const results = await db().globFiles('/tmp/duckdbcopytest*');
            expect(results).not.toEqual([]);
            expect(results.length).toEqual(1);
            const filenames = results.map(file => file.fileName).sort();
            expect(filenames).toEqual(['/tmp/duckdbcopytest.parquet']);
            const parquet_buffer = await db().copyFileToBuffer('/tmp/duckdbcopytest.parquet');
            expect(parquet_buffer.length).not.toEqual(0);
            const content = await conn.query(`SELECT v::integer FROM parquet_scan('/tmp/duckdbcopytest.parquet')`);
            expect(content.numRows).toEqual(5);
            expect(content.getChildAt(0)?.toArray()).toEqual(new Int32Array([1, 2, 3, 4, 5]));
        });
    });
}
