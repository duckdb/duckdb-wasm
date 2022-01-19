import * as duckdb from '../src/';
import { verifyS3Helper } from '../src/utils'
import {DuckDBBindings, DuckDBBindingsBase, DuckDBModule} from "../src/";
import BROWSER_RUNTIME from "../src/bindings/runtime_browser";

export function testHTTPFS(adb: () => duckdb.AsyncDuckDB, sdb: () => duckdb.DuckDBBindings): void {
    let conn_async: duckdb.AsyncDuckDBConnection | null;
    let conn_sync: duckdb.DuckDBConnection | null;

    beforeEach(async () => {
    });
    afterEach(async () => {
        if (conn_async) {
            await conn_async.close();
            conn_async = null;
        }
        if (conn_sync) {
            conn_sync.close();
            conn_sync = null;
        }

    });
    describe('HTTPFS', () => {
        it('s3 helper passes self-validation', () => {
            expect(() => verifyS3Helper()).not.toThrow();
        });

        it('can fetch regular https file', async () => {
            conn_async = await adb().connect();
            const results = await conn_async.query("select * from \"https://raw.githubusercontent.com/duckdb/duckdb-wasm/master/data/test.csv\";");
            expect(results.getColumnAt(2)?.get(2)).toEqual(9);
        });

        it('can query s3 urls without authentication', async () => {
            await adb().reset();
            conn_async = await adb().connect();

            // Test s3 code by settings the config such that it translates to a raw.githubusercontent url
            await conn_async.query("SET s3_endpoint='githubusercontent.com';");

            // Url should translate to https://raw.githubusercontent.com/duckdb/duckdb-wasm/master/data/test.csv
            // Note that this will use the fallback full http request instead of the range request due to github not
            // supporting range header on CORS
            const result = await conn_async.query("select * from \"s3://raw/duckdb/duckdb-wasm/master/data/test.csv\";");
            expect(result.getColumnAt(2)?.get(2)).toEqual(9);
        });

        it('s3 config is correctly updated after SET commands', () => {
            // Set up a Runtime for testing and get the module of the current bindings
            sdb().reset();
            conn_sync = sdb().connect();
            let module : DuckDBModule | null = null;
            conn_sync!.useUnsafe((bindings: DuckDBBindings, con_number: number) => {
                module = (bindings as DuckDBBindingsBase).mod;
            });
            expect(module).toBeDefined();

            const globalFileInfo = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            const cacheEpoch = globalFileInfo!.cacheEpoch;
            expect(globalFileInfo?.s3Config).toBeDefined();
            expect(globalFileInfo?.s3Config?.region).toEqual("");

            conn_sync.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
            conn_sync.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
            conn_sync.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
            conn_sync.query("SET s3_session_token='ANICESESSIONTOKEN';");
            conn_sync.query("SET s3_endpoint='localhost:1337';");


            const globalFileInfoUpdated = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoUpdated?.s3Config).toBeDefined();
            expect(globalFileInfoUpdated?.s3Config?.region).toEqual("a-very-remote-and-non-existent-s3-region");
            expect(globalFileInfoUpdated?.s3Config?.accessKeyId).toEqual("THISACCESSKEYIDISNOTVALID");
            expect(globalFileInfoUpdated?.s3Config?.secretAccessKey).toEqual("THISSECRETACCESSKEYISNOTVALID");
            expect(globalFileInfoUpdated?.s3Config?.sessionToken).toEqual("ANICESESSIONTOKEN");
            expect(globalFileInfoUpdated?.s3Config?.endpoint).toEqual("localhost:1337");
            expect(globalFileInfoUpdated?.cacheEpoch).toEqual(cacheEpoch+5);
        });

        it('resetting the database clears any state on opened files', async () => {
            // Set up a Runtime for testing and get the module of the current bindings
            sdb().reset();
            conn_sync = sdb().connect();
            let module : DuckDBModule | null = null;
            conn_sync.useUnsafe((bindings: DuckDBBindings, con_number: number) => {
                module = (bindings as DuckDBBindingsBase).mod;
            });
            expect(module).toBeDefined();

            conn_sync.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");

            const globalFileInfo = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfo?.s3Config).toBeDefined();
            expect(globalFileInfo?.s3Config?.region).toEqual("a-very-remote-and-non-existent-s3-region");

            conn_sync.close();
            sdb().reset();

            conn_sync = sdb().connect();

            // region should be reset as well
            const globalFileInfoUpdated = BROWSER_RUNTIME.getGlobalFileInfo(module!);
            expect(globalFileInfoUpdated?.s3Config).toBeDefined();
            expect(globalFileInfoUpdated?.s3Config?.region).toEqual("");
        });

        // TODO: find a way to run these tests in CI
        // it('can fetch s3 file with correct auth credentials', async () => {
        //     conn_async = await adb().connect();
        //
        //     await conn_async.query("SET s3_region='nope';");
        //     await conn_async.query("SET s3_access_key_id='nope';");
        //     await conn_async.query("SET s3_secret_access_key='nope';");
        //
        //     const results_with_auth = await conn_async.query("select * from \"s3://test-bucket-ceiveran/test.csv\";");
        //     expect(results_with_auth.getColumnAt(2)?.get(2)).toEqual(9);
        // });
        //
        // it('fails to fetch s3 file with incorrect credentials', async () => {
        //     conn_async = await adb().connect();
        //
        //     await conn_async.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
        //     await conn_async.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
        //     await conn_async.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
        //
        //     await expectAsync(conn_async!.query("select * from \"s3://test-bucket-ceiveran/test.csv\";"))
        //         .toBeRejected();
        //
        //     expect(1).toEqual(1);
        // });
        //
        // // 0_lineitem.parquet should be sufficiently big to ensure the 2nd query will request an uncached part of 0_lineitem.parquet
        // it('properly invalidates caches on settings update.', async () => {
        //     await adb().reset();
        //     conn_async = await adb().connect();
        //
        //     // Query first part of file, this should only partially read the file, right?
        //     const results_with_auth = await conn_async.query("select l_partkey from \"s3://test-bucket-ceiveran/0_lineitem.parquet\" limit 1;");
        //     expect(results_with_auth.getColumnAt(0)?.get(0)).toEqual(15519);
        //
        //     // Set config to an invalid config
        //     await conn_async.query("SET s3_region='non-existent';");
        //     await conn_async.query("SET s3_access_key_id='non-existent';");
        //     await conn_async.query("SET s3_secret_access_key='non-existent';");
        //
        //     // query touching the whole table should now fail
        //     await expectAsync(conn_async!.query("select avg(l_partkey) from \"s3://test-bucket-ceiveran/0_lineitem.parquet\";"))
        //         .toBeRejected();
        // });
    });
}