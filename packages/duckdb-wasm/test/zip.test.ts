import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

export function testZip(
    db: () => duckdb.DuckDBBindings,
    resolveData: (url: string) => Promise<Uint8Array | null>,
): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(async () => {
        conn = await db().connect();
    });

    afterEach(async () => {
        await conn.close();
        await db().flushFiles();
        await db().dropFiles();
    });

    describe('Zipper', () => {
        it('Entry Info', async () => {
            const all = await resolveData('/uni/all.zip');
            expect(all).not.toBeNull();
            await db().registerFileBuffer('/uni/all.zip', all!);

            const zip = new duckdb.ZipBindings(db());
            zip.loadFile('/uni/all.zip');

            const entryCount = zip.readEntryCount();
            expect(entryCount).toBe(7);

            const expectedFilenames = [
                'assistenten.parquet',
                'hoeren.parquet',
                'professoren.parquet',
                'pruefen.parquet',
                'studenten.parquet',
                'vorlesungen.parquet',
                'vorraussetzen.parquet',
            ];
            for (let i = 0; i < entryCount; ++i) {
                const entry = zip.readEntryInfo(i);
                expect(entry.fileName).toEqual(expectedFilenames[i]);
            }
        });

        it('Loading', async () => {
            const all = await resolveData('/uni/all.zip')!;
            const assistenten = await resolveData('/uni/assistenten.parquet')!;
            expect(all).not.toBeNull();
            await db().registerFileBuffer('/uni/all.zip', all!);
            await db().registerFileBuffer('/out/assistenten.parquet', new Uint8Array());

            const zip = new duckdb.ZipBindings(db());
            zip.loadFile('/uni/all.zip');

            const entryCount = zip.readEntryCount();
            expect(entryCount).toBe(7);
            const entry = zip.readEntryInfo(0);
            expect(entry.fileName).toEqual('assistenten.parquet');

            const written = zip.extractEntryToPath(0, '/out/assistenten.parquet');
            expect(written).toEqual(assistenten!.length);

            const assistentenWritten = db().copyFileToBuffer('/out/assistenten.parquet');
            expect(assistenten).toEqual(assistentenWritten);
        });

        it('Scan Loaded', async () => {
            const all = await resolveData('/uni/all.zip')!;
            expect(all).not.toBeNull();
            await db().registerFileBuffer('/uni/all.zip', all!);
            await db().registerFileBuffer('/out/assistenten.parquet', new Uint8Array());

            const zip = new duckdb.ZipBindings(db());
            zip.loadFile('/uni/all.zip');
            zip.extractEntryToPath(0, '/out/assistenten.parquet');

            const table = await conn.runQuery<{
                persnr: arrow.Int;
                name: arrow.Utf8;
                fachgebiet: arrow.Utf8;
                boss: arrow.Int;
            }>("SELECT * FROM parquet_scan('/out/assistenten.parquet')");

            // Test values
            expect(table.numCols).toBe(4);
            const expected = [
                { persnr: 3002, name: 'Platon', fachgebiet: 'Ideenlehre', boss: 2125 },
                { persnr: 3003, name: 'Aristoteles', fachgebiet: 'Syllogistik', boss: 2125 },
                { persnr: 3004, name: 'Wittgenstein', fachgebiet: 'Sprachteorie', boss: 2126 },
                { persnr: 3005, name: 'Rhetikus', fachgebiet: 'Planetenbewegung', boss: 2127 },
                { persnr: 3006, name: 'Newton', fachgebiet: 'Keplersche Gesetze', boss: 2127 },
                { persnr: 3007, name: 'Spinoza', fachgebiet: 'Gott und Natur', boss: 2126 },
            ];
            let rowIdx = 0;
            for (const row of table.toArray()) {
                const i = rowIdx++;
                expect(row.persnr).toEqual(expected[i].persnr);
                expect(row.name).toEqual(expected[i].name);
                expect(row.fachgebiet).toEqual(expected[i].fachgebiet);
                expect(row.boss).toEqual(expected[i].boss);
            }
        });
    });
}

export function testZipAsync(
    db: () => duckdb.AsyncDuckDB,
    resolveData: (url: string) => Promise<Uint8Array | null>,
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

    describe('Async Zipper', () => {
        it('Scan Loaded', async () => {
            const all = await resolveData('/uni/all.zip')!;
            expect(all).not.toBeNull();
            await db().registerFileBuffer('/uni/all.zip', all!);
            await db().registerFileBuffer('/out/assistenten.parquet', new Uint8Array());
            await db().extractZipPath('/uni/all.zip', '/out/assistenten.parquet', 'assistenten.parquet');

            const table = await conn.runQuery<{
                persnr: arrow.Int;
                name: arrow.Utf8;
                fachgebiet: arrow.Utf8;
                boss: arrow.Int;
            }>("SELECT * FROM parquet_scan('/out/assistenten.parquet')");

            // Test values
            expect(table.numCols).toBe(4);
            const expected = [
                { persnr: 3002, name: 'Platon', fachgebiet: 'Ideenlehre', boss: 2125 },
                { persnr: 3003, name: 'Aristoteles', fachgebiet: 'Syllogistik', boss: 2125 },
                { persnr: 3004, name: 'Wittgenstein', fachgebiet: 'Sprachteorie', boss: 2126 },
                { persnr: 3005, name: 'Rhetikus', fachgebiet: 'Planetenbewegung', boss: 2127 },
                { persnr: 3006, name: 'Newton', fachgebiet: 'Keplersche Gesetze', boss: 2127 },
                { persnr: 3007, name: 'Spinoza', fachgebiet: 'Gott und Natur', boss: 2126 },
            ];
            let rowIdx = 0;
            for (const row of table.toArray()) {
                const i = rowIdx++;
                expect(row.persnr).toEqual(expected[i].persnr);
                expect(row.name).toEqual(expected[i].name);
                expect(row.fachgebiet).toEqual(expected[i].fachgebiet);
                expect(row.boss).toEqual(expected[i].boss);
            }
        });
    });
}
