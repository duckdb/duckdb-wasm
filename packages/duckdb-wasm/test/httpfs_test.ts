import * as duckdb from '../src/';
import {S3Params, createS3Headers, uriEncode} from '../src/utils'
import {AsyncDuckDBConnection, DuckDBBindings, DuckDBBindingsBase, DuckDBModule} from "../src/";
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

enum AWSConfigType {
    EMPTY,
    VALID,
    INVALID
}

const setAwsConfig = async function (conn : AsyncDuckDBConnection, type : AWSConfigType = AWSConfigType.VALID) {
    switch(type) {
        case AWSConfigType.EMPTY:
            await conn.query("SET s3_region='';");
            await conn.query("SET s3_access_key_id='';");
            await conn.query("SET s3_secret_access_key='';");
            await conn.query("SET s3_session_token='';");
            break;
        case AWSConfigType.VALID:
            await conn.query("SET s3_region='nope';");
            await conn.query("SET s3_access_key_id='nope';");
            await conn.query("SET s3_secret_access_key='nope';");
            await conn.query("SET s3_session_token='';");
            break;
        case AWSConfigType.INVALID:
            await conn.query("SET s3_region='a-very-remote-and-non-existent-s3-region';");
            await conn.query("SET s3_access_key_id='THISACCESSKEYIDISNOTVALID';");
            await conn.query("SET s3_secret_access_key='THISSECRETACCESSKEYISNOTVALID';");
            await conn.query("SET s3_session_token='INVALIDSESSIONTOKEN';");
            break;
    }
}

export function testHTTPFS(adb: () => duckdb.AsyncDuckDB, sdb: () => duckdb.DuckDBBindings, resolveData: (url: string) => Promise<Uint8Array | null>,  baseDir: string): void {
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
        it('s3 helper passes validation', () => {
            expect(() => verifyS3Helper()).not.toThrow();
        });

        it('can fetch regular https file', async () => {
            conn_async = await adb().connect();
            const results = await conn_async.query("select * from \"https://raw.githubusercontent.com/duckdb/duckdb-wasm/master/data/test.csv\";");
            expect(results.getColumnAt(2)?.get(2)).toEqual(9);
        });

        it('can query s3 urls without authentication', async () => {
            conn_async = await adb().connect();
            setAwsConfig(conn_async, AWSConfigType.EMPTY);

            // Test s3 code by settings the config such that it translates to a raw.githubusercontent url
            await conn_async.query("SET s3_endpoint='githubusercontent.com';");

            // Url should translate to https://raw.githubusercontent.com/duckdb/duckdb-wasm/master/data/test.csv
            // Note that this will use the fallback full http request instead of the range request due to github not
            // supporting range header on CORS
            const result = await conn_async.query("select * from \"s3://raw/duckdb/duckdb-wasm/master/data/test.csv\";");
            expect(result.getColumnAt(2)?.get(2)).toEqual(9);
        });

        it('s3 config is set correctly', () => {
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
            expect(globalFileInfo?.s3Config?.accessKeyId).toEqual("");
            expect(globalFileInfo?.s3Config?.secretAccessKey).toEqual("");
            expect(globalFileInfo?.s3Config?.sessionToken).toEqual("");
            expect(globalFileInfo?.s3Config?.endpoint).toEqual("");

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

        it('resetting the database clears the config state', async () => {
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
        //     await setAwsConfig(conn_async, AWSConfigType.VALID);
        //
        //     const results_with_auth = await conn_async.query("select * from \"s3://test-bucket-ceiveran/test.csv\";");
        //     expect(results_with_auth.getColumnAt(2)?.get(2)).toEqual(9);
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
        //     await setAwsConfig(conn_async, AWSConfigType.INVALID);
        //
        //     // query touching the whole table should now fail
        //     await expectAsync(conn_async!.query("select avg(l_partkey) from \"s3://test-bucket-ceiveran/0_lineitem.parquet\";"))
        //         .toBeRejected();
        // });
        // it('can write small csv file to s3', async () => {
        //     conn_async = await adb().connect();
        //     await setAwsConfig(conn_async);
        //
        //     // write the file for the first time
        //     await conn_async.query("COPY (SELECT * FROM range(1000,1010) tbl(i)) TO 's3://test-bucket-ceiveran/test_written.csv' (FORMAT 'csv');");
        //
        //     // confirm file matches
        //     const result = await conn_async.query("SELECT * FROM \"s3://test-bucket-ceiveran/test_written.csv\";");
        //     expect(result.getColumnAt(0)?.get(6)).toEqual(1006);
        //
        //     await adb().flushFiles();
        //     await adb().dropFiles();
        //
        //     // write the file for the second time
        //     await conn_async.query("COPY (SELECT * FROM range(2000,2010) tbl(i)) TO 's3://test-bucket-ceiveran/test_written.csv' (FORMAT 'csv');");
        //
        //     // file should be rewritten to new value now
        //     const result2 = await conn_async.query("SELECT * FROM \"s3://test-bucket-ceiveran/test_written.csv\";");
        //     expect(result2.getColumnAt(0)?.get(6)).toEqual(2006);
        // });
        // it('write after read throws incorrect flag error without dropping files', async () => {
        //     conn_async = await adb().connect();
        //     await setAwsConfig(conn_async);
        //
        //     // write the file for the first time
        //     await conn_async.query("COPY (SELECT * FROM range(1000,1010) tbl(i)) TO 's3://test-bucket-ceiveran/test_written.csv' (FORMAT 'csv');");
        //
        //     // confirm file matches
        //     const result = await conn_async.query("SELECT * FROM \"s3://test-bucket-ceiveran/test_written.csv\";");
        //     expect(result.getColumnAt(0)?.get(6)).toEqual(1006);
        //
        //     // write the file for the second time should fail: the read flag will not be set on this file
        //     await expectAsync(conn_async!.query("COPY (SELECT * FROM range(2000,2010) tbl(i)) TO 's3://test-bucket-ceiveran/test_written.csv' (FORMAT 'csv');"))
        //         .toBeRejectedWithError("File is not opened in write mode");
        // });
        // it('can write small parquet file to S3', async () => {
        //     conn_async = await adb().connect();
        //     const students = await resolveData('/uni/studenten.parquet');
        //     expect(students).not.toBeNull();
        //     await adb().registerFileBuffer('studenten.parquet', students!);
        //
        //     // Create table from local parquet file
        //     await conn_async.send(`CREATE TABLE studenten AS (SELECT * FROM parquet_scan('studenten.parquet'));`);
        //
        //     // Export to S3
        //     await setAwsConfig(conn_async);
        //     await conn_async.query("COPY studenten TO 's3://test-bucket-ceiveran/studenten.parquet' (FORMAT 'parquet');");
        //
        //     const result_s3 = await conn_async.query("SELECT * FROM \"s3://test-bucket-ceiveran/studenten.parquet\";");
        //     const result_local = await conn_async.query("SELECT * FROM studenten;");
        //     expect(result_s3.getColumnAt(0)?.toArray()).toEqual(result_local.getColumnAt(0)?.toArray());
        // });
        //
        // it('can write medium sized(34MB) parquet file to S3', async () => {
        //     conn_async = await adb().connect();
        //     const lineitem = await resolveData('/tpch/0_1/parquet/lineitem.parquet');
        //     expect(lineitem).not.toBeNull();
        //     await adb().registerFileBuffer('lineitem.parquet', lineitem!);
        //
        //     // Create table from local parquet file
        //     await conn_async.send(`CREATE TABLE lineitem AS (SELECT * FROM parquet_scan('lineitem.parquet'));`);
        //
        //     // Export to S3
        //     await setAwsConfig(conn_async);
        //     await conn_async.query("COPY lineitem TO 's3://test-bucket-ceiveran/lineitem.parquet' (FORMAT 'parquet');");
        //
        //     // Compare results
        //     const result_s3 = await conn_async.query("SELECT avg(l_extendedprice) FROM \"s3://test-bucket-ceiveran/lineitem.parquet\";");
        //     const result_local = await conn_async.query("SELECT avg(l_extendedprice) FROM lineitem;");
        //     expect(result_s3.getColumnAt(0)?.get(0)).toEqual(result_local.getColumnAt(0)?.get(0));
        // });
    });
}