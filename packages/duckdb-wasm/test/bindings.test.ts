import * as arrow from 'apache-arrow';
import * as duckdb from '../src/';
import { DuckDBAccessMode, DuckDBDataProtocol } from '../src/';

export function testBindings(db: () => duckdb.DuckDBBindings, baseURL: string): void {
    let conn: duckdb.DuckDBConnection;

    beforeEach(() => {
        conn = db().connect();
    });

    afterEach(() => {
        conn.close();
        db().flushFiles();
        db().dropFiles();
    });

    describe('DuckDBBindings', () => {
        describe('error handling', () => {
            it('INVALID SQL', async () => {
                let error: Error | null = null;
                try {
                    await conn.send('INVALID');
                } catch (e: any) {
                    error = e;
                }
                expect(error).not.toBe(null);
            });
        });

        describe('Check version', () => {
            it('Version check', async () => {
                await db().reset();
                conn = db().connect();
                const version = conn.query<{ name: arrow.Utf8 }>(
                    "select * from (select version()) where version() != 'v0.0.1-dev0';",
                );
                const rows = version.toArray();
                expect(rows.length).toEqual(1);
                await db().reset();
            });
        });

        describe('Check platform', () => {
            it('Platform check', async () => {
                await db().reset();
                conn = db().connect();
                const version = conn.query<{ name: arrow.Utf8 }>(
                    "PRAGMA platform;",
                );
                const rows = version.getChildAt(0)?.toArray();
                expect(rows.length).toEqual(1);
                expect(rows[0].toString().substr(0,5)).toEqual("wasm_");
                await db().reset();
            });
        });

        //describe('Open', () => {
        // XXX apparently synchronous XHR on the main thread does not allow for arraybuffer response type?
        // it('Remote TPCH 0_01', async () => {
        //     await db().registerFileURL('tpch_0_01.db', `${baseURL}/tpch/0_01/duckdb/db`);
        //     db().open('tpch_0_01.db');
        // });
        //});

        describe('Reset', () => {
            it('table must disappear', async () => {
                await db().reset();
                conn = db().connect();
                conn.query('CREATE TABLE foo (a int)');
                let table = conn.query<{ name: arrow.Utf8 }>('PRAGMA show_tables;');
                let rows = table.toArray();
                expect(rows.length).toEqual(1);
                expect(rows[0]?.name).toEqual('foo');
                await db().reset();
                conn = db().connect();
                table = conn.query<{ name: arrow.Utf8 }>('PRAGMA show_tables;');
                rows = table.toArray();
                expect(rows.length).toEqual(0);
            });
        });

        describe('Prepared Statement', () => {
            it('Materialized', async () => {
                const stmt = conn.prepare('SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);');
                const result = stmt.query(234);
                expect(result.numRows).toBe(10001);
                stmt.close();
            });

            it('Streaming', async () => {
                const stmt = conn.prepare('SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);');
                const stream = stmt.send(234);
                let size = 0;
                for (const batch of stream) {
                    size += batch.numRows;
                }
                expect(size).toBe(10001);
                conn.close();
            });
            it('Typecheck', async () => {
                conn.query(`CREATE TABLE typecheck (
                    a BOOLEAN DEFAULT NULL,
                    b TINYINT DEFAULT NULL,
                    c SMALLINT DEFAULT NULL,
                    d INTEGER DEFAULT NULL,
                    e BIGINT DEFAULT NULL,
                    f FLOAT DEFAULT NULL,
                    g DOUBLE DEFAULT NULL,
                    h CHAR(11) DEFAULT NULL,
                    i VARCHAR(11) DEFAULT NULL
                )`);

                const stmt = conn.prepare('INSERT INTO typecheck VALUES(?,?,?,?,?,?,?,?,?)');
                expect(() =>
                    stmt.query(true, 100, 10_000, 1_000_000, 5_000_000_000, 0.5, Math.PI, 'hello world', 'hi'),
                ).not.toThrow();
                expect(() =>
                    stmt.query(
                        'test', // varchar for bool
                        100,
                        10_000,
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    ),
                ).toThrow();
                expect(() =>
                    stmt.query(
                        true,
                        10_000, // smallint for tinyint
                        10_000,
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    ),
                ).toThrow();
                expect(() =>
                    stmt.query(
                        true,
                        100,
                        1_000_000, // int for smallint
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    ),
                ).toThrow();
                expect(() =>
                    stmt.query(
                        true,
                        100,
                        10_000,
                        5_000_000_000, // bigint for int
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    ),
                ).toThrow();
                conn.close();
            });
        });
    });
}

export function testAsyncBindings(
    adb: () => duckdb.AsyncDuckDB,
    baseURL: string,
    baseDirProto: DuckDBDataProtocol,
): void {
    beforeEach(async () => {});

    afterEach(async () => {
        await adb().flushFiles();
        await adb().dropFiles();
        await adb().open({
            path: ':memory:',
        });
    });

    describe('Bindings', () => {
        describe('Open', () => {
            it('Remote TPCH 0_01', async () => {
                //await adb().registerFileURL('tpch_0_01.db', `${baseURL}/tpch/0_01/duckdb/db`, baseDirProto, false);
                //await adb().open({
                //    path: 'tpch_0_01.db',
                //});
                // FIXME: Add this back
                //const conn = await adb().connect();
                //const table = await conn.query<{
                //    a: arrow.Int;
                //}>('select count(*)::INTEGER as a from lineitem');
                //const rows = table.toArray();
                //expect(rows.length).toEqual(1);
                //expect(rows[0]?.a).toEqual(60175);
            });
        });

        describe('Patching', () => {
            it('Count(*) Default', async () => {
                await adb().open({
                    path: ':memory:',
                    query: {
                        castBigIntToDouble: false,
                    },
                });
                const conn = await adb().connect();
                const table = await conn.query('select 1::BIGINT');
                expect(table.schema.fields.length).toEqual(1);
                expect(table.schema.fields[0].typeId).toEqual(arrow.Type.Int);
            });

            it('Count(*) No BigInt', async () => {
                await adb().open({
                    path: ':memory:',
                    query: {
                        castBigIntToDouble: true,
                    },
                });
                const conn = await adb().connect();
                const table = await conn.query('select 1::BIGINT');
                expect(table.schema.fields.length).toEqual(1);
                expect(table.schema.fields[0].typeId).toEqual(arrow.Type.Float);
            });
        });

        describe('Prepared Statement', () => {
            it('Materialized', async () => {
                const conn = await adb().connect();
                const stmt = await conn.prepare('SELECT v + ? FROM generate_series(0, 10000) as t(v);');
                const result = await stmt.query(234);
                expect(result.numRows).toBe(10001);
                await stmt.close();
            });

            it('Streaming', async () => {
                const conn = await adb().connect();
                const stmt = await conn.prepare('SELECT v::INTEGER + ? AS v FROM generate_series(0, 10000) as t(v);');
                const stream = await stmt.send(234);
                let size = 0;
                for await (const batch of stream) {
                    size += batch.numRows;
                }
                expect(size).toBe(10001);
                await conn.close();
            });
            it('Typecheck', async () => {
                const conn = await adb().connect();
                await conn.query(`CREATE TABLE typecheck (
                    a BOOLEAN DEFAULT NULL,
                    b TINYINT DEFAULT NULL,
                    c SMALLINT DEFAULT NULL,
                    d INTEGER DEFAULT NULL,
                    e BIGINT DEFAULT NULL,
                    f FLOAT DEFAULT NULL,
                    g DOUBLE DEFAULT NULL,
                    h CHAR(11) DEFAULT NULL,
                    i VARCHAR(11) DEFAULT NULL
                )`);

                const stmt = await conn.prepare('INSERT INTO typecheck VALUES(?,?,?,?,?,?,?,?,?)');

                const expectToThrow = async (fn: () => Promise<void>) => {
                    let throwed = false;
                    try {
                        await fn();
                    } catch (e) {
                        throwed = true;
                    }
                    expect(throwed).toBe(true);
                };
                expectToThrow(async () => {
                    await stmt.query(
                        'test', // varchar for bool
                        100,
                        10_000,
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    );
                });
                expectToThrow(async () => {
                    await stmt.query(
                        true,
                        10_000, // smallint for tinyint
                        10_000,
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    );
                });
                expectToThrow(async () => {
                    await stmt.query(
                        true,
                        100,
                        1_000_000, // int for smallint
                        1_000_000,
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    );
                });
                expectToThrow(async () => {
                    await stmt.query(
                        true,
                        100,
                        10_000,
                        5_000_000_000, // bigint for int
                        5_000_000_000,
                        0.5,
                        Math.PI,
                        'hello world',
                        'hi',
                    );
                });
                await conn.close();
            });
        });

        describe('AccessMode', () => {
            it('READ_ONLY', async () => {
                await expectAsync(
                    adb().open({
                        accessMode: DuckDBAccessMode.READ_ONLY,
                    }),
                ).toBeRejectedWithError(/Cannot launch in-memory database in read-only mode/);
            });
            it('READ_WRITE', async () => {
                await expectAsync(
                    adb().open({
                        accessMode: DuckDBAccessMode.READ_WRITE,
                    }),
                ).toBeResolved();
            });
        });

        describe('Cancellation', () => {
            it('hello cancel', async () => {
                // Set query polling interval to 0 to poll 1 task at a time
                await adb().open({
                    path: ':memory:',
                    query: {
                        queryPollingInterval: 0,
                    },
                });
                const conn = await adb().connect();
                const result = await conn.useUnsafe((db, id) =>
                    db.startPendingQuery(id, 'SELECT SUM(i) FROM range(1000000) tbl(i);'),
                );
                expect(result).toBeNull();
                const cancelOK = await conn.useUnsafe((db, id) => db.cancelPendingQuery(id));
                expect(cancelOK).toBeTrue();
                let polledHeader = null;
                let polledError = null;
                try {
                    polledHeader = await conn.useUnsafe((db, id) => db.pollPendingQuery(id));
                } catch (e: any) {
                    polledError = e;
                }
                expect(polledHeader).toBeNull();
                expect(polledError).not.toBeNull();
                expect(polledError.toString()).toEqual('Error: query was canceled');
                const canceledAgain = await conn.useUnsafe((db, id) => db.cancelPendingQuery(id));
                expect(canceledAgain).toBeFalse();
                // Check the connection is destroyed or not when we cancel query
                const table = await conn.query('select 42::integer;');
                expect(table.schema.fields.length).toEqual(1);
            });

            it('noop cancel', async () => {
                await adb().open({
                    path: ':memory:',
                    query: {
                        queryPollingInterval: 0,
                    },
                });
                const conn = await adb().connect();
                const result = await conn.useUnsafe((db, id) =>
                    db.startPendingQuery(id, 'SELECT SUM(i) FROM range(1000000) tbl(i);'),
                );
                expect(result).toBeNull();
                let polledHeader = null;
                let polledError = null;
                try {
                    // We execute 1 task at a time, so this may take multiple polls
                    while (polledHeader == null) {
                        polledHeader = await conn.useUnsafe((db, id) => db.pollPendingQuery(id));
                    }
                } catch (e: any) {
                    polledError = e;
                }
                expect(polledHeader).not.toBeNull();
                expect(polledError).toBeNull();
                const cancelOK = await conn.useUnsafe((db, id) => db.cancelPendingQuery(id));
                expect(cancelOK).toBeFalse();
                const anotherOne = await conn.useUnsafe((db, id) => db.cancelPendingQuery(id));
                expect(anotherOne).toBeFalse();
            });
        });
    });
}
