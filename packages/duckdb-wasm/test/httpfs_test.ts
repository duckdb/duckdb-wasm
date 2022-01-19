import * as duckdb from '../src/';
import {S3Params, createS3Headers, uriEncode} from '../src/utils'
import {DuckDBBindings, DuckDBBindingsBase, DuckDBModule} from "../src/";
import BROWSER_RUNTIME from "../src/bindings/runtime_browser";

// this computes the signature from https://czak.pl/2015/09/15/s3-rest-api-with-curl.html
const verifyS3Helper = function () {
    const testParams1 : S3Params = {
        url: "/",
        query: "",
        host: "my-precious-bucket.s3.amazonaws.com",
        region: "us-east-1",
        service: "s3",
        method: "GET",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        sessionToken: "",
        dateNow: "20150915",
        datetimeNow: "20150915T124500Z",
    };

    const test_header = createS3Headers(testParams1);
    if (test_header.get("Authorization") != "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20150915/us-east-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=182072eb53d85c36b2d791a1fa46a12d23454ec1e921b02075c23aee40166d5a") {
        throw new Error("Auth header incorrect");
    }

    const canonical_query_string = "delimiter=%2F&encoding-type=url&list-type=2&prefix="; // aws s3 ls <bucket>

    const testParams2 : S3Params = {
        url: "/",
        query: canonical_query_string,
        host: "my-precious-bucket.s3.eu-west-1.amazonaws.com",
        region: "eu-west-1",
        service: "s3",
        method: "GET",
        accessKeyId: "ASIAYSPIOYDTHTBIITVC",
        secretAccessKey: "vs1BZPxSL2qVARBSg5vCMKJsavCoEPlo/HSHRaVe",
        sessionToken: "IQoJb3JpZ2luX2VjENX//////////wEaCWV1LXdlc3QtMSJHMEUCIQDfjzs9BYHrEXDMU/NR+PHV1uSTr7CSVSQdjKSfiPRLdgIgCCztF0VMbi9+uHHAfBVKhV4t9MlUrQg3VAOIsLxrWyoqlAIIHRAAGgw1ODk0MzQ4OTY2MTQiDOGl2DsYxENcKCbh+irxARe91faI+hwUhT60sMGRFg0GWefKnPclH4uRFzczrDOcJlAAaQRJ7KOsT8BrJlrY1jSgjkO7PkVjPp92vi6lJX77bg99MkUTJActiOKmd84XvAE5bFc/jFbqechtBjXzopAPkKsGuaqAhCenXnFt6cwq+LZikv/NJGVw7TRphLV+Aq9PSL9XwdzIgsW2qXwe1c3rxDNj53yStRZHVggdxJ0OgHx5v040c98gFphzSULHyg0OY6wmCMTYcswpb4kO2IIi6AiD9cY25TlwPKRKPi5CdBsTPnyTeW62u7PvwK0fTSy4ZuJUuGKQnH2cKmCXquEwoOHEiQY6nQH9fzY/EDGHMRxWWhxu0HiqIfsuFqC7GS0p0ToKQE+pzNsvVwMjZc+KILIDDQpdCWRIwu53I5PZy2Cvk+3y4XLvdZKQCsAKqeOc4c94UAS4NmUT7mCDOuRV0cLBVM8F0JYBGrUxyI+YoIvHhQWmnRLuKgTb5PkF7ZWrXBHFWG5/tZDOvBbbaCWTlRCL9b0Vpg5+BM/81xd8jChP4w83",
        dateNow: "20210904",
        datetimeNow: "20210904T121746Z",
    };
    const test_header2 = createS3Headers(testParams2);

    if (test_header2.get("Authorization") !=
        "AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0") {
        console.log(test_header2.get("Authorization"));
        console.log("AWS4-HMAC-SHA256 Credential=ASIAYSPIOYDTHTBIITVC/20210904/eu-west-1/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date;x-amz-security-token, Signature=4d9d6b59d7836b6485f6ad822de97be40287da30347d83042ea7fbed530dc4c0");
        throw new Error("test_header2 incorrect");
    }

    if (uriEncode("/category=Books/") != "/category%3DBooks/") {
        console.log(uriEncode("/category=Books/"));
        throw new Error("test fail1");
    }
    if (uriEncode("/?category=Books&title=Ducks Retreat/") != "/%3Fcategory%3DBooks%26title%3DDucks%20Retreat/") {
        throw new Error("test fail2");
    }

    if (uriEncode("/?category=Books&title=Ducks Retreat/", true) !=
        "%2F%3Fcategory%3DBooks%26title%3DDucks%20Retreat%2F") {
        throw new Error("test fail3");
    }
}

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