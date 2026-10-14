import * as duckdb from '../src/';

declare const __karma__: { config: { args: string[] } };

for (const variant of ['base', 'threads']) {
    describe(`loadable HTTPFS (${variant})`, () => {
        it('preserves remote reads, secrets and S3 after loading', async () => {
            const worker = new Worker(`/static/duckdb-browser-${variant}.worker.js`);
            const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
            let stage = 'instantiate';
            let timer: ReturnType<typeof setTimeout>;
            const deadline = new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    worker.terminate();
                    reject(new Error(`HTTPFS ${variant} timed out during ${stage}`));
                }, 90000);
            });
            const run = async () => {
                await db.instantiate(
                    `/static/duckdb-${variant}.wasm`,
                    variant === 'threads' ? '/static/duckdb-browser-threads.pthread.worker.js' : undefined,
                );
                await db.open({
                    allowUnsignedExtensions: true,
                    extensionRepository: new URL('/extensions', location.href).href,
                });
                const conn = await db.connect();
                const query = async (sql: string) => {
                    stage = sql;
                    return conn.query(sql);
                };
                const scalar = async (sql: string) => Number((await query(sql)).getChildAt(0)!.get(0));
                const origin = location.origin;
                const csv = `${origin}/httpfs-fixture/data.csv.gz`;
                const parquet = `${origin}/data/uni/studenten.parquet`;
                await query('SET enable_external_file_cache=false');
                expect(await scalar('SELECT 42')).toEqual(42);
                expect(await scalar(`SELECT count(*) FROM '${csv}'`)).toEqual(3);
                expect(await scalar(`SELECT count(*) FROM '${parquet}'`)).toEqual(8);
                expect(
                    await scalar("SELECT count(*) FROM duckdb_extensions() WHERE extension_name='httpfs' AND loaded"),
                ).toEqual(0);

                const httpsURL = __karma__.config.args[0];
                if (httpsURL) {
                    await query(`CREATE TABLE before_httpfs AS FROM '${httpsURL}'`);
                }
                await query('INSTALL AND LOAD httpfs');
                if (httpsURL) {
                    await query(`CREATE TABLE after_httpfs AS FROM '${httpsURL}'`);
                    const before = await scalar('SELECT count(*) FROM before_httpfs');
                    expect(await scalar('SELECT count(*) FROM after_httpfs')).toEqual(before);
                }
                expect(await scalar('SELECT 42')).toEqual(42);
                for (let repeat = 0; repeat < 2; repeat++) {
                    await query('LOAD httpfs');
                    expect(await scalar(`SELECT count(*) FROM '${csv}'`)).toEqual(3);
                    expect(await scalar(`SELECT count(*) FROM '${parquet}'`)).toEqual(8);
                }
                await query("SET httpfs_client_implementation='wasm'");
                await query("SET httpfs_client_implementation='default'");
                await expectAsync(query("SET httpfs_client_implementation='curl'")).toBeRejectedWithError(
                    /only.*wasm.*default/,
                );

                await query("SET extra_http_headers=MAP {'X-HTTPFS-Setting': 'setting'}");
                await query(`CREATE SECRET browser_header (
                    TYPE HTTP,
                    SCOPE '${origin}/httpfs-fixture/protected.csv',
                    EXTRA_HTTP_HEADERS MAP {'X-HTTPFS-Test': 'secret'}
                )`);
                expect(await scalar(`SELECT count(*) FROM '${origin}/httpfs-fixture/protected.csv'`)).toEqual(3);

                await query(`CREATE SECRET browser_s3 (
                    TYPE S3, KEY_ID 'browser-test', SECRET 'browser-secret', REGION 'us-east-1',
                    ENDPOINT '${location.host}', URL_STYLE 'path', USE_SSL false
                )`);
                expect(await scalar("SELECT count(*) FROM 's3://test-bucket/data.csv'")).toEqual(3);
                expect(await scalar('SELECT 42')).toEqual(42);
                await conn.close();
            };
            try {
                await Promise.race([run(), deadline]);
            } finally {
                clearTimeout(timer!);
                await db.terminate();
            }
        }, 100000);
    });
}
