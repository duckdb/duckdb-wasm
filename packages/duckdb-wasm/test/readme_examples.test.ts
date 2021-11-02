import * as duckdb from '../src/';
import * as arrow from 'apache-arrow';

export function testReadmeExamplesAsync(adb: () => duckdb.AsyncDuckDB): void {
    describe('Examples', () => {
        it('CSV insert', async () => {
            await adb().registerFileText(`data.csv`, '1|foo\n2|bar\n');
            const conn = await adb().connect();
            await conn.insertCSVFromPath('data.csv', {
                schema: 'main',
                name: 'foo',
                detect: false,
                header: false,
                delimiter: '|',
                columns: {
                    col1: new arrow.Int32(),
                    col2: new arrow.Utf8(),
                },
            });
            await conn.query('DROP TABLE IF EXISTS foo');
            await conn.close();
            await adb().dropFile('data.csv');
        });
        it('JSON row insert', async () => {
            await adb().registerFileText(
                'rows.json',
                `[
                    { "col1": 1, "col2": "foo" },
                    { "col1": 2, "col2": "bar" },
                ]`,
            );
            const conn = await adb().connect();
            await conn.insertJSONFromPath('rows.json', { name: 'rows' });
            await conn.query('DROP TABLE IF EXISTS rows');
            await conn.close();
            await adb().dropFile('rows.json');
        });
        it('JSON column insert', async () => {
            await adb().registerFileText(
                'columns.json',
                `{
                    "col1": [1, 2],
                    "col2": ["foo", "bar"]
                }`,
            );
            const conn = await adb().connect();
            await conn.insertJSONFromPath('columns.json', { name: 'columns' });
            await conn.query('DROP TABLE IF EXISTS columns');
            await conn.close();
            await adb().dropFile('columns.json');
        });
        it('Query result materialized', async () => {
            const conn = await adb().connect();
            await conn.query<{ v: arrow.Int }>(`
                SELECT * FROM generate_series(1, 100) t(v)
            `);
            await conn.close();
        });
        it('Query result streamed', async () => {
            const conn = await adb().connect();
            for await (const batch of await conn.send<{ v: arrow.Int }>(`
                SELECT * FROM generate_series(1, 100) t(v)
            `)) {
                expect(batch.length).toBeGreaterThan(0);
            }
            await conn.close();
        });
        it('Prepared statement materialized', async () => {
            const conn = await adb().connect();
            const stmt = await conn.prepare(`SELECT v + ? FROM generate_series(0, 10000) as t(v);`);
            await stmt.query(234);
            await stmt.close();
            await conn.close();
        });
        it('Prepared statement streamed', async () => {
            const conn = await adb().connect();
            const stmt = await conn.prepare(`SELECT v + ? FROM generate_series(0, 10000) as t(v);`);
            for await (const batch of await stmt.send(234)) {
                expect(batch.length).toBeGreaterThan(0);
            }
            await stmt.close();
            await conn.close();
        });
    });
}
